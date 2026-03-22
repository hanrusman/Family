const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../services/logger');
const { syncCalendar, encryptCredentials, decryptCredentials, pushEvent } = require('../services/caldav');

const router = express.Router();

// GET /api/calendars - List all calendar connections
function getCalendars(req, res) {
  try {
    const db = getDb();
    const { member_id } = req.query;

    let query = `
      SELECT cc.id, cc.member_id, cc.provider, cc.name, cc.sync_token, cc.last_sync, cc.enabled, cc.created_at,
             fm.name as member_name
      FROM calendar_connections cc
      LEFT JOIN family_members fm ON cc.member_id = fm.id
    `;
    const params = [];

    if (member_id) {
      query += ' WHERE cc.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY cc.created_at DESC';

    const connections = db.prepare(query).all(...params);
    res.json(connections);
  } catch (error) {
    logger.error(`Fout bij ophalen kalender connecties: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/calendars - Add new calendar connection
function addCalendar(req, res) {
  try {
    const db = getDb();
    const { provider, name, caldav_url, username, password, member_id } = req.body;

    if (!provider || !name || !member_id) {
      return res.status(400).json({ error: 'Provider, naam en member_id zijn vereist' });
    }

    if (!caldav_url || !username || !password) {
      return res.status(400).json({ error: 'CalDAV URL, gebruikersnaam en wachtwoord zijn vereist' });
    }

    const validProviders = ['google', 'apple', 'proton', 'caldav'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Ongeldige provider. Kies uit: ${validProviders.join(', ')}` });
    }

    // Verify member exists
    const member = db.prepare('SELECT id FROM family_members WHERE id = ?').get(member_id);
    if (!member) {
      return res.status(404).json({ error: 'Gezinslid niet gevonden' });
    }

    // Encrypt credentials
    const credentials = encryptCredentials({
      caldav_url,
      username,
      password,
    });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO calendar_connections (id, member_id, provider, name, credentials, enabled)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, member_id, provider, name, credentials);

    const connection = db.prepare(`
      SELECT cc.id, cc.member_id, cc.provider, cc.name, cc.last_sync, cc.enabled, cc.created_at,
             fm.name as member_name
      FROM calendar_connections cc
      LEFT JOIN family_members fm ON cc.member_id = fm.id
      WHERE cc.id = ?
    `).get(id);

    logger.info(`Kalender connectie aangemaakt: ${id} (${provider} - ${name})`);
    res.status(201).json(connection);
  } catch (error) {
    logger.error(`Fout bij aanmaken kalender connectie: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/calendars/:id - Remove connection
function deleteCalendar(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;

    const connection = db.prepare('SELECT id, name FROM calendar_connections WHERE id = ?').get(id);
    if (!connection) {
      return res.status(404).json({ error: 'Kalender connectie niet gevonden' });
    }

    // Optionally remove synced events from this connection
    db.prepare('DELETE FROM events WHERE calendar_source = ?').run(id);
    db.prepare('DELETE FROM calendar_connections WHERE id = ?').run(id);

    logger.info(`Kalender connectie verwijderd: ${id} (${connection.name})`);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Fout bij verwijderen kalender connectie: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/calendars/:id/sync - Trigger manual sync
async function triggerSync(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;

    const connection = db.prepare('SELECT * FROM calendar_connections WHERE id = ?').get(id);
    if (!connection) {
      return res.status(404).json({ error: 'Kalender connectie niet gevonden' });
    }

    if (!connection.enabled) {
      return res.status(400).json({ error: 'Kalender connectie is uitgeschakeld' });
    }

    const result = await syncCalendar(connection);
    res.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      last_sync: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Fout bij handmatige sync: ${error.message}`);
    res.status(500).json({ error: `Sync mislukt: ${error.message}` });
  }
}

// GET /api/calendars/:id/status - Get sync status
function getSyncStatus(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;

    const connection = db.prepare(`
      SELECT cc.id, cc.name, cc.provider, cc.last_sync, cc.enabled, cc.sync_token,
             fm.name as member_name
      FROM calendar_connections cc
      LEFT JOIN family_members fm ON cc.member_id = fm.id
      WHERE cc.id = ?
    `).get(id);

    if (!connection) {
      return res.status(404).json({ error: 'Kalender connectie niet gevonden' });
    }

    // Count events from this connection
    const eventCount = db.prepare(
      'SELECT COUNT(*) as count FROM events WHERE calendar_source = ?'
    ).get(id);

    res.json({
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      member_name: connection.member_name,
      enabled: connection.enabled,
      last_sync: connection.last_sync,
      has_sync_token: !!connection.sync_token,
      synced_events: eventCount.count,
    });
  } catch (error) {
    logger.error(`Fout bij ophalen sync status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

// Mount routes on router
router.get('/', getCalendars);
router.post('/', addCalendar);
router.delete('/:id', deleteCalendar);
router.post('/:id/sync', triggerSync);
router.get('/:id/status', getSyncStatus);

module.exports = {
  router,
  getCalendars,
  addCalendar,
  deleteCalendar,
  triggerSync,
  getSyncStatus,
};
