const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase } = require('./models/database');
const { logger } = require('./services/logger');
const { authMiddleware, optionalAuth } = require('./middleware/auth');
const { startScheduler } = require('./services/scheduler');

const eventsRouter = require('./routes/events');
const choresRouter = require('./routes/chores');
const mealsRouter = require('./routes/meals');
const shoppingRouter = require('./routes/shopping');
const familyRouter = require('./routes/family');
const settingsRouter = require('./routes/settings');
const authRouter = require('./routes/auth');
const calendarSyncRouter = require('./routes/calendarSync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Public routes
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tablet routes (no auth for kiosk mode)
app.get('/api/tablet/events', optionalAuth, (req, res, next) => {
  req.tabletMode = true;
  next();
}, eventsRouter.getEvents);

app.get('/api/tablet/chores', optionalAuth, (req, res, next) => {
  req.tabletMode = true;
  next();
}, choresRouter.getChores);

app.patch('/api/tablet/chores/:id/toggle', optionalAuth, choresRouter.toggleChore);

app.get('/api/tablet/meals', optionalAuth, (req, res, next) => {
  req.tabletMode = true;
  next();
}, mealsRouter.getMeals);

app.get('/api/tablet/shopping', optionalAuth, (req, res, next) => {
  req.tabletMode = true;
  next();
}, shoppingRouter.getItems);

// Protected routes
app.use('/api/events', authMiddleware, eventsRouter.router);
app.use('/api/chores', authMiddleware, choresRouter.router);
app.use('/api/meals', authMiddleware, mealsRouter.router);
app.use('/api/shopping', authMiddleware, shoppingRouter.router);
app.use('/api/family', authMiddleware, familyRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/calendar-sync', authMiddleware, calendarSyncRouter);

// Error handling
app.use((err, req, res, _next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Interne serverfout',
  });
});

// Initialize and start
async function start() {
  try {
    const dbPath = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace('sqlite://', '')
      : path.join(__dirname, '..', 'data', 'kalender.db');

    initDatabase(dbPath);
    logger.info('Database geïnitialiseerd');

    startScheduler();
    logger.info('Scheduler gestart');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Familiekalender API draait op poort ${PORT}`);
    });
  } catch (error) {
    logger.error('Kan server niet starten:', error);
    process.exit(1);
  }
}

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = { app, start };
