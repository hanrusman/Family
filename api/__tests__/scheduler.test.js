process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs');
const { initDatabase, closeDatabase, getDb } = require('../src/models/database');
const { generateDailyChores, cleanupShoppingItems } = require('../src/services/scheduler');
const { v4: uuidv4 } = require('uuid');

const TEST_DB = path.join(__dirname, 'test-scheduler.db');

beforeAll(() => {
  initDatabase(TEST_DB);
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  [TEST_DB + '-wal', TEST_DB + '-shm'].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

describe('generateDailyChores', () => {
  let memberId;

  beforeAll(() => {
    const db = getDb();
    memberId = uuidv4();
    db.prepare(`
      INSERT INTO family_members (id, name, role, color) VALUES (?, ?, ?, ?)
    `).run(memberId, 'Test Kind', 'child', '#EF4444');
  });

  afterEach(() => {
    // Clean up instances between tests, keep templates
    const db = getDb();
    db.prepare('DELETE FROM chore_instances').run();
  });

  afterAll(() => {
    const db = getDb();
    db.prepare('DELETE FROM chore_templates').run();
    db.prepare('DELETE FROM family_members WHERE id = ?').run(memberId);
  });

  test('creates instances for daily templates', () => {
    const db = getDb();
    const templateId = uuidv4();
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Tanden poetsen', '🪥', memberId, 'daily', 'before_bed', 1);

    generateDailyChores('2026-03-18');

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(1);
    expect(instances[0].completed).toBe(0);

    // Clean up template
    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('creates instances for weekly templates on matching day', () => {
    const db = getDb();
    const templateId = uuidv4();
    // 2026-03-18 is a Wednesday
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, recurrence_days, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Stofzuigen', '🧹', memberId, 'weekly', 'wednesday', 'after_school', 2);

    generateDailyChores('2026-03-18'); // Wednesday

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(1);

    // Clean up template
    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('does NOT create instances for weekly templates on non-matching day', () => {
    const db = getDb();
    const templateId = uuidv4();
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, recurrence_days, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Was ophangen', '👕', memberId, 'weekly', 'monday', 'after_school', 2);

    generateDailyChores('2026-03-18'); // Wednesday, not Monday

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(0);

    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('creates instances for specific_days templates on matching day', () => {
    const db = getDb();
    const templateId = uuidv4();
    // 2026-03-18 is Wednesday
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, recurrence_days, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Muziekles', '🎵', memberId, 'specific_days', 'monday,wednesday,friday', 'after_school', 1);

    generateDailyChores('2026-03-18'); // Wednesday

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(1);

    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('does NOT create instances for specific_days on non-matching day', () => {
    const db = getDb();
    const templateId = uuidv4();
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, recurrence_days, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Zwemles', '🏊', memberId, 'specific_days', 'tuesday,thursday', 'after_school', 1);

    generateDailyChores('2026-03-18'); // Wednesday

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(0);

    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('does NOT create duplicate instances for same date', () => {
    const db = getDb();
    const templateId = uuidv4();
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Afwassen', '🍽️', memberId, 'daily', 'anytime', 1);

    generateDailyChores('2026-03-18');
    generateDailyChores('2026-03-18'); // Run again - should not duplicate

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    expect(instances).toHaveLength(1);

    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });

  test('creates instances for multiple templates at once', () => {
    const db = getDb();
    const id1 = uuidv4();
    const id2 = uuidv4();
    const id3 = uuidv4();

    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id1, 'Klusje 1', '📋', memberId, 'daily', 'anytime', 1);
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id2, 'Klusje 2', '📋', memberId, 'daily', 'anytime', 1);
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id3, 'Klusje 3', '📋', memberId, 'daily', 'anytime', 1);

    generateDailyChores('2026-03-18');

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE date = ?'
    ).all('2026-03-18');

    expect(instances).toHaveLength(3);

    db.prepare('DELETE FROM chore_templates WHERE id IN (?, ?, ?)').run(id1, id2, id3);
  });

  test('handles no templates gracefully', () => {
    const db = getDb();
    // Ensure no templates exist
    db.prepare('DELETE FROM chore_templates').run();

    // Should not throw
    expect(() => generateDailyChores('2026-03-18')).not.toThrow();

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE date = ?'
    ).all('2026-03-18');
    expect(instances).toHaveLength(0);
  });

  test('weekly template without recurrence_days defaults to matching', () => {
    const db = getDb();
    const templateId = uuidv4();
    // Weekly with no recurrence_days specified - should still create
    db.prepare(`
      INSERT INTO chore_templates (id, title, icon, member_id, recurrence, time_of_day, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(templateId, 'Default Weekly', '📅', memberId, 'weekly', 'anytime', 1);

    generateDailyChores('2026-03-18');

    const instances = db.prepare(
      'SELECT * FROM chore_instances WHERE template_id = ? AND date = ?'
    ).all(templateId, '2026-03-18');

    // With no recurrence_days the code checks: !template.recurrence_days || includes(todayName)
    // null is falsy, so shouldCreate = true
    expect(instances).toHaveLength(1);

    db.prepare('DELETE FROM chore_templates WHERE id = ?').run(templateId);
  });
});

describe('cleanupShoppingItems', () => {
  afterEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM shopping_items').run();
  });

  test('removes checked items older than 24 hours', () => {
    const db = getDb();
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

    db.prepare(`
      INSERT INTO shopping_items (id, name, category, checked, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Oude Melk', 'zuivel', 1, oldTime);

    db.prepare(`
      INSERT INTO shopping_items (id, name, category, checked, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Oud Brood', 'brood', 1, oldTime);

    cleanupShoppingItems();

    const remaining = db.prepare('SELECT COUNT(*) as count FROM shopping_items').get();
    expect(remaining.count).toBe(0);
  });

  test('does NOT remove checked items younger than 24 hours', () => {
    const db = getDb();
    const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago

    db.prepare(`
      INSERT INTO shopping_items (id, name, category, checked, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Recent Melk', 'zuivel', 1, recentTime);

    cleanupShoppingItems();

    const remaining = db.prepare('SELECT COUNT(*) as count FROM shopping_items').get();
    expect(remaining.count).toBe(1);
  });

  test('does NOT remove unchecked items', () => {
    const db = getDb();
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO shopping_items (id, name, category, checked, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Unchecked Item', 'overig', 0, null);

    // Also add an old checked item to verify selectivity
    db.prepare(`
      INSERT INTO shopping_items (id, name, category, checked, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Old Checked', 'overig', 1, oldTime);

    cleanupShoppingItems();

    const remaining = db.prepare('SELECT * FROM shopping_items').all();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Unchecked Item');
  });

  test('handles empty shopping list gracefully', () => {
    expect(() => cleanupShoppingItems()).not.toThrow();
  });
});
