const { Router } = require('express');
const { getDb } = require('../models/database');

const router = Router();

// GET /api/weekmenu/:id/shopping - get shopping list grouped by product_group
router.get('/:id/shopping', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  if (!Number.isInteger(menuId) || menuId <= 0) {
    return res.status(400).json({ error: 'Ongeldig menu ID' });
  }

  const items = db.prepare(
    'SELECT * FROM weekmenu_shopping_items WHERE menu_id = ? ORDER BY product_group, item_name'
  ).all(menuId);

  // Group by product_group
  const grouped = {};
  for (const item of items) {
    const group = item.product_group || 'overig';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(item);
  }

  res.json({ items, grouped });
});

// PATCH /api/weekmenu/:id/shopping/:itemId - toggle item checked
router.patch('/:id/shopping/:itemId', (req, res) => {
  const db = getDb();
  const menuId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { checked } = req.body;

  if (typeof checked !== 'boolean') {
    return res.status(400).json({ error: 'checked moet een boolean zijn' });
  }

  const result = db.prepare('UPDATE weekmenu_shopping_items SET checked = ? WHERE id = ? AND menu_id = ?')
    .run(checked ? 1 : 0, itemId, menuId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Item niet gevonden' });
  }

  const item = db.prepare('SELECT * FROM weekmenu_shopping_items WHERE id = ? AND menu_id = ?').get(itemId, menuId);
  res.json(item);
});

module.exports = router;
