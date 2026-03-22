const { Router } = require('express');
const { getDb } = require('../models/database');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

// GET /api/recipes - list recipes (optional ?search=name)
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;

  let query = 'SELECT * FROM recipes';
  const params = [];

  if (search && typeof search === 'string') {
    query += ' WHERE title LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  const recipes = db.prepare(query).all(...params);
  res.json(recipes);
});

// POST /api/recipes - add recipe (admin only)
router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { title, ingredients, instructions, servings, prep_time, tags } = req.body;

  if (!title || typeof title !== 'string' || title.length > 200) {
    return res.status(400).json({ error: 'Titel is verplicht (max 200 tekens)' });
  }

  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();

  db.prepare(
    'INSERT INTO recipes (id, title, ingredients, instructions, servings, prep_time, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    title,
    typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients || []),
    typeof instructions === 'string' ? instructions : JSON.stringify(instructions || []),
    servings || 4,
    prep_time || null,
    typeof tags === 'string' ? tags : JSON.stringify(tags || []),
  );

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  res.status(201).json(recipe);
});

// GET /api/recipes/:id - specific recipe
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!recipe) {
    return res.status(404).json({ error: 'Recept niet gevonden' });
  }
  res.json(recipe);
});

// DELETE /api/recipes/:id - delete recipe (admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Recept niet gevonden' });
  }
  res.json({ ok: true });
});

module.exports = router;
