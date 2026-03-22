process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../src/index');
const { initDatabase, closeDatabase, getDb } = require('../src/models/database');
const { generateToken } = require('../src/middleware/auth');

let token;
let memberId;
const TEST_DB = path.join(__dirname, 'test-calendars.db');

beforeAll(() => {
  initDatabase(TEST_DB);
  token = generateToken('test-admin', 'adult');

  // Create a family member to associate calendar connections with
  const db = getDb();
  const { v4: uuidv4 } = require('uuid');
  memberId = uuidv4();
  db.prepare(`
    INSERT INTO family_members (id, name, role, color) VALUES (?, ?, ?, ?)
  `).run(memberId, 'Test Ouder', 'adult', '#3B82F6');
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  [TEST_DB + '-wal', TEST_DB + '-shm'].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

function authGet(url) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}
function authPost(url, body) {
  return request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
}
function authDelete(url) {
  return request(app).delete(url).set('Authorization', `Bearer ${token}`);
}

describe('Calendar Connections', () => {
  let connectionId;

  test('POST /api/calendars creates connection', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'caldav',
      name: 'Test Kalender',
      caldav_url: 'https://cal.example.com/dav',
      username: 'testuser',
      password: 'testpass',
      member_id: memberId,
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Kalender');
    expect(res.body.provider).toBe('caldav');
    expect(res.body.member_id).toBe(memberId);
    expect(res.body.member_name).toBe('Test Ouder');
    expect(res.body.enabled).toBe(1);
    // Credentials should NOT be returned
    expect(res.body.credentials).toBeUndefined();
    connectionId = res.body.id;
  });

  test('GET /api/calendars lists connections', async () => {
    const res = await authGet('/api/calendars');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe('Test Kalender');
  });

  test('GET /api/calendars?member_id filters by member', async () => {
    const res = await authGet(`/api/calendars?member_id=${memberId}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((c) => c.member_id === memberId)).toBe(true);
  });

  test('GET /api/calendars?member_id with unknown member returns empty', async () => {
    const res = await authGet('/api/calendars?member_id=nonexistent-id');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('GET /api/calendars/:id/status returns sync status', async () => {
    const res = await authGet(`/api/calendars/${connectionId}/status`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(connectionId);
    expect(res.body.name).toBe('Test Kalender');
    expect(res.body.provider).toBe('caldav');
    expect(res.body.enabled).toBe(1);
    expect(res.body.synced_events).toBeDefined();
    expect(typeof res.body.synced_events).toBe('number');
    expect(res.body.has_sync_token).toBe(false);
  });

  test('GET /api/calendars/:id/status with invalid id returns 404', async () => {
    const res = await authGet('/api/calendars/nonexistent-id/status');

    expect(res.status).toBe(404);
  });

  test('POST /api/calendars with missing provider returns 400', async () => {
    const res = await authPost('/api/calendars', {
      name: 'Bad Calendar',
      caldav_url: 'https://example.com',
      username: 'user',
      password: 'pass',
      member_id: memberId,
    });

    expect(res.status).toBe(400);
  });

  test('POST /api/calendars with missing name returns 400', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'caldav',
      caldav_url: 'https://example.com',
      username: 'user',
      password: 'pass',
      member_id: memberId,
    });

    expect(res.status).toBe(400);
  });

  test('POST /api/calendars with missing member_id returns 400', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'caldav',
      name: 'Test',
      caldav_url: 'https://example.com',
      username: 'user',
      password: 'pass',
    });

    expect(res.status).toBe(400);
  });

  test('POST /api/calendars with missing credentials returns 400', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'caldav',
      name: 'Test',
      member_id: memberId,
    });

    expect(res.status).toBe(400);
  });

  test('POST /api/calendars with invalid provider returns 400', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'outlook',
      name: 'Test',
      caldav_url: 'https://example.com',
      username: 'user',
      password: 'pass',
      member_id: memberId,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ongeldige provider');
  });

  test('POST /api/calendars with valid providers succeeds', async () => {
    for (const provider of ['google', 'apple', 'proton']) {
      const res = await authPost('/api/calendars', {
        provider,
        name: `${provider} kalender`,
        caldav_url: `https://${provider}.example.com/dav`,
        username: 'user',
        password: 'pass',
        member_id: memberId,
      });
      expect(res.status).toBe(201);
      expect(res.body.provider).toBe(provider);
    }
  });

  test('POST /api/calendars with nonexistent member_id returns 404', async () => {
    const res = await authPost('/api/calendars', {
      provider: 'caldav',
      name: 'Test',
      caldav_url: 'https://example.com',
      username: 'user',
      password: 'pass',
      member_id: 'does-not-exist',
    });

    expect(res.status).toBe(404);
  });

  test('DELETE /api/calendars/:id deletes connection', async () => {
    const res = await authDelete(`/api/calendars/${connectionId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's gone
    const statusRes = await authGet(`/api/calendars/${connectionId}/status`);
    expect(statusRes.status).toBe(404);
  });

  test('DELETE /api/calendars/:id with invalid id returns 404', async () => {
    const res = await authDelete('/api/calendars/nonexistent-id');

    expect(res.status).toBe(404);
  });

  test('DELETE /api/calendars/:id removes synced events', async () => {
    // Create a connection
    const createRes = await authPost('/api/calendars', {
      provider: 'caldav',
      name: 'Events Test',
      caldav_url: 'https://example.com/dav',
      username: 'user',
      password: 'pass',
      member_id: memberId,
    });
    const connId = createRes.body.id;

    // Manually insert an event with calendar_source = connId
    const db = getDb();
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO events (id, title, start_time, end_time, calendar_source)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Synced Event', '2026-03-20T10:00:00Z', '2026-03-20T11:00:00Z', connId);

    const before = db.prepare('SELECT COUNT(*) as count FROM events WHERE calendar_source = ?').get(connId);
    expect(before.count).toBe(1);

    // Delete the connection
    await authDelete(`/api/calendars/${connId}`);

    // Events from this source should be removed
    const after = db.prepare('SELECT COUNT(*) as count FROM events WHERE calendar_source = ?').get(connId);
    expect(after.count).toBe(0);
  });
});
