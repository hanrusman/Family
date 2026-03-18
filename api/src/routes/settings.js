const express = require('express');
const { getDb } = require('../models/database');
const router = express.Router();

const ALLOWED_SETTINGS = new Set([
  'theme', 'language', 'idle_timeout', 'default_view',
  'day_start_hour', 'day_end_hour', 'whatsapp_enabled',
  'morning_briefing_time', 'calendar_sync_interval',
]);

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
    `);

    const updateMany = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (!ALLOWED_SETTINGS.has(key)) continue;
        upsert.run(key, String(value), String(value));
      }
    });
    updateMany();

    // Return all settings
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings/pin
router.put('/pin', (req, res) => {
  try {
    const db = getDb();
    const { current_pin, new_pin } = req.body;

    if (!new_pin || new_pin.length < 4) {
      return res.status(400).json({ error: 'PIN moet minimaal 4 tekens zijn' });
    }

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
    if (setting && setting.value !== current_pin) {
      return res.status(401).json({ error: 'Huidige PIN is onjuist' });
    }

    db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('pin', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')"
    ).run(new_pin, new_pin);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
