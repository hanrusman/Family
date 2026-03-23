const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  migrateSchema();
  seedDefaults();

  return db;
}

function getDb() {
  if (!db) throw new Error('Database niet geïnitialiseerd');
  return db;
}

function createTables() {
  db.exec(`
    -- Gezinsleden
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('adult', 'child')),
      color TEXT NOT NULL DEFAULT '#3B82F6',
      avatar TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Agenda events
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      location TEXT,
      member_id TEXT,
      external_id TEXT,
      calendar_source TEXT,
      recurrence_rule TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Klusjes templates
    CREATE TABLE IF NOT EXISTS chore_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT DEFAULT '📋',
      role_title TEXT,
      member_id TEXT,
      recurrence TEXT NOT NULL DEFAULT 'daily',
      recurrence_days TEXT,
      time_of_day TEXT DEFAULT 'anytime',
      points INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Klusjes instanties (per dag)
    CREATE TABLE IF NOT EXISTS chore_instances (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      completed_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES chore_templates(id) ON DELETE CASCADE,
      UNIQUE(template_id, date)
    );

    -- Recepten
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ingredients TEXT,
      instructions TEXT,
      servings INTEGER DEFAULT 4,
      prep_time INTEGER,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Maaltijdplanning
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
      title TEXT NOT NULL,
      recipe_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
      UNIQUE(date, meal_type)
    );

    -- Boodschappenlijst
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity TEXT,
      category TEXT DEFAULT 'overig',
      checked INTEGER DEFAULT 0,
      checked_at TEXT,
      added_by TEXT,
      meal_plan_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE SET NULL
    );

    -- Kalender koppelingen
    CREATE TABLE IF NOT EXISTS calendar_connections (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'proton', 'caldav')),
      name TEXT NOT NULL,
      credentials TEXT,
      sync_token TEXT,
      last_sync TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Instellingen
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Weekmenu's
    CREATE TABLE IF NOT EXISTS weekly_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'archived')),
      shopping_list TEXT,
      snack_suggestions TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week_number, year)
    );

    -- Weekmenu dagmenu's
    CREATE TABLE IF NOT EXISTS menu_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      recipe_name TEXT NOT NULL,
      recipe_data TEXT,
      meal_type TEXT,
      prep_time_minutes INTEGER,
      cost_index TEXT DEFAULT '€',
      status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed', 'approved', 'completed')),
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY (menu_id) REFERENCES weekly_menus(id) ON DELETE CASCADE
    );

    -- Weekmenu boodschappen
    CREATE TABLE IF NOT EXISTS weekmenu_shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      product_group TEXT,
      item_name TEXT NOT NULL,
      quantity TEXT,
      for_days TEXT,
      is_perishable INTEGER DEFAULT 0,
      checked INTEGER DEFAULT 0,
      storage_tip TEXT,
      FOREIGN KEY (menu_id) REFERENCES weekly_menus(id) ON DELETE CASCADE
    );

    -- Voorraadcheck
    CREATE TABLE IF NOT EXISTS pantry_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity TEXT,
      needed_for_days TEXT,
      should_have INTEGER DEFAULT 1,
      have_it INTEGER DEFAULT 0,
      FOREIGN KEY (menu_id) REFERENCES weekly_menus(id) ON DELETE CASCADE
    );

    -- Maaltijd feedback
    CREATE TABLE IF NOT EXISTS day_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL UNIQUE,
      rating TEXT CHECK(rating IN ('lekker', 'ok', 'minder')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (day_id) REFERENCES menu_days(id) ON DELETE CASCADE
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_member ON events(member_id);
    CREATE INDEX IF NOT EXISTS idx_chore_instances_date ON chore_instances(date);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
    CREATE INDEX IF NOT EXISTS idx_shopping_checked ON shopping_items(checked);
    CREATE INDEX IF NOT EXISTS idx_menu_days_menu ON menu_days(menu_id);
    CREATE INDEX IF NOT EXISTS idx_wmenu_shopping_menu ON weekmenu_shopping_items(menu_id);
    CREATE INDEX IF NOT EXISTS idx_pantry_menu ON pantry_check(menu_id);
  `);
}

function migrateSchema() {
  // Add role_title column to chore_templates if it doesn't exist
  const cols = db.prepare("PRAGMA table_info(chore_templates)").all();
  if (!cols.find(c => c.name === 'role_title')) {
    db.exec("ALTER TABLE chore_templates ADD COLUMN role_title TEXT");
  }
}

function seedDefaults() {
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const defaults = {
      'theme': 'dark',
      'language': 'nl',
      'idle_timeout': '5',
      'default_view': 'week',
      'day_start_hour': '6',
      'day_end_hour': '22',
      'pin': '1234',
      'whatsapp_enabled': 'false',
      'morning_briefing_time': '07:00',
      'calendar_sync_interval': '5',
    };

    const insertMany = db.transaction(() => {
      for (const [key, value] of Object.entries(defaults)) {
        insertSetting.run(key, value);
      }
    });
    insertMany();
  }
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };
