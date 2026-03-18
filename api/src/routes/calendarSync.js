const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../services/logger');
const router = express.Router();

// GET /api/calendar-sync/connections
router.get('/connections', (req, res) => {
  try {
    const db = getDb();
    const connections = db.prepare(`
      SELECT cc.id, cc.member_id, cc.provider, cc.name, cc.last_sync, cc.enabled,
             fm.name as member_name
      FROM calendar_connections cc
      LEFT JOIN family_members fm ON cc.member_id = fm.id
      ORDER BY cc.name
    `).all();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar-sync/connections
router.post('/connections', (req, res) => {
  try {
    const db = getDb();
    const { member_id, provider, name, credentials } = req.body;

    if (!member_id || !provider || !name) {
      return res.status(400).json({ error: 'Gezinslid, provider en naam zijn vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO calendar_connections (id, member_id, provider, name, credentials)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, member_id, provider, name, credentials ? JSON.stringify(credentials) : null);

    const connection = db.prepare('SELECT id, member_id, provider, name, last_sync, enabled FROM calendar_connections WHERE id = ?').get(id);
    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/calendar-sync/connections/:id
router.delete('/connections/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM calendar_connections WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Koppeling niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar-sync/sync/:id - Trigger manual sync
router.post('/sync/:id', (req, res) => {
  try {
    const db = getDb();
    const connection = db.prepare('SELECT * FROM calendar_connections WHERE id = ?').get(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: 'Koppeling niet gevonden' });
    }

    // Update last sync time
    db.prepare(
      "UPDATE calendar_connections SET last_sync = datetime('now') WHERE id = ?"
    ).run(req.params.id);

    logger.info(`Kalender sync getriggerd voor ${connection.name}`);

    res.json({
      success: true,
      message: `Sync gestart voor ${connection.name}`,
      note: 'CalDAV/Google Calendar sync vereist configuratie van API credentials'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
