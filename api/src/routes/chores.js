const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/chores?date=&member_id=
function getChores(req, res) {
  try {
    const db = getDb();
    const { date, member_id, week } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query, params;

    if (week) {
      const startDate = targetDate;
      const endDate = new Date(new Date(targetDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      query = `
        SELECT ci.*, ct.title, ct.icon, ct.role_title, ct.member_id, ct.time_of_day, ct.points,
               fm.name as member_name, fm.color as member_color
        FROM chore_instances ci
        JOIN chore_templates ct ON ci.template_id = ct.id
        LEFT JOIN family_members fm ON ct.member_id = fm.id
        WHERE ci.date >= ? AND ci.date < ?
      `;
      params = [startDate, endDate];
    } else {
      query = `
        SELECT ci.*, ct.title, ct.icon, ct.role_title, ct.member_id, ct.time_of_day, ct.points,
               fm.name as member_name, fm.color as member_color
        FROM chore_instances ci
        JOIN chore_templates ct ON ci.template_id = ct.id
        LEFT JOIN family_members fm ON ct.member_id = fm.id
        WHERE ci.date = ?
      `;
      params = [targetDate];
    }

    if (member_id) {
      query += ' AND ct.member_id = ?';
      params.push(member_id);
    }

    query += ' ORDER BY ct.time_of_day, ct.title';

    const chores = db.prepare(query).all(...params);
    res.json(chores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/chores/:id/toggle
function toggleChore(req, res) {
  try {
    const db = getDb();
    const chore = db.prepare(`
      SELECT ci.*, ct.title FROM chore_instances ci
      JOIN chore_templates ct ON ci.template_id = ct.id
      WHERE ci.id = ?
    `).get(req.params.id);

    if (!chore) {
      return res.status(404).json({ error: 'Klusje niet gevonden' });
    }

    const newCompleted = chore.completed ? 0 : 1;
    db.prepare(`
      UPDATE chore_instances SET completed = ?, completed_at = ?, completed_by = ?
      WHERE id = ?
    `).run(
      newCompleted,
      newCompleted ? new Date().toISOString() : null,
      req.user?.memberId || 'tablet',
      req.params.id
    );

    const updated = db.prepare(`
      SELECT ci.*, ct.title, ct.icon, ct.role_title, ct.member_id, ct.time_of_day, ct.points,
             fm.name as member_name, fm.color as member_color
      FROM chore_instances ci
      JOIN chore_templates ct ON ci.template_id = ct.id
      LEFT JOIN family_members fm ON ct.member_id = fm.id
      WHERE ci.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/chores/streaks - Bereken dagstreaks per gezinslid
function getStreaks(req, res) {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const members = db.prepare(`
      SELECT DISTINCT ct.member_id, fm.name as member_name
      FROM chore_templates ct
      JOIN family_members fm ON ct.member_id = fm.id
    `).all();

    const streaks = {};
    for (const member of members) {
      let streak = 0;
      let checkDate = new Date(today);

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayStats = db.prepare(`
          SELECT COUNT(*) as total, SUM(ci.completed) as completed
          FROM chore_instances ci
          JOIN chore_templates ct ON ci.template_id = ct.id
          WHERE ci.date = ? AND ct.member_id = ?
        `).get(dateStr, member.member_id);

        if (!dayStats || dayStats.total === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }

        if (dayStats.completed === dayStats.total) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (i === 0) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      streaks[member.member_id] = streak;
    }

    res.json(streaks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/chores/templates
router.get('/templates', (req, res) => {
  try {
    const db = getDb();
    const templates = db.prepare(`
      SELECT ct.*, fm.name as member_name, fm.color as member_color
      FROM chore_templates ct
      LEFT JOIN family_members fm ON ct.member_id = fm.id
      ORDER BY ct.title
    `).all();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chores/templates
router.post('/templates', (req, res) => {
  try {
    const db = getDb();
    const { title, icon, role_title, member_id, recurrence, recurrence_days, time_of_day, points } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Titel is vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, role_title, member_id, recurrence, recurrence_days, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, icon || '📋', role_title || null, member_id || null, recurrence || 'daily', recurrence_days || null, time_of_day || 'anytime', points || 1);

    const template = db.prepare('SELECT * FROM chore_templates WHERE id = ?').get(id);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chores/templates/:id
router.put('/templates/:id', (req, res) => {
  try {
    const db = getDb();
    const { title, icon, role_title, member_id, recurrence, recurrence_days, time_of_day, points } = req.body;

    const existing = db.prepare('SELECT * FROM chore_templates WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Template niet gevonden' });
    }

    db.prepare(`
      UPDATE chore_templates SET title = ?, icon = ?, role_title = ?, member_id = ?, recurrence = ?, recurrence_days = ?, time_of_day = ?, points = ?
      WHERE id = ?
    `).run(
      title || existing.title,
      icon || existing.icon,
      role_title !== undefined ? role_title : existing.role_title,
      member_id !== undefined ? member_id : existing.member_id,
      recurrence || existing.recurrence,
      recurrence_days !== undefined ? recurrence_days : existing.recurrence_days,
      time_of_day || existing.time_of_day,
      points || existing.points,
      req.params.id
    );

    const template = db.prepare('SELECT * FROM chore_templates WHERE id = ?').get(req.params.id);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chores/templates/:id
router.delete('/templates/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM chore_templates WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chores/stats?member_id=&start=&end=
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const { member_id, start, end } = req.query;
    const startDate = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];

    let query = `
      SELECT ct.member_id, fm.name as member_name, fm.color as member_color,
             COUNT(*) as total, SUM(ci.completed) as completed,
             SUM(CASE WHEN ci.completed = 1 THEN ct.points ELSE 0 END) as points
      FROM chore_instances ci
      JOIN chore_templates ct ON ci.template_id = ct.id
      LEFT JOIN family_members fm ON ct.member_id = fm.id
      WHERE ci.date >= ? AND ci.date <= ?
    `;
    const params = [startDate, endDate];

    if (member_id) {
      query += ' AND ct.member_id = ?';
      params.push(member_id);
    }

    query += ' GROUP BY ct.member_id';

    const stats = db.prepare(query).all(...params);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/streaks', getStreaks);
router.get('/', getChores);
router.patch('/:id/toggle', toggleChore);

module.exports = { router, getChores, toggleChore, getStreaks };
