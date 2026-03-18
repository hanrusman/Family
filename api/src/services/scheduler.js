const cron = require('node-cron');
const { getDb } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

function startScheduler() {
  // Generate daily chore instances at midnight
  cron.schedule('0 0 * * *', () => {
    generateDailyChores();
  });

  // Clean up old checked shopping items (older than 24h)
  cron.schedule('0 2 * * *', () => {
    cleanupShoppingItems();
  });

  // Generate today's chores on startup
  generateDailyChores();
}

function generateDailyChores(targetDate) {
  try {
    const db = getDb();
    const today = targetDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(today).getDay(); // 0=Sun, 1=Mon, ...
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek];

    const templates = db.prepare('SELECT * FROM chore_templates').all();

    const insert = db.prepare(`
      INSERT OR IGNORE INTO chore_instances (id, template_id, date)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction(() => {
      for (const template of templates) {
        let shouldCreate = false;

        if (template.recurrence === 'daily') {
          shouldCreate = true;
        } else if (template.recurrence === 'weekly') {
          // Default to Monday for weekly
          if (!template.recurrence_days || template.recurrence_days.includes(todayName)) {
            shouldCreate = true;
          }
        } else if (template.recurrence === 'specific_days') {
          if (template.recurrence_days && template.recurrence_days.includes(todayName)) {
            shouldCreate = true;
          }
        }

        if (shouldCreate) {
          insert.run(uuidv4(), template.id, today);
        }
      }
    });

    insertMany();
    logger.info(`Klusjes gegenereerd voor ${today}`);
  } catch (error) {
    logger.error('Fout bij genereren klusjes:', error);
  }
}

function cleanupShoppingItems() {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(
      'DELETE FROM shopping_items WHERE checked = 1 AND checked_at < ?'
    ).run(cutoff);
    logger.info(`${result.changes} afgevinkte boodschappen opgeruimd`);
  } catch (error) {
    logger.error('Fout bij opruimen boodschappen:', error);
  }
}

module.exports = { startScheduler, generateDailyChores, cleanupShoppingItems };
