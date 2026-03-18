const jwt = require('jsonwebtoken');
const { getDb } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authenticatie vereist' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Ongeldig token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

function generateToken(memberId, role) {
  return jwt.sign({ memberId, role }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authMiddleware, optionalAuth, generateToken, JWT_SECRET };
