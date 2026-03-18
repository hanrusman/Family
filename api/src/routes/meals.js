const express = require('express');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/meals?date=&week=
function getMeals(req, res) {
  try {
    const db = getDb();
    const { date, start, end } = req.query;

    let query = `
      SELECT mp.*, r.ingredients, r.instructions, r.servings, r.prep_time
      FROM meal_plans mp
      LEFT JOIN recipes r ON mp.recipe_id = r.id
    `;
    const params = [];

    if (start && end) {
      query += ' WHERE mp.date >= ? AND mp.date <= ?';
      params.push(start, end);
    } else if (date) {
      query += ' WHERE mp.date = ?';
      params.push(date);
    }

    query += ' ORDER BY mp.date, CASE mp.meal_type WHEN \'breakfast\' THEN 1 WHEN \'lunch\' THEN 2 WHEN \'dinner\' THEN 3 END';

    const meals = db.prepare(query).all(...params);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /api/meals
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { date, meal_type, title, recipe_id, notes } = req.body;

    if (!date || !meal_type || !title) {
      return res.status(400).json({ error: 'Datum, maaltijdtype en titel zijn vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO meal_plans (id, date, meal_type, title, recipe_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, date, meal_type, title, recipe_id || null, notes || null);

    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id);
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/meals/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { date, meal_type, title, recipe_id, notes } = req.body;

    const existing = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Maaltijd niet gevonden' });
    }

    db.prepare(`
      UPDATE meal_plans SET date = ?, meal_type = ?, title = ?, recipe_id = ?, notes = ?
      WHERE id = ?
    `).run(
      date || existing.date,
      meal_type || existing.meal_type,
      title || existing.title,
      recipe_id !== undefined ? recipe_id : existing.recipe_id,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(req.params.id);
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/meals/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM meal_plans WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Maaltijd niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Recepten ---

// GET /api/meals/recipes
router.get('/recipes', (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;
    let query = 'SELECT * FROM recipes';
    const params = [];

    if (search) {
      query += ' WHERE title LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY title';
    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meals/recipes
router.post('/recipes', (req, res) => {
  try {
    const db = getDb();
    const { title, ingredients, instructions, servings, prep_time, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Titel is vereist' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO recipes (id, title, ingredients, instructions, servings, prep_time, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, ingredients || null, instructions || null, servings || 4, prep_time || null, tags || null);

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/meals/recipes/:id
router.delete('/recipes/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recept niet gevonden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', getMeals);

module.exports = { router, getMeals };
