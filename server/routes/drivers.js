const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole('admin'), (req, res) => {
  const drivers = db
    .prepare(`
      SELECT id, name, email, created_at
      FROM users
      WHERE role = 'driver'
      ORDER BY created_at DESC
    `)
    .all();
  res.json(drivers);
});

router.post('/', requireRole('admin'), (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const driver = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role: 'driver'
  };

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (@id, @name, @email, @password_hash, @role)'
  ).run(driver);

  res.status(201).json({ id: driver.id, name: driver.name, email: driver.email });
});

module.exports = router;
