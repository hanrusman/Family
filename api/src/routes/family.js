const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/family
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare('SELECT * FROM family_members ORDER BY sort_order, name').all();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/family
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, role, color, avatar } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Naam en rol zijn vereist' });
    }

    if (!['adult', 'child'].includes(role)) {
      return res.status(400).json({ error: 'Rol moet "adult" of "child" zijn' });
    }

    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM family_members').get();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO family_members (id, name, role, color, avatar, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, role, color || '#3B82F6', avatar || null, (maxOrder.max || 0) + 1);

    const member = db.prepare('SELECT * FROM family_members WHERE id = ?').get(id);
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/family/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, role, color, avatar, sort_order } = req.body;

    const existing = db.prepare('SELECT * FROM family_members WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Gezinslid niet gevonden' });
    }

    db.prepare(`
      UPDATE family_members SET name = ?, role = ?, color = ?, avatar = ?, sort_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || existing.name,
      role || existing.role,
      color || existing.color,
      avatar !== undefined ? avatar : existing.avatar,
      sort_order !== undefined ? sort_order : existing.sort_order,
      req.params.id
    );

    const member = db.prepare('SELECT * FROM family_members WHERE id = ?').get(req.params.id);
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/family/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM family_members WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Gezinslid niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
