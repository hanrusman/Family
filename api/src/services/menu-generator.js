const { z } = require('zod');
const { getDb } = require('../models/database');
const { generatePantryCheck } = require('./shopping-generator');
const { logger } = require('./logger');

// Lenient schemas — most fields optional for easier import
const IngredientSchema = z.object({
  name: z.string(),
  amount: z.string().optional().default(''),
  unit: z.string().optional().default(''),
  product_group: z.string().optional().default('overig'),
}).passthrough();

const RecipeSchema = z.object({
  ingredients: z.array(IngredientSchema).optional().default([]),
  steps: z.array(z.string()).optional().default([]),
  nutrition_per_serving: z.object({
    calories: z.number().optional().default(0),
    protein_g: z.number().optional().default(0),
    fiber_g: z.number().optional().default(0),
    iron_mg: z.number().optional().default(0),
  }).optional().default({}),
  tip: z.string().optional(),
}).passthrough();

const DaySchema = z.object({
  day_name: z.string(),
  recipe_name: z.string(),
  recipe_data: RecipeSchema.optional().default({}),
  meal_type: z.string().optional().default('dinner'),
  prep_time_minutes: z.number().optional().default(30),
  cost_index: z.string().optional().default('€€'),
}).passthrough();

const ShoppingItemSchema = z.object({
  name: z.string(),
  quantity: z.string().optional().default(''),
  for_days: z.array(z.string()).optional().default([]),
  is_perishable: z.boolean().optional().default(false),
  storage_tip: z.string().optional(),
}).passthrough();

const ShoppingGroupSchema = z.object({
  product_group: z.string(),
  items: z.array(ShoppingItemSchema),
}).passthrough();

const MenuImportSchema = z.object({
  days: z.array(DaySchema).min(1).max(7),
  shopping_list: z.array(ShoppingGroupSchema).optional(),
  snack_suggestions: z.array(z.string()).optional(),
  // Allow extra top-level fields (groenten_per_dag, opmerking, etc.)
}).passthrough();

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the target week number for a menu import.
 */
function getTargetWeek(date) {
  const day = date.getDay();
  const daysUntilWed = day <= 2
    ? 3 - day
    : day <= 5
      ? 0
      : 4;

  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + daysUntilWed);

  return {
    weekNumber: getISOWeek(targetDate),
    year: targetDate.getFullYear(),
  };
}

/**
 * Import a menu from JSON data.
 */
function importMenu(jsonData, weekNumber, year) {
  const parsed = MenuImportSchema.parse(jsonData);

  const target = getTargetWeek(new Date());
  const wk = weekNumber || target.weekNumber;
  const yr = year || target.year;

  const db = getDb();

  const insertAll = db.transaction(() => {
    // Delete existing menu for same week if it exists
    const existing = db.prepare('SELECT id FROM weekly_menus WHERE week_number = ? AND year = ?').get(wk, yr);
    if (existing) {
      db.prepare('DELETE FROM weekly_menus WHERE id = ?').run(existing.id);
    }

    // Archive any currently active menu
    db.prepare("UPDATE weekly_menus SET status = 'archived' WHERE status = 'active'").run();

    // Insert new menu as active
    const result = db.prepare(
      'INSERT INTO weekly_menus (week_number, year, status, snack_suggestions) VALUES (?, ?, ?, ?)'
    ).run(wk, yr, 'active', JSON.stringify(parsed.snack_suggestions || []));
    const menuId = Number(result.lastInsertRowid);

    // Insert days
    const insertDay = db.prepare(`
      INSERT INTO menu_days (menu_id, day_of_week, day_name, recipe_name, recipe_data, meal_type, prep_time_minutes, cost_index, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `);

    for (let i = 0; i < parsed.days.length; i++) {
      const day = parsed.days[i];
      insertDay.run(
        menuId,
        i,
        day.day_name,
        day.recipe_name,
        JSON.stringify(day.recipe_data || {}),
        day.meal_type || 'dinner',
        day.prep_time_minutes || 30,
        day.cost_index || '€€',
      );
    }

    // Insert shopping items
    if (parsed.shopping_list) {
      const insertItem = db.prepare(`
        INSERT INTO weekmenu_shopping_items (menu_id, product_group, item_name, quantity, for_days, is_perishable, storage_tip)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const group of parsed.shopping_list) {
        for (const item of group.items) {
          insertItem.run(
            menuId,
            group.product_group,
            item.name,
            item.quantity || '',
            JSON.stringify(item.for_days || []),
            item.is_perishable ? 1 : 0,
            item.storage_tip || null,
          );
        }
      }
    }

    return menuId;
  });

  const menuId = insertAll();

  // Generate pantry check immediately
  try {
    generatePantryCheck(menuId);
  } catch (err) {
    logger.error('Pantry check mislukt:', err);
  }

  logger.info(`Menu geïmporteerd: week ${wk}, jaar ${yr}, id ${menuId}`);
  return menuId;
}

module.exports = {
  MenuImportSchema,
  IngredientSchema,
  RecipeSchema,
  DaySchema,
  getISOWeek,
  getTargetWeek,
  importMenu,
};
