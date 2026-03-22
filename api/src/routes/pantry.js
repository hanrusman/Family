const { Router } = require('express');
const { getDb } = require('../models/database');

const router = Router();

// GET /api/weekmenu/:id/pantry - pantry check items
router.get('/:id/pantry', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  if (!Number.isInteger(menuId) || menuId <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }
  const items = db.prepare(
    'SELECT * FROM pantry_check WHERE menu_id = ? ORDER BY item_name'
  ).all(menuId);
  res.json(items);
});

// PATCH /api/weekmenu/:id/pantry/:itemId - toggle have_it
router.patch('/:id/pantry/:itemId', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { have_it } = req.body;

  if (typeof have_it !== 'boolean') {
    return res.status(400).json({ error: 'have_it moet een boolean zijn' });
  }

  const result = db.prepare('UPDATE pantry_check SET have_it = ? WHERE id = ? AND menu_id = ?')
    .run(have_it ? 1 : 0, itemId, menuId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Item niet gevonden' });
  }

  const item = db.prepare('SELECT * FROM pantry_check WHERE id = ? AND menu_id = ?').get(itemId, menuId);
  res.json(item);
});

module.exports = router;
