const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const CATEGORIES = [
  'groente_fruit', 'zuivel', 'vlees_vis', 'brood_bakkerij',
  'conserven', 'dranken', 'diepvries', 'huishouden', 'overig'
];

const CATEGORY_LABELS = {
  groente_fruit: 'Groente & Fruit',
  zuivel: 'Zuivel',
  vlees_vis: 'Vlees & Vis',
  brood_bakkerij: 'Brood & Bakkerij',
  conserven: 'Conserven & Droog',
  dranken: 'Dranken',
  diepvries: 'Diepvries',
  huishouden: 'Huishouden',
  overig: 'Overig',
};

// GET /api/shopping?show_checked=
function getItems(req, res) {
  try {
    const db = getDb();
    const showChecked = req.query.show_checked === 'true';

    let query = 'SELECT * FROM shopping_items';
    if (!showChecked) {
      query += ' WHERE checked = 0';
    }
    query += ' ORDER BY category, name';

    const items = db.prepare(query).all();

    // Group by category
    const grouped = {};
    for (const item of items) {
      const cat = item.category || 'overig';
      if (!grouped[cat]) {
        grouped[cat] = {
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          items: [],
        };
      }
      grouped[cat].items.push(item);
    }

    res.json({
      items,
      grouped: Object.values(grouped),
      categories: CATEGORY_LABELS,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /api/shopping
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, quantity, category, added_by, meal_plan_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Naam is vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO shopping_items (id, name, quantity, category, added_by, meal_plan_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, quantity || null, category || 'overig', added_by || null, meal_plan_id || null);

    const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping/bulk - Add multiple items at once
router.post('/bulk', (req, res) => {
  try {
    const db = getDb();
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is vereist' });
    }

    const insert = db.prepare(`
      INSERT INTO shopping_items (id, name, quantity, category, added_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    const ids = [];
    const insertMany = db.transaction(() => {
      for (const item of items) {
        if (item.name) {
          const id = uuidv4();
          insert.run(id, item.name, item.quantity || null, item.category || 'overig', item.added_by || null);
          ids.push(id);
        }
      }
    });
    insertMany();

    if (ids.length === 0) {
      return res.status(201).json([]);
    }

    const created = db.prepare(
      `SELECT * FROM shopping_items WHERE id IN (${ids.map(() => '?').join(',')})`
    ).all(...ids);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping/checked/clear - Remove all checked items
// IMPORTANT: Must be before /:id routes to avoid route collision
router.delete('/checked/clear', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM shopping_items WHERE checked = 1').run();
    res.json({ success: true, removed: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/shopping/:id/toggle
function toggleItem(req, res) {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item niet gevonden' });
    }

    const newChecked = item.checked ? 0 : 1;
    db.prepare(
      'UPDATE shopping_items SET checked = ?, checked_at = ? WHERE id = ?'
    ).run(newChecked, newChecked ? new Date().toISOString() : null, req.params.id);

    const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
router.patch('/:id/toggle', toggleItem);

// DELETE /api/shopping/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', getItems);

module.exports = { router, getItems, toggleItem };
