const express = require('express');
const { getDb } = require('../models/database');
const { generateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/login - Login met PIN
router.post('/login', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is vereist' });
  }

  const db = getDb();
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
  const correctPin = setting ? setting.value : '1234';

  if (pin !== correctPin) {
    return res.status(401).json({ error: 'Onjuiste PIN' });
  }

  // Get first adult member as default user
  const member = db.prepare(
    "SELECT * FROM family_members WHERE role = 'adult' ORDER BY sort_order LIMIT 1"
  ).get();

  const token = generateToken(member?.id || 'admin', 'adult');

  res.json({
    token,
    member: member || { id: 'admin', name: 'Admin', role: 'adult' },
  });
});

// POST /api/auth/verify - Controleer of token geldig is
router.post('/verify', (req, res) => {
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is vereist' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;
