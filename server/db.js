const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','driver')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    scheduled_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS delivery_assignments (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY(driver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    total_distance REAL DEFAULT 0,
    total_duration REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ongoing',
    FOREIGN KEY(driver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trip_deliveries (
    trip_id TEXT NOT NULL,
    delivery_id TEXT NOT NULL,
    PRIMARY KEY (trip_id, delivery_id),
    FOREIGN KEY(trip_id) REFERENCES trips(id),
    FOREIGN KEY(delivery_id) REFERENCES deliveries(id)
  );

  CREATE TABLE IF NOT EXISTS trip_points (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    distance_from_last REAL DEFAULT 0,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  );
`);

function ensureSeedData() {
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  if (adminCount.count === 0) {
    const adminId = uuidv4();
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (@id, @name, @email, @password_hash, @role)
    `).run({
      id: adminId,
      name: 'Fleet Admin',
      email: 'admin@example.com',
      password_hash: passwordHash,
      role: 'admin'
    });
  }

  const driverCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get();
  if (driverCount.count === 0) {
    const driverId = uuidv4();
    const passwordHash = bcrypt.hashSync('driver123', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (@id, @name, @email, @password_hash, @role)
    `).run({
      id: driverId,
      name: 'Alex Driver',
      email: 'driver@example.com',
      password_hash: passwordHash,
      role: 'driver'
    });
  }
}

ensureSeedData();

module.exports = db;
