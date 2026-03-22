const { createDAVClient } = require('tsdav');
const crypto = require('crypto');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

// --- Credential encryption helpers ---

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'default-dev-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptCredentials(data) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptCredentials(encryptedString) {
  const [ivHex, encrypted] = encryptedString.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// --- iCal parser (regex-based, no extra dependency) ---

function parseICalEvent(vcalendarString, connectionId) {
  const events = [];
  const veventBlocks = vcalendarString.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);

  if (!veventBlocks) return events;

  for (const block of veventBlocks) {
    const get = (prop) => {
      // Handle properties with parameters like DTSTART;VALUE=DATE:20260101
      const regex = new RegExp(`^${prop}[;:](.*)$`, 'm');
      const match = block.match(regex);
      if (!match) return null;
      // If the match contains a colon (from parameters), take the value after the last colon
      const raw = match[1];
      const colonIdx = raw.indexOf(':');
      return colonIdx >= 0 ? raw.substring(colonIdx + 1).trim() : raw.trim();
    };

    const uid = get('UID');
    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const location = get('LOCATION');
    const description = get('DESCRIPTION');
    const rrule = get('RRULE');

    if (!uid || !summary || !dtstart) continue;

    // Parse iCal date formats: 20260315T100000Z or 20260315
    const parseICalDate = (str) => {
      if (!str) return null;
      // Full datetime: 20260315T100000Z or 20260315T100000
      if (str.length >= 15) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        const hour = str.substring(9, 11);
        const min = str.substring(11, 13);
        const sec = str.substring(13, 15);
        const isUtc = str.endsWith('Z');
        const dateStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${isUtc ? 'Z' : ''}`;
        return new Date(dateStr).toISOString();
      }
      // Date only: 20260315
      if (str.length === 8) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        return `${year}-${month}-${day}T00:00:00.000Z`;
      }
      return new Date(str).toISOString();
    };

    const startTime = parseICalDate(dtstart);
    const endTime = parseICalDate(dtend) || startTime;
    const allDay = dtstart.length === 8 ? 1 : 0;

    // Unfold iCal line continuations in description
    const cleanDescription = description
      ? description.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
      : null;

    events.push({
      uid,
      title: summary.replace(/\\,/g, ',').replace(/\\\\/g, '\\'),
      description: cleanDescription,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay,
      location: location ? location.replace(/\\,/g, ',').replace(/\\\\/g, '\\') : null,
      recurrence_rule: rrule || null,
      calendar_source: connectionId,
    });
  }

  return events;
}

// --- Build iCal VEVENT string from a local event ---

function eventToICalString(event) {
  const formatDate = (isoString, allDay) => {
    const d = new Date(isoString);
    if (allDay) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return y + m + day;
    }
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const dtStartParam = event.all_day ? ';VALUE=DATE' : '';
  const dtEndParam = event.all_day ? ';VALUE=DATE' : '';
  const uid = event.external_id || event.id;

  let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FamilyCalendar//EN\r\nBEGIN:VEVENT\r\n';
  ical += `UID:${uid}\r\n`;
  ical += `SUMMARY:${(event.title || '').replace(/,/g, '\\,')}\r\n`;
  ical += `DTSTART${dtStartParam}:${formatDate(event.start_time, event.all_day)}\r\n`;
  ical += `DTEND${dtEndParam}:${formatDate(event.end_time, event.all_day)}\r\n`;

  if (event.description) {
    ical += `DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}\r\n`;
  }
  if (event.location) {
    ical += `LOCATION:${event.location.replace(/,/g, '\\,')}\r\n`;
  }
  if (event.recurrence_rule) {
    ical += `RRULE:${event.recurrence_rule}\r\n`;
  }

  ical += 'END:VEVENT\r\nEND:VCALENDAR\r\n';
  return ical;
}

// --- CalDAV sync ---

async function createClient(connection) {
  const creds = decryptCredentials(connection.credentials);

  const clientConfig = {
    serverUrl: creds.caldav_url,
    credentials: {
      username: creds.username,
      password: creds.password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  };

  const client = await createDAVClient(clientConfig);
  return client;
}

async function syncCalendar(connection) {
  const db = getDb();
  const startTime = Date.now();

  logger.info(`CalDAV sync gestart voor connectie ${connection.id} (${connection.name})`);

  try {
    const client = await createClient(connection);

    // Fetch calendars from the server
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      logger.warn(`Geen calendars gevonden voor connectie ${connection.id}`);
      updateSyncStatus(connection.id, 'no_calendars');
      return { synced: 0, errors: 0 };
    }

    let totalSynced = 0;
    let totalErrors = 0;

    for (const calendar of calendars) {
      try {
        // Fetch calendar objects (events)
        const fetchOptions = {
          calendar,
          headers: {},
        };

        // Use sync token for incremental sync if available
        if (connection.sync_token) {
          fetchOptions.syncToken = connection.sync_token;
        }

        let calendarObjects;
        try {
          // Try sync-collection report with token
          if (connection.sync_token) {
            calendarObjects = await client.fetchCalendarObjects({
              calendar,
              syncToken: connection.sync_token,
            });
          } else {
            calendarObjects = await client.fetchCalendarObjects({ calendar });
          }
        } catch (syncErr) {
          // If sync token is invalid, fall back to full fetch
          logger.warn(`Sync token ongeldig voor ${connection.id}, volledige sync: ${syncErr.message}`);
          calendarObjects = await client.fetchCalendarObjects({ calendar });
        }

        if (!calendarObjects) continue;

        // Process each calendar object
        const upsert = db.prepare(`
          INSERT INTO events (id, title, description, start_time, end_time, all_day, location, member_id, external_id, calendar_source, recurrence_rule, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            all_day = excluded.all_day,
            location = excluded.location,
            recurrence_rule = excluded.recurrence_rule,
            updated_at = datetime('now')
        `);

        // We need to find events by external_id to update them
        const findByExternalId = db.prepare(
          'SELECT id FROM events WHERE external_id = ? AND calendar_source = ?'
        );

        const upsertTransaction = db.transaction((parsedEvents) => {
          for (const evt of parsedEvents) {
            const existing = findByExternalId.get(evt.uid, connection.id);
            const eventId = existing ? existing.id : uuidv4();

            upsert.run(
              eventId,
              evt.title,
              evt.description,
              evt.start_time,
              evt.end_time,
              evt.all_day,
              evt.location,
              connection.member_id,
              evt.uid,
              connection.id,
              evt.recurrence_rule
            );
          }
        });

        for (const obj of calendarObjects) {
          try {
            if (!obj.data) continue;
            const parsed = parseICalEvent(obj.data, connection.id);
            if (parsed.length > 0) {
              upsertTransaction(parsed);
              totalSynced += parsed.length;
            }
          } catch (parseErr) {
            logger.error(`Fout bij parsen event: ${parseErr.message}`);
            totalErrors++;
          }
        }

        // Store new sync token if available
        if (calendar.syncToken) {
          db.prepare('UPDATE calendar_connections SET sync_token = ? WHERE id = ?')
            .run(calendar.syncToken, connection.id);
        }
      } catch (calErr) {
        logger.error(`Fout bij sync calendar: ${calErr.message}`);
        totalErrors++;
      }
    }

    // Update last sync timestamp
    updateSyncStatus(connection.id, 'success');

    const duration = Date.now() - startTime;
    logger.info(`CalDAV sync voltooid voor ${connection.id}: ${totalSynced} events gesynchroniseerd, ${totalErrors} fouten (${duration}ms)`);

    return { synced: totalSynced, errors: totalErrors };
  } catch (error) {
    logger.error(`CalDAV sync mislukt voor ${connection.id}: ${error.message}`);
    updateSyncStatus(connection.id, 'error', error.message);
    throw error;
  }
}

function updateSyncStatus(connectionId, status, errorMessage) {
  const db = getDb();
  const now = new Date().toISOString();

  if (status === 'error') {
    db.prepare('UPDATE calendar_connections SET last_sync = ? WHERE id = ?')
      .run(now, connectionId);
  } else {
    db.prepare('UPDATE calendar_connections SET last_sync = ? WHERE id = ?')
      .run(now, connectionId);
  }
}

async function pushEvent(connection, event) {
  logger.info(`CalDAV push event ${event.id} naar connectie ${connection.id}`);

  try {
    const client = await createClient(connection);
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      throw new Error('Geen calendars gevonden op de server');
    }

    // Use the first calendar
    const calendar = calendars[0];
    const icalData = eventToICalString(event);
    const uid = event.external_id || event.id;

    await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: icalData,
    });

    // Update the event with external_id and calendar_source if not already set
    if (!event.external_id) {
      const db = getDb();
      db.prepare('UPDATE events SET external_id = ?, calendar_source = ? WHERE id = ?')
        .run(uid, connection.id, event.id);
    }

    logger.info(`Event ${event.id} succesvol gepusht naar CalDAV`);
    return { success: true };
  } catch (error) {
    logger.error(`Fout bij pushen event ${event.id}: ${error.message}`);
    throw error;
  }
}

// Sync all enabled connections
async function syncAllConnections() {
  const db = getDb();
  const connections = db.prepare(
    'SELECT * FROM calendar_connections WHERE enabled = 1'
  ).all();

  if (connections.length === 0) {
    return { total: 0, synced: 0, errors: 0 };
  }

  logger.info(`CalDAV sync voor ${connections.length} connectie(s) gestart`);

  let totalSynced = 0;
  let totalErrors = 0;

  for (const connection of connections) {
    try {
      const result = await syncCalendar(connection);
      totalSynced += result.synced;
      totalErrors += result.errors;
    } catch (error) {
      totalErrors++;
      // Error already logged in syncCalendar
    }
  }

  logger.info(`CalDAV sync voltooid: ${totalSynced} events, ${totalErrors} fouten`);
  return { total: connections.length, synced: totalSynced, errors: totalErrors };
}

module.exports = {
  syncCalendar,
  syncAllConnections,
  pushEvent,
  parseICalEvent,
  encryptCredentials,
  decryptCredentials,
  eventToICalString,
};
