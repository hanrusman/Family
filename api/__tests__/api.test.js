const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../src/index');
const { initDatabase, closeDatabase, getDb } = require('../src/models/database');
const { generateToken } = require('../src/middleware/auth');

let token;
const TEST_DB = path.join(__dirname, 'test-kalender.db');

beforeAll(() => {
  initDatabase(TEST_DB);
  token = generateToken('test-admin', 'adult');
});

afterAll(() => {
  closeDatabase();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  // Clean up WAL files
  [TEST_DB + '-wal', TEST_DB + '-shm'].forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

function authGet(url) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}
function authPost(url, body) {
  return request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
}
function authPut(url, body) {
  return request(app).put(url).set('Authorization', `Bearer ${token}`).send(body);
}
function authDelete(url) {
  return request(app).delete(url).set('Authorization', `Bearer ${token}`);
}

// ---- Health ----
describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ---- Auth ----
describe('Auth', () => {
  test('POST /api/auth/login with correct PIN', async () => {
    const res = await request(app).post('/api/auth/login').send({ pin: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login with wrong PIN', async () => {
    const res = await request(app).post('/api/auth/login').send({ pin: '0000' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/verify with valid token', async () => {
    const res = await request(app).post('/api/auth/verify').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  test('Protected route without token returns 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});

// ---- Family Members ----
describe('Family Members', () => {
  let memberId;

  test('POST /api/family creates member', async () => {
    const res = await authPost('/api/family', {
      name: 'Papa',
      role: 'adult',
      color: '#3B82F6',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Papa');
    memberId = res.body.id;
  });

  test('GET /api/family lists members', async () => {
    const res = await authGet('/api/family');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('PUT /api/family/:id updates member', async () => {
    const res = await authPut(`/api/family/${memberId}`, { name: 'Vader' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Vader');
  });

  test('POST /api/family child member', async () => {
    const res = await authPost('/api/family', {
      name: 'Kind1',
      role: 'child',
      color: '#EF4444',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('child');
  });
});

// ---- Events ----
describe('Events', () => {
  let eventId;

  test('POST /api/events creates event', async () => {
    const res = await authPost('/api/events', {
      title: 'Tandarts',
      start_time: '2026-03-20T14:00:00',
      end_time: '2026-03-20T15:00:00',
      location: 'Amsterdam',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Tandarts');
    eventId = res.body.id;
  });

  test('GET /api/events with date range', async () => {
    const res = await authGet('/api/events?start=2026-03-20&end=2026-03-21');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('PUT /api/events/:id updates event', async () => {
    const res = await authPut(`/api/events/${eventId}`, {
      title: 'Tandarts - controle',
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tandarts - controle');
  });

  test('DELETE /api/events/:id deletes event', async () => {
    const res = await authDelete(`/api/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE nonexistent event returns 404', async () => {
    const res = await authDelete('/api/events/nonexistent');
    expect(res.status).toBe(404);
  });

  test('POST /api/events without title returns 400', async () => {
    const res = await authPost('/api/events', {
      start_time: '2026-03-20T14:00:00',
      end_time: '2026-03-20T15:00:00',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/tablet/events works without auth', async () => {
    const res = await request(app).get('/api/tablet/events?start=2026-03-20&end=2026-03-21');
    expect(res.status).toBe(200);
  });
});

// ---- Chores ----
describe('Chores', () => {
  let templateId;

  test('POST /api/chores/templates creates template', async () => {
    const db = getDb();
    const member = db.prepare("SELECT id FROM family_members WHERE role = 'child' LIMIT 1").get();

    const res = await authPost('/api/chores/templates', {
      title: 'Kamer opruimen',
      icon: '🛏️',
      member_id: member?.id || null,
      recurrence: 'daily',
      time_of_day: 'after_school',
      points: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Kamer opruimen');
    templateId = res.body.id;
  });

  test('GET /api/chores/templates lists templates', async () => {
    const res = await authGet('/api/chores/templates');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/chores returns chores for today', async () => {
    // Generate chores for today first
    const { generateDailyChores } = require('../src/services/scheduler');
    generateDailyChores();

    const today = new Date().toISOString().split('T')[0];
    const res = await authGet(`/api/chores?date=${today}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('PATCH /api/chores/:id/toggle toggles chore', async () => {
    const today = new Date().toISOString().split('T')[0];
    const chores = await authGet(`/api/chores?date=${today}`);
    const choreId = chores.body[0].id;

    const res = await request(app)
      .patch(`/api/chores/${choreId}/toggle`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(1);

    // Toggle back
    const res2 = await request(app)
      .patch(`/api/chores/${choreId}/toggle`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.completed).toBe(0);
  });

  test('GET /api/chores/stats returns statistics', async () => {
    const res = await authGet('/api/chores/stats');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('DELETE /api/chores/templates/:id deletes template', async () => {
    const res = await authDelete(`/api/chores/templates/${templateId}`);
    expect(res.status).toBe(200);
  });
});

// ---- Meals ----
describe('Meals', () => {
  let mealId;
  let recipeId;

  test('POST /api/meals creates meal plan', async () => {
    const res = await authPost('/api/meals', {
      date: '2026-03-20',
      meal_type: 'dinner',
      title: 'Spaghetti Bolognese',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Spaghetti Bolognese');
    mealId = res.body.id;
  });

  test('GET /api/meals with date range', async () => {
    const res = await authGet('/api/meals?start=2026-03-18&end=2026-03-24');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('PUT /api/meals/:id updates meal', async () => {
    const res = await authPut(`/api/meals/${mealId}`, { title: 'Lasagne' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Lasagne');
  });

  test('POST /api/meals/recipes creates recipe', async () => {
    const res = await authPost('/api/meals/recipes', {
      title: 'Pasta Pesto',
      ingredients: 'pasta, pesto, parmezaan',
      servings: 4,
    });
    expect(res.status).toBe(201);
    recipeId = res.body.id;
  });

  test('GET /api/meals/recipes lists recipes', async () => {
    const res = await authGet('/api/meals/recipes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('DELETE /api/meals/:id deletes meal', async () => {
    const res = await authDelete(`/api/meals/${mealId}`);
    expect(res.status).toBe(200);
  });
});

// ---- Shopping ----
describe('Shopping', () => {
  let itemId;

  test('POST /api/shopping creates item', async () => {
    const res = await authPost('/api/shopping', { name: 'Melk', category: 'zuivel' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Melk');
    itemId = res.body.id;
  });

  test('POST /api/shopping/bulk creates multiple items', async () => {
    const res = await authPost('/api/shopping/bulk', {
      items: [
        { name: 'Brood', category: 'brood_bakkerij' },
        { name: 'Kaas', category: 'zuivel' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
  });

  test('GET /api/shopping returns grouped items', async () => {
    const res = await authGet('/api/shopping');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.grouped.length).toBeGreaterThan(0);
  });

  test('PATCH /api/shopping/:id/toggle checks item', async () => {
    const res = await request(app)
      .patch(`/api/shopping/${itemId}/toggle`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.checked).toBe(1);
  });

  test('DELETE /api/shopping/checked/clear removes checked', async () => {
    const res = await authDelete('/api/shopping/checked/clear');
    expect(res.status).toBe(200);
    expect(res.body.removed).toBeGreaterThan(0);
  });

  test('GET /api/tablet/shopping works without auth', async () => {
    const res = await request(app).get('/api/tablet/shopping');
    expect(res.status).toBe(200);
  });
});

// ---- Settings ----
describe('Settings', () => {
  test('GET /api/settings returns settings', async () => {
    const res = await authGet('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.theme).toBeDefined();
    expect(res.body.pin).toBeDefined();
  });

  test('PUT /api/settings updates settings', async () => {
    const res = await authPut('/api/settings', { theme: 'light' });
    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('light');
  });

  test('PUT /api/settings/pin changes pin', async () => {
    const res = await authPut('/api/settings/pin', {
      current_pin: '1234',
      new_pin: '5678',
    });
    expect(res.status).toBe(200);

    // Change back
    await authPut('/api/settings/pin', {
      current_pin: '5678',
      new_pin: '1234',
    });
  });

  test('PUT /api/settings/pin with wrong current pin', async () => {
    const res = await authPut('/api/settings/pin', {
      current_pin: '0000',
      new_pin: '9999',
    });
    expect(res.status).toBe(401);
  });
});
