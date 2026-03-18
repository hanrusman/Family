const DAY_MAP = {
  'vandaag': 0, 'morgen': 1, 'overmorgen': 2,
  'maandag': null, 'dinsdag': null, 'woensdag': null,
  'donderdag': null, 'vrijdag': null, 'zaterdag': null, 'zondag': null,
  'ma': null, 'di': null, 'wo': null, 'do': null, 'vr': null, 'za': null, 'zo': null,
};

const DAY_NUMBERS = {
  'maandag': 1, 'dinsdag': 2, 'woensdag': 3, 'donderdag': 4,
  'vrijdag': 5, 'zaterdag': 6, 'zondag': 0,
  'ma': 1, 'di': 2, 'wo': 3, 'do': 4, 'vr': 5, 'za': 6, 'zo': 0,
};

const DAY_LABELS = {
  'vandaag': 'vandaag', 'morgen': 'morgen', 'overmorgen': 'overmorgen',
  'maandag': 'maandag', 'dinsdag': 'dinsdag', 'woensdag': 'woensdag',
  'donderdag': 'donderdag', 'vrijdag': 'vrijdag', 'zaterdag': 'zaterdag', 'zondag': 'zondag',
  'ma': 'maandag', 'di': 'dinsdag', 'wo': 'woensdag', 'do': 'donderdag',
  'vr': 'vrijdag', 'za': 'zaterdag', 'zo': 'zondag',
};

function resolveDate(dayStr) {
  const lower = (dayStr || 'vandaag').toLowerCase().trim();

  if (lower === 'vandaag' || !lower) {
    return new Date().toISOString().split('T')[0];
  }
  if (lower === 'morgen') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (lower === 'overmorgen') {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  const dayNum = DAY_NUMBERS[lower];
  if (dayNum !== undefined) {
    const today = new Date();
    const currentDay = today.getDay();
    let diff = dayNum - currentDay;
    if (diff <= 0) diff += 7;
    today.setDate(today.getDate() + diff);
    return today.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

function parseCommand(text) {
  const lower = text.toLowerCase().trim();

  // Help
  if (lower === 'help' || lower === '?') {
    return { type: 'help' };
  }

  // Agenda
  if (lower.startsWith('agenda')) {
    const dayPart = lower.replace('agenda', '').trim() || 'vandaag';
    return {
      type: 'agenda',
      date: resolveDate(dayPart),
      dateLabel: DAY_LABELS[dayPart.toLowerCase()] || dayPart,
    };
  }

  // Add event: "voeg toe: Tandarts 14:00 dinsdag"
  const addEventMatch = text.match(/^voeg\s+toe:\s*(.+)/i);
  if (addEventMatch) {
    const parts = addEventMatch[1].trim();
    const timeMatch = parts.match(/(\d{1,2}:\d{2})/);
    let title = parts;
    let time = '09:00';

    if (timeMatch) {
      time = timeMatch[1];
      title = parts.replace(timeMatch[0], '').trim();
    }

    // Find day reference
    let date = new Date().toISOString().split('T')[0];
    for (const [dayName] of Object.entries(DAY_NUMBERS)) {
      if (lower.includes(dayName)) {
        date = resolveDate(dayName);
        title = title.replace(new RegExp(dayName, 'i'), '').trim();
        break;
      }
    }
    if (lower.includes('morgen')) {
      date = resolveDate('morgen');
      title = title.replace(/morgen/i, '').trim();
    }

    const [hours, mins] = time.split(':');
    const endHour = String(parseInt(hours) + 1).padStart(2, '0');

    return {
      type: 'add_event',
      event: {
        title: title || 'Afspraak',
        start_time: `${date}T${time}:00`,
        end_time: `${date}T${endHour}:${mins}:00`,
      },
    };
  }

  // Shopping add: "boodschappen: melk, brood, kaas"
  const shopMatch = text.match(/^boodschappen:\s*(.+)/i);
  if (shopMatch) {
    const items = shopMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    return {
      type: 'shopping_add',
      items: items.map((name) => ({ name })),
    };
  }

  // Shopping list
  if (lower === 'boodschappenlijst' || lower === 'boodschappen') {
    return { type: 'shopping_list' };
  }

  // Meal set: "menu woensdag: pasta pesto"
  const mealMatch = text.match(/^menu\s+(\w+):\s*(.+)/i);
  if (mealMatch) {
    const dayStr = mealMatch[1].trim();
    const title = mealMatch[2].trim();
    const date = resolveDate(dayStr);
    return {
      type: 'meal_set',
      meal: { date, meal_type: 'dinner', title },
      dateLabel: DAY_LABELS[dayStr.toLowerCase()] || dayStr,
    };
  }

  // Chores status
  if (lower.startsWith('klusjes')) {
    const dayPart = lower.replace('klusjes', '').trim() || 'vandaag';
    return {
      type: 'chores_status',
      date: resolveDate(dayPart),
      dateLabel: DAY_LABELS[dayPart.toLowerCase()] || dayPart,
    };
  }

  return { type: 'unknown' };
}

module.exports = { parseCommand, resolveDate };
