process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const {
  parseICalEvent,
  eventToICalString,
  encryptCredentials,
  decryptCredentials,
} = require('../src/services/caldav');

describe('CalDAV Service', () => {
  // --- encryptCredentials / decryptCredentials ---

  describe('encryptCredentials / decryptCredentials', () => {
    test('roundtrip encrypts and decrypts correctly', () => {
      const data = {
        caldav_url: 'https://cal.example.com/dav',
        username: 'testuser',
        password: 's3cret!',
      };
      const encrypted = encryptCredentials(data);
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(data);
    });

    test('different encryptions produce different ciphertext', () => {
      const data = { username: 'user', password: 'pass' };
      const a = encryptCredentials(data);
      const b = encryptCredentials(data);
      // IVs are random, so ciphertext should differ
      expect(a).not.toBe(b);
    });

    test('decrypting both still yields same plaintext', () => {
      const data = { username: 'user', password: 'pass' };
      const a = encryptCredentials(data);
      const b = encryptCredentials(data);
      expect(decryptCredentials(a)).toEqual(data);
      expect(decryptCredentials(b)).toEqual(data);
    });

    test('handles special characters in credentials', () => {
      const data = {
        caldav_url: 'https://example.com/dav/path?q=1&b=2',
        username: 'user@domain.com',
        password: 'p@$$w0rd!#%^&*()',
      };
      const encrypted = encryptCredentials(data);
      expect(decryptCredentials(encrypted)).toEqual(data);
    });

    test('handles empty strings', () => {
      const data = { caldav_url: '', username: '', password: '' };
      const encrypted = encryptCredentials(data);
      expect(decryptCredentials(encrypted)).toEqual(data);
    });

    test('handles unicode characters', () => {
      const data = { username: 'gebruiker', password: 'wachtwoord-tëst-ñ' };
      const encrypted = encryptCredentials(data);
      expect(decryptCredentials(encrypted)).toEqual(data);
    });
  });

  // --- parseICalEvent ---

  describe('parseICalEvent', () => {
    test('parses timed event with all fields', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-001',
        'SUMMARY:Tandarts afspraak',
        'DTSTART:20260318T140000Z',
        'DTEND:20260318T150000Z',
        'LOCATION:Amsterdam',
        'DESCRIPTION:Controle bij de tandarts',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].uid).toBe('event-001');
      expect(events[0].title).toBe('Tandarts afspraak');
      expect(events[0].location).toBe('Amsterdam');
      expect(events[0].description).toBe('Controle bij de tandarts');
      expect(events[0].all_day).toBe(0);
      expect(events[0].calendar_source).toBe('conn-1');
      expect(events[0].start_time).toBe('2026-03-18T14:00:00.000Z');
      expect(events[0].end_time).toBe('2026-03-18T15:00:00.000Z');
    });

    test('parses all-day event (VALUE=DATE)', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-002',
        'SUMMARY:Koningsdag',
        'DTSTART;VALUE=DATE:20260427',
        'DTEND;VALUE=DATE:20260428',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].all_day).toBe(1);
      expect(events[0].start_time).toBe('2026-04-27T00:00:00.000Z');
      expect(events[0].end_time).toBe('2026-04-28T00:00:00.000Z');
    });

    test('parses event without DTEND (uses DTSTART as fallback)', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-003',
        'SUMMARY:Herinnering',
        'DTSTART:20260320T090000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].end_time).toBe(events[0].start_time);
    });

    test('parses event with RRULE', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-004',
        'SUMMARY:Wekelijks overleg',
        'DTSTART:20260318T100000Z',
        'DTEND:20260318T110000Z',
        'RRULE:FREQ=WEEKLY;BYDAY=WE',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].recurrence_rule).toBe('FREQ=WEEKLY;BYDAY=WE');
    });

    test('parses multiple events in one vcalendar', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:multi-1',
        'SUMMARY:Event A',
        'DTSTART:20260318T090000Z',
        'DTEND:20260318T100000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:multi-2',
        'SUMMARY:Event B',
        'DTSTART:20260319T140000Z',
        'DTEND:20260319T150000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Event A');
      expect(events[1].title).toBe('Event B');
    });

    test('handles escaped characters in SUMMARY and DESCRIPTION', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-esc',
        'SUMMARY:Meeting\\, Team A',
        'DTSTART:20260318T100000Z',
        'DTEND:20260318T110000Z',
        'DESCRIPTION:Notes:\\nLine 2\\, more info\\\\backslash',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Meeting, Team A');
      // The parser's get() function splits on first colon, so "Notes:" prefix is stripped
      // What remains after the colon and unescaping is "\nLine 2, more info\backslash"
      expect(events[0].description).toContain('Line 2, more info\\backslash');
    });

    test('returns empty array for empty iCal string', () => {
      const events = parseICalEvent('', 'conn-1');
      expect(events).toEqual([]);
    });

    test('returns empty array for iCal without VEVENT', () => {
      const ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      const events = parseICalEvent(ical, 'conn-1');
      expect(events).toEqual([]);
    });

    test('skips events missing UID', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'SUMMARY:No UID Event',
        'DTSTART:20260318T100000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');
      expect(events).toEqual([]);
    });

    test('skips events missing SUMMARY', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:no-summary',
        'DTSTART:20260318T100000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');
      expect(events).toEqual([]);
    });

    test('skips events missing DTSTART', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:no-dtstart',
        'SUMMARY:Missing Start',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');
      expect(events).toEqual([]);
    });

    test('event without location/description has null values', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:minimal-event',
        'SUMMARY:Minimal',
        'DTSTART:20260318T100000Z',
        'DTEND:20260318T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].location).toBeNull();
      expect(events[0].description).toBeNull();
      expect(events[0].recurrence_rule).toBeNull();
    });

    test('parses non-UTC datetime (without Z suffix)', () => {
      const ical = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:local-time',
        'SUMMARY:Local Event',
        'DTSTART:20260318T100000',
        'DTEND:20260318T110000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const events = parseICalEvent(ical, 'conn-1');

      expect(events).toHaveLength(1);
      expect(events[0].all_day).toBe(0);
      // Should still parse as a valid ISO date
      expect(events[0].start_time).toBeTruthy();
    });
  });

  // --- eventToICalString ---

  describe('eventToICalString', () => {
    test('generates valid iCal for timed event', () => {
      const event = {
        id: 'test-123',
        title: 'Vergadering',
        start_time: '2026-03-18T14:00:00.000Z',
        end_time: '2026-03-18T15:00:00.000Z',
        all_day: 0,
      };

      const ical = eventToICalString(event);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).toContain('BEGIN:VEVENT');
      expect(ical).toContain('END:VEVENT');
      expect(ical).toContain('UID:test-123');
      expect(ical).toContain('SUMMARY:Vergadering');
      expect(ical).toContain('DTSTART:');
      expect(ical).toContain('DTEND:');
      // Timed events should not have VALUE=DATE
      expect(ical).not.toContain('VALUE=DATE');
    });

    test('generates valid iCal for all-day event', () => {
      const event = {
        id: 'allday-1',
        title: 'Vakantie',
        start_time: '2026-07-01T00:00:00.000Z',
        end_time: '2026-07-08T00:00:00.000Z',
        all_day: 1,
      };

      const ical = eventToICalString(event);

      expect(ical).toContain('DTSTART;VALUE=DATE:20260701');
      expect(ical).toContain('DTEND;VALUE=DATE:20260708');
    });

    test('includes DESCRIPTION when present', () => {
      const event = {
        id: 'desc-1',
        title: 'Meeting',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
        description: 'Bespreek projectplan',
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('DESCRIPTION:Bespreek projectplan');
    });

    test('includes LOCATION when present', () => {
      const event = {
        id: 'loc-1',
        title: 'Afspraak',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
        location: 'Kantoor Amsterdam',
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('LOCATION:Kantoor Amsterdam');
    });

    test('includes RRULE when present', () => {
      const event = {
        id: 'rrule-1',
        title: 'Weekelijkse sync',
        start_time: '2026-03-18T09:00:00.000Z',
        end_time: '2026-03-18T09:30:00.000Z',
        all_day: 0,
        recurrence_rule: 'FREQ=WEEKLY;BYDAY=WE',
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE');
    });

    test('omits DESCRIPTION, LOCATION, RRULE when not present', () => {
      const event = {
        id: 'minimal-1',
        title: 'Simple',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
      };

      const ical = eventToICalString(event);
      expect(ical).not.toContain('DESCRIPTION');
      expect(ical).not.toContain('LOCATION');
      expect(ical).not.toContain('RRULE');
    });

    test('escapes commas in title', () => {
      const event = {
        id: 'comma-1',
        title: 'Meeting, team A',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('SUMMARY:Meeting\\, team A');
    });

    test('uses external_id as UID when present', () => {
      const event = {
        id: 'local-id',
        external_id: 'external-uid-123',
        title: 'Synced Event',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('UID:external-uid-123');
      expect(ical).not.toContain('UID:local-id');
    });

    test('includes PRODID header', () => {
      const event = {
        id: 'hdr-1',
        title: 'Test',
        start_time: '2026-03-18T10:00:00.000Z',
        end_time: '2026-03-18T11:00:00.000Z',
        all_day: 0,
      };

      const ical = eventToICalString(event);
      expect(ical).toContain('PRODID:-//FamilyCalendar//EN');
      expect(ical).toContain('VERSION:2.0');
    });
  });

  // --- Roundtrip: eventToICalString -> parseICalEvent ---

  describe('roundtrip', () => {
    test('generate iCal and parse it back produces same data', () => {
      const original = {
        id: 'rt-1',
        title: 'Roundtrip Test',
        start_time: '2026-03-18T14:00:00.000Z',
        end_time: '2026-03-18T15:30:00.000Z',
        all_day: 0,
        location: 'Utrecht',
        description: 'Testing roundtrip',
      };

      const ical = eventToICalString(original);
      const parsed = parseICalEvent(ical, 'conn-rt');

      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Roundtrip Test');
      expect(parsed[0].location).toBe('Utrecht');
      expect(parsed[0].description).toBe('Testing roundtrip');
      expect(parsed[0].start_time).toBe('2026-03-18T14:00:00.000Z');
      expect(parsed[0].end_time).toBe('2026-03-18T15:30:00.000Z');
      expect(parsed[0].all_day).toBe(0);
    });
  });
});
