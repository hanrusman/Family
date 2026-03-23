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

// POST /api/settings/seed-demo — Vul de database met demodata
router.post('/seed-demo', (req, res) => {
  try {
    const db = getDb();
    const { pin } = req.body;

    // Verify PIN
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
    if (!setting || setting.value !== pin) {
      return res.status(401).json({ error: 'PIN is onjuist' });
    }

    const { v4: uuidv4 } = require('uuid');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    db.transaction(() => {
      // --- Gezinsleden ---
      const members = [
        { id: uuidv4(), name: 'Papa', role: 'adult', color: '#2A9D8F', sort_order: 0 },
        { id: uuidv4(), name: 'Mama', role: 'adult', color: '#E76F51', sort_order: 1 },
        { id: uuidv4(), name: 'Leo', role: 'child', color: '#f39e58', sort_order: 2 },
        { id: uuidv4(), name: 'Mia', role: 'child', color: '#A7C957', sort_order: 3 },
      ];

      const insertMember = db.prepare(
        'INSERT OR IGNORE INTO family_members (id, name, role, color, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      for (const m of members) {
        insertMember.run(m.id, m.name, m.role, m.color, m.sort_order);
      }

      // --- Agenda events ---
      const insertEvent = db.prepare(
        'INSERT INTO events (id, title, description, start_time, end_time, all_day, location, member_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertEvent.run(uuidv4(), 'Voetbaltraining', null, `${today}T15:00:00`, `${today}T16:30:00`, 0, 'Sportpark', members[2].id);
      insertEvent.run(uuidv4(), 'Pianoles', null, `${today}T17:00:00`, `${today}T17:45:00`, 0, 'Thuis', members[3].id);
      insertEvent.run(uuidv4(), 'Tandarts', null, `${today}T18:30:00`, `${today}T19:00:00`, 0, 'Centrum', null);
      insertEvent.run(uuidv4(), 'Zwemles', null, `${tomorrow}T14:00:00`, `${tomorrow}T14:45:00`, 0, 'Zwembad', members[2].id);
      insertEvent.run(uuidv4(), 'Boodschappen', null, `${tomorrow}T10:00:00`, `${tomorrow}T11:00:00`, 0, 'Albert Heijn', members[0].id);

      // --- Klusjes templates ---
      const choreTemplates = [
        { title: 'Bed opmaken', icon: '🛏️', role_title: 'Beddenbaas', member_id: members[2].id, time_of_day: 'before_school', points: 1 },
        { title: 'Tafel dekken', icon: '🍽️', role_title: 'Tafelkoning', member_id: members[3].id, time_of_day: 'after_school', points: 1 },
        { title: 'Hond uitlaten', icon: '🐕', role_title: 'Hondenbaas', member_id: members[2].id, time_of_day: 'after_school', points: 2 },
        { title: 'Kamer opruimen', icon: '🧹', role_title: 'Veegkampioen', member_id: members[2].id, time_of_day: 'before_bed', points: 1 },
        { title: 'Planten water geven', icon: '🪴', role_title: 'Groene Vingers', member_id: members[3].id, time_of_day: 'after_school', points: 1 },
        { title: 'Vuilnis buiten zetten', icon: '🗑️', role_title: 'Afvalheld', member_id: members[0].id, time_of_day: 'before_bed', points: 1 },
        { title: 'Was opvouwen', icon: '🧺', role_title: 'Vouwmeester', member_id: members[1].id, time_of_day: 'anytime', points: 1 },
        { title: 'Vaatwasser uitruimen', icon: '🧽', role_title: 'Afwasheld', member_id: members[0].id, time_of_day: 'after_school', points: 1 },
      ];

      const insertTemplate = db.prepare(
        'INSERT INTO chore_templates (id, title, icon, role_title, member_id, recurrence, time_of_day, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const insertInstance = db.prepare(
        'INSERT OR IGNORE INTO chore_instances (id, template_id, date, completed, completed_at) VALUES (?, ?, ?, ?, ?)'
      );

      for (const ct of choreTemplates) {
        const templateId = uuidv4();
        insertTemplate.run(templateId, ct.title, ct.icon, ct.role_title, ct.member_id, 'daily', ct.time_of_day, ct.points);
        // Create today's instance — some completed for variety
        const completed = Math.random() > 0.5 ? 1 : 0;
        insertInstance.run(uuidv4(), templateId, today, completed, completed ? new Date().toISOString() : null);
      }

      // --- Maaltijdplanning ---
      const insertMeal = db.prepare(
        "INSERT OR REPLACE INTO meal_plans (id, date, meal_type, title, notes) VALUES (?, ?, 'dinner', ?, ?)"
      );
      const weekDinners = [
        { offset: 0, title: 'Spaghetti Bolognese', notes: 'Met extra veel verstopte groenten. Kok: Papa' },
        { offset: 1, title: 'Taco Night', notes: "Zelf je taco's bouwen. Kok: Mama" },
        { offset: 2, title: 'Maaltijdsalade', notes: 'Met gegrilde kip en croutons. Kok: Mama' },
        { offset: 3, title: 'Verse Kippensoep', notes: 'Met stokbrood en kruidenboter. Kok: Papa' },
        { offset: 4, title: 'Pizza Avond!', notes: 'Lekker makkelijk het weekend in. Bezorging' },
        { offset: 5, title: 'Zelfgemaakte Burgers', notes: 'Met frietjes uit de Airfryer. Kok: Papa' },
        { offset: 6, title: 'Zondagsbraad', notes: 'Bij Oma eten!' },
      ];
      for (const d of weekDinners) {
        const date = new Date(Date.now() + d.offset * 86400000).toISOString().split('T')[0];
        insertMeal.run(uuidv4(), date, d.title, d.notes);
      }

      // --- Boodschappen ---
      const insertShopping = db.prepare(
        'INSERT INTO shopping_items (id, name, quantity, category) VALUES (?, ?, ?, ?)'
      );
      const items = [
        { name: 'Melk', quantity: '2 pakken', category: 'zuivel' },
        { name: 'Bananen', quantity: '1 tros', category: 'groente & fruit' },
        { name: 'Volkoren brood', quantity: '1', category: 'bakkerij' },
        { name: 'Kipfilet', quantity: '500g', category: 'vlees' },
        { name: 'Pasta', quantity: '2 pakken', category: 'droogwaren' },
        { name: 'Passata', quantity: '1 blik', category: 'conserven' },
        { name: 'Komkommer', quantity: '1', category: 'groente & fruit' },
        { name: 'Kaas', quantity: '1 stuk', category: 'zuivel' },
        { name: 'Eieren', quantity: '10 stuks', category: 'zuivel' },
        { name: 'Appels', quantity: '6 stuks', category: 'groente & fruit' },
        { name: 'Yoghurt', quantity: '1 liter', category: 'zuivel' },
        { name: 'Boter', quantity: '1 pakje', category: 'zuivel' },
      ];
      for (const item of items) {
        insertShopping.run(uuidv4(), item.name, item.quantity, item.category);
      }
    })();

    res.json({ success: true, message: 'Demodata aangemaakt!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings/clear-data — Verwijder alle gebruikersdata
router.post('/clear-data', (req, res) => {
  try {
    const db = getDb();
    const { pin } = req.body;

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
    if (!setting || setting.value !== pin) {
      return res.status(401).json({ error: 'PIN is onjuist' });
    }

    db.transaction(() => {
      db.exec('DELETE FROM chore_instances');
      db.exec('DELETE FROM chore_templates');
      db.exec('DELETE FROM events');
      db.exec('DELETE FROM meal_plans');
      db.exec('DELETE FROM shopping_items');
      db.exec('DELETE FROM day_feedback');
      db.exec('DELETE FROM pantry_check');
      db.exec('DELETE FROM weekmenu_shopping_items');
      db.exec('DELETE FROM menu_days');
      db.exec('DELETE FROM weekly_menus');
      db.exec('DELETE FROM calendar_connections');
      db.exec('DELETE FROM family_members');
    })();

    res.json({ success: true, message: 'Alle data verwijderd!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
