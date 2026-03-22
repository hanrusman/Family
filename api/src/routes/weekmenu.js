const { Router } = require('express');
const { getDb } = require('../models/database');
const { importMenu, getTargetWeek } = require('../services/menu-generator');
const { generatePantryCheck } = require('../services/shopping-generator');
const { authMiddleware } = require('../middleware/auth');
const { logger } = require('../services/logger');

const router = Router();

const VALID_MENU_STATUSES = ['active', 'archived'];
const VALID_RATINGS = ['lekker', 'ok', 'minder'];

// GET /api/weekmenu - list all menus
router.get('/', (_req, res) => {
  const db = getDb();
  const menus = db.prepare(
    'SELECT id, week_number, year, status, created_at FROM weekly_menus ORDER BY year DESC, week_number DESC'
  ).all();
  res.json(menus);
});

// GET /api/weekmenu/active - get currently active menu with days
router.get('/active', (_req, res) => {
  const db = getDb();
  const menu = db.prepare("SELECT * FROM weekly_menus WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
  if (!menu) {
    return res.json(null);
  }
  const days = db.prepare('SELECT * FROM menu_days WHERE menu_id = ? ORDER BY day_of_week').all(menu.id);
  res.json({ ...menu, days });
});

// GET /api/weekmenu/target-week - auto-detect target week + year
router.get('/target-week', (_req, res) => {
  const target = getTargetWeek(new Date());
  res.json(target);
});

// GET /api/weekmenu/feedback/export - export last 30 feedback items for Claude
// NOTE: defined before /:id so "feedback" doesn't match the :id param
router.get('/feedback/export', (_req, res) => {
  const db = getDb();

  const feedback = db.prepare(`
    SELECT m.week_number, m.year, md.day_name, md.recipe_name, md.meal_type, df.rating, df.notes
    FROM day_feedback df
    JOIN menu_days md ON df.day_id = md.id
    JOIN weekly_menus m ON md.menu_id = m.id
    ORDER BY m.year DESC, m.week_number DESC, md.day_of_week
    LIMIT 30
  `).all();

  if (feedback.length === 0) {
    return res.json({ text: 'Nog geen feedback beschikbaar.', feedback: [] });
  }

  const ratingLabel = { lekker: 'Lekker', ok: 'OK', minder: 'Minder' };

  let text = 'Feedback van afgelopen weken:\n\n';
  let currentWeek = '';

  for (const f of feedback) {
    const weekLabel = `Week ${f.week_number}, ${f.year}`;
    if (weekLabel !== currentWeek) {
      currentWeek = weekLabel;
      text += `### ${weekLabel}\n`;
    }
    text += `- ${f.day_name}: ${f.recipe_name} (${f.meal_type}) — ${ratingLabel[f.rating] || f.rating}`;
    if (f.notes) text += ` — "${f.notes}"`;
    text += '\n';
  }

  res.json({ text, feedback });
});

// GET /api/weekmenu/days/:dayId - single day by ID (for detail page)
router.get('/days/:dayId', (req, res) => {
  const db = getDb();
  const dayId = Number(req.params.dayId);
  if (!Number.isInteger(dayId) || dayId <= 0) {
    return res.status(400).json({ error: 'Ongeldig dag ID' });
  }
  const day = db.prepare('SELECT * FROM menu_days WHERE id = ?').get(dayId);
  if (!day) {
    return res.status(404).json({ error: 'Dag niet gevonden' });
  }
  res.json(day);
});

// POST /api/weekmenu/import - import menu JSON (admin only)
router.post('/import', authMiddleware, (req, res) => {
  try {
    const { menu: menuData, weekNumber, year } = req.body || {};

    if (!menuData) {
      return res.status(400).json({ error: 'Menu JSON is vereist' });
    }

    // Validate optional inputs
    if (weekNumber !== undefined && (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53)) {
      return res.status(400).json({ error: 'Weeknummer moet tussen 1 en 53 zijn' });
    }
    if (year !== undefined && (!Number.isInteger(year) || year < 2020 || year > 2100)) {
      return res.status(400).json({ error: 'Jaar moet tussen 2020 en 2100 zijn' });
    }

    const menuId = importMenu(menuData, weekNumber, year);
    const db = getDb();
    const menu = db.prepare('SELECT * FROM weekly_menus WHERE id = ?').get(menuId);
    const days = db.prepare('SELECT * FROM menu_days WHERE menu_id = ? ORDER BY day_of_week').all(menuId);
    res.json({ ...menu, days });
  } catch (err) {
    logger.error('Menu import mislukt:', err);
    res.status(400).json({ error: 'Menu import mislukt', details: err.message });
  }
});

// GET /api/weekmenu/:id - specific menu with days
router.get('/:id', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }
  const menu = db.prepare('SELECT * FROM weekly_menus WHERE id = ?').get(id);
  if (!menu) {
    return res.status(404).json({ error: 'Menu niet gevonden' });
  }
  const days = db.prepare('SELECT * FROM menu_days WHERE menu_id = ? ORDER BY day_of_week').all(id);
  res.json({ ...menu, days });
});

// PATCH /api/weekmenu/:id - update menu status (admin only)
router.patch('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }
  if (!VALID_MENU_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status moet een van ${VALID_MENU_STATUSES.join(', ')} zijn` });
  }

  const existing = db.prepare('SELECT id FROM weekly_menus WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Menu niet gevonden' });
  }

  if (status === 'active') {
    const activate = db.transaction(() => {
      db.prepare("UPDATE weekly_menus SET status = 'archived' WHERE status = 'active'").run();
      db.prepare('UPDATE weekly_menus SET status = ? WHERE id = ?').run(status, id);
    });
    activate();
    try { generatePantryCheck(id); } catch (err) { logger.error('Pantry check mislukt:', err); }
  } else {
    db.prepare('UPDATE weekly_menus SET status = ? WHERE id = ?').run(status, id);
  }

  const menu = db.prepare('SELECT * FROM weekly_menus WHERE id = ?').get(id);
  const days = db.prepare('SELECT * FROM menu_days WHERE menu_id = ? ORDER BY day_of_week').all(id);
  res.json({ ...menu, days });
});

// DELETE /api/weekmenu/:id - delete menu (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }

  const result = db.prepare('DELETE FROM weekly_menus WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Menu niet gevonden' });
  }

  res.json({ ok: true });
});

// GET /api/weekmenu/:id/days - all days for menu
router.get('/:id/days', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }
  const days = db.prepare('SELECT * FROM menu_days WHERE menu_id = ? ORDER BY day_of_week').all(id);
  res.json(days);
});

// DELETE /api/weekmenu/:id/days/:dayId - delete day (admin only)
router.delete('/:id/days/:dayId', authMiddleware, (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  const dayId = Number(req.params.dayId);

  const result = db.prepare('DELETE FROM menu_days WHERE id = ? AND menu_id = ?').run(dayId, menuId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dag niet gevonden' });
  }

  // Regenerate pantry check after removing a day
  try { generatePantryCheck(menuId); } catch (err) { logger.error('Pantry check mislukt:', err); }

  res.json({ ok: true });
});

// PATCH /api/weekmenu/:id/days/:dayId/complete - mark meal as done
router.patch('/:id/days/:dayId/complete', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  const dayId = Number(req.params.dayId);

  const result = db.prepare(
    "UPDATE menu_days SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND menu_id = ?"
  ).run(dayId, menuId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dag niet gevonden' });
  }

  try { generatePantryCheck(menuId); } catch (err) { logger.error('Pantry check mislukt:', err); }

  const day = db.prepare('SELECT * FROM menu_days WHERE id = ? AND menu_id = ?').get(dayId, menuId);
  res.json(day);
});

// POST /api/weekmenu/:id/days/:dayId/feedback - save feedback for a day
router.post('/:id/days/:dayId/feedback', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  const dayId = Number(req.params.dayId);
  const { rating, notes } = req.body;

  if (!VALID_RATINGS.includes(rating)) {
    return res.status(400).json({ error: `Beoordeling moet een van ${VALID_RATINGS.join(', ')} zijn` });
  }
  if (notes && typeof notes === 'string' && notes.length > 500) {
    return res.status(400).json({ error: 'Notities mogen maximaal 500 tekens zijn' });
  }

  const day = db.prepare('SELECT id FROM menu_days WHERE id = ? AND menu_id = ?').get(dayId, menuId);
  if (!day) {
    return res.status(404).json({ error: 'Dag niet gevonden' });
  }

  db.prepare(`
    INSERT INTO day_feedback (day_id, rating, notes) VALUES (?, ?, ?)
    ON CONFLICT(day_id) DO UPDATE SET rating = excluded.rating, notes = excluded.notes, created_at = CURRENT_TIMESTAMP
  `).run(dayId, rating, notes || null);

  const feedback = db.prepare('SELECT * FROM day_feedback WHERE day_id = ?').get(dayId);
  res.json(feedback);
});

// GET /api/weekmenu/:id/days/:dayId/feedback - get feedback for a day
router.get('/:id/days/:dayId/feedback', (req, res) => {
  const dayId = Number(req.params.dayId);
  const db = getDb();
  const feedback = db.prepare('SELECT * FROM day_feedback WHERE day_id = ?').get(dayId);
  res.json(feedback || null);
});

// GET /api/weekmenu/:id/feedback - all feedback for menu
router.get('/:id/feedback', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);

  const feedback = db.prepare(`
    SELECT md.day_name, md.recipe_name, md.meal_type, df.rating, df.notes
    FROM day_feedback df
    JOIN menu_days md ON df.day_id = md.id
    WHERE md.menu_id = ?
    ORDER BY md.day_of_week
  `).all(menuId);

  res.json(feedback);
});

module.exports = router;
