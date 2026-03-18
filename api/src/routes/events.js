const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/events?start=&end=&member_id=
function getEvents(req, res) {
  try {
    const db = getDb();
    const { start, end, member_id } = req.query;

    let query = 'SELECT e.*, fm.name as member_name, fm.color as member_color FROM events e LEFT JOIN family_members fm ON e.member_id = fm.id WHERE 1=1';
    const params = [];

    if (start) {
      query += ' AND e.end_time >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND e.start_time <= ?';
      params.push(end);
    }
    if (member_id) {
      query += ' AND e.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY e.start_time ASC';

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /api/events
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { title, description, start_time, end_time, all_day, location, member_id, recurrence_rule } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Titel, start- en eindtijd zijn vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, title, description, start_time, end_time, all_day, location, member_id, recurrence_rule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || null, start_time, end_time, all_day ? 1 : 0, location || null, member_id || null, recurrence_rule || null);

    const event = db.prepare('SELECT e.*, fm.name as member_name, fm.color as member_color FROM events e LEFT JOIN family_members fm ON e.member_id = fm.id WHERE e.id = ?').get(id);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { title, description, start_time, end_time, all_day, location, member_id, recurrence_rule } = req.body;

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event niet gevonden' });
    }

    db.prepare(`
      UPDATE events SET title = ?, description = ?, start_time = ?, end_time = ?, all_day = ?, location = ?, member_id = ?, recurrence_rule = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      start_time || existing.start_time,
      end_time || existing.end_time,
      all_day !== undefined ? (all_day ? 1 : 0) : existing.all_day,
      location !== undefined ? location : existing.location,
      member_id !== undefined ? member_id : existing.member_id,
      recurrence_rule !== undefined ? recurrence_rule : existing.recurrence_rule,
      req.params.id
    );

    const event = db.prepare('SELECT e.*, fm.name as member_name, fm.color as member_color FROM events e LEFT JOIN family_members fm ON e.member_id = fm.id WHERE e.id = ?').get(req.params.id);
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount getEvents on router too
router.get('/', getEvents);

module.exports = { router, getEvents };
