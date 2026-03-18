const { parseCommand, resolveDate } = require('../src/commandParser');

describe('Command Parser', () => {
  test('parses help command', () => {
    expect(parseCommand('help').type).toBe('help');
    expect(parseCommand('?').type).toBe('help');
  });

  test('parses agenda commands', () => {
    const result = parseCommand('agenda vandaag');
    expect(result.type).toBe('agenda');
    expect(result.date).toBe(new Date().toISOString().split('T')[0]);

    const tomorrow = parseCommand('agenda morgen');
    expect(tomorrow.type).toBe('agenda');
    expect(tomorrow.dateLabel).toBe('morgen');
  });

  test('parses agenda without day (defaults to vandaag)', () => {
    const result = parseCommand('agenda');
    expect(result.type).toBe('agenda');
    expect(result.date).toBe(new Date().toISOString().split('T')[0]);
  });

  test('parses add event command', () => {
    const result = parseCommand('voeg toe: Tandarts 14:00 dinsdag');
    expect(result.type).toBe('add_event');
    expect(result.event.title).toContain('Tandarts');
    expect(result.event.start_time).toContain('14:00');
  });

  test('parses add event without time', () => {
    const result = parseCommand('voeg toe: Vergadering');
    expect(result.type).toBe('add_event');
    expect(result.event.title).toBe('Vergadering');
    expect(result.event.start_time).toContain('09:00');
  });

  test('handles end-time overflow at 23:00 correctly', () => {
    const result = parseCommand('voeg toe: Feest 23:30');
    expect(result.type).toBe('add_event');
    expect(result.event.start_time).toContain('23:30');
    // End time should be next day 00:30, not invalid 24:30
    expect(result.event.end_time).not.toContain('24:');
    expect(result.event.end_time).toContain('00:30');
  });

  test('parses shopping add command', () => {
    const result = parseCommand('boodschappen: melk, brood, kaas');
    expect(result.type).toBe('shopping_add');
    expect(result.items).toHaveLength(3);
    expect(result.items[0].name).toBe('melk');
    expect(result.items[1].name).toBe('brood');
    expect(result.items[2].name).toBe('kaas');
  });

  test('parses shopping list command', () => {
    expect(parseCommand('boodschappenlijst').type).toBe('shopping_list');
    expect(parseCommand('boodschappen').type).toBe('shopping_list');
  });

  test('parses meal set command', () => {
    const result = parseCommand('menu woensdag: pasta pesto');
    expect(result.type).toBe('meal_set');
    expect(result.meal.title).toBe('pasta pesto');
    expect(result.meal.meal_type).toBe('dinner');
  });

  test('parses chores status command', () => {
    const result = parseCommand('klusjes vandaag');
    expect(result.type).toBe('chores_status');
    expect(result.date).toBe(new Date().toISOString().split('T')[0]);
  });

  test('returns unknown for unrecognized input', () => {
    expect(parseCommand('willekeurig bericht').type).toBe('unknown');
  });
});

describe('resolveDate', () => {
  test('vandaag returns today', () => {
    expect(resolveDate('vandaag')).toBe(new Date().toISOString().split('T')[0]);
  });

  test('morgen returns tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(resolveDate('morgen')).toBe(tomorrow.toISOString().split('T')[0]);
  });

  test('overmorgen returns day after tomorrow', () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    expect(resolveDate('overmorgen')).toBe(d.toISOString().split('T')[0]);
  });

  test('empty string defaults to today', () => {
    expect(resolveDate('')).toBe(new Date().toISOString().split('T')[0]);
  });
});
