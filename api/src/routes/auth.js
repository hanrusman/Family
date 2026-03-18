const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../models/database');
const { generateToken, JWT_SECRET } = require('../middleware/auth');
const { logger } = require('../services/logger');
const router = express.Router();

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  // Clean up expired lockouts
  if (record.lockedUntil && now > record.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  record.count++;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    logger.warn(`Login geblokkeerd voor IP ${ip} na ${MAX_ATTEMPTS} pogingen`);
  }

  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// POST /api/auth/login - Login met PIN
router.post('/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Te veel pogingen. Probeer het over ${rateCheck.remainingSeconds} seconden opnieuw.`,
    });
  }

  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is vereist' });
  }

  const db = getDb();
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin');
  const correctPin = setting ? setting.value : '1234';

  if (pin !== correctPin) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Onjuiste PIN' });
  }

  clearAttempts(ip);

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
