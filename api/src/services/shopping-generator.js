const { getDb } = require('../models/database');
const { logger } = require('./logger');

/**
 * Generate pantry check items for a weekly menu.
 * Extracts staple/pantry items (kruiden, droogwaren, olie, sauzen, zuivel)
 * from non-completed days and inserts them into pantry_check.
 */
function generatePantryCheck(menuId) {
  const db = getDb();

  // Get remaining (not completed) days
  const remainingDays = db.prepare(
    'SELECT * FROM menu_days WHERE menu_id = ? AND status != ?'
  ).all(menuId, 'completed');

  // Clear existing pantry check
  db.prepare('DELETE FROM pantry_check WHERE menu_id = ?').run(menuId);

  const pantryItems = new Map();

  for (const day of remainingDays) {
    let recipe;
    try {
      recipe = JSON.parse(day.recipe_data);
    } catch {
      continue; // Skip days with malformed recipe data
    }
    if (!recipe.ingredients) continue;

    for (const ing of recipe.ingredients) {
      // Focus on staple/pantry items
      const group = (ing.product_group || '').toLowerCase();
      const isPantryItem = ['kruiden', 'droogwaren', 'olie', 'sauzen', 'zuivel'].some(
        (g) => group.includes(g)
      );
      if (!isPantryItem) continue;

      const key = ing.name.toLowerCase();
      if (!pantryItems.has(key)) {
        pantryItems.set(key, { days: new Set(), amounts: [] });
      }
      const entry = pantryItems.get(key);
      entry.days.add(day.day_name);
      if (ing.amount && ing.unit) {
        entry.amounts.push({ amount: ing.amount, unit: ing.unit });
      }
    }
  }

  const insertPantry = db.prepare(
    'INSERT INTO pantry_check (menu_id, item_name, quantity, needed_for_days) VALUES (?, ?, ?, ?)'
  );

  for (const [item, entry] of pantryItems) {
    const quantity = summarizeAmounts(entry.amounts);
    insertPantry.run(menuId, item, quantity, JSON.stringify(Array.from(entry.days)));
  }

  logger.info(`Pantry check gegenereerd voor menu ${menuId}: ${pantryItems.size} items`);
}

/**
 * Summarize amounts by grouping same units and summing values.
 */
function summarizeAmounts(amounts) {
  if (amounts.length === 0) return '';

  // Group by unit
  const byUnit = new Map();
  for (const { amount, unit } of amounts) {
    const num = parseFloat(amount);
    if (isNaN(num)) continue;
    const u = unit.toLowerCase();
    byUnit.set(u, (byUnit.get(u) || 0) + num);
  }

  if (byUnit.size === 0) return '';

  return Array.from(byUnit.entries())
    .map(([unit, total]) => `${total % 1 === 0 ? total : total.toFixed(1)} ${unit}`)
    .join(', ');
}

module.exports = { generatePantryCheck, summarizeAmounts };
