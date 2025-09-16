const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { haversineDistance } = require('../utils/distance');

const router = express.Router();

router.use(authenticate);

function getTripById(tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) {
    return null;
  }
  const deliveries = db
    .prepare(
      `SELECT d.id, d.title, d.origin, d.destination
       FROM trip_deliveries td
       INNER JOIN deliveries d ON d.id = td.delivery_id
       WHERE td.trip_id = ?`
    )
    .all(tripId);
  const points = db
    .prepare(
      `SELECT id, latitude, longitude, recorded_at as recordedAt, distance_from_last as distanceFromLast
       FROM trip_points
       WHERE trip_id = ?
       ORDER BY recorded_at ASC`
    )
    .all(tripId);

  const totalDeliveries = db
    .prepare('SELECT COUNT(*) as count FROM trip_deliveries WHERE trip_id = ?')
    .get(tripId).count;

  return {
    ...trip,
    deliveries,
    points,
    totalDeliveries
  };
}

router.get('/active', (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Only drivers can view active trips' });
  }

  const trip = db
    .prepare('SELECT * FROM trips WHERE driver_id = ? AND status = "ongoing" ORDER BY started_at DESC LIMIT 1')
    .get(req.user.id);

  if (!trip) {
    return res.json(null);
  }

  return res.json(getTripById(trip.id));
});

router.post('/start', (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Only drivers can start trips' });
  }

  const { deliveryIds = [] } = req.body;
  const driverId = req.user.id;

  const activeTrip = db
    .prepare('SELECT id FROM trips WHERE driver_id = ? AND status = "ongoing"')
    .get(driverId);
  if (activeTrip) {
    return res.status(400).json({ message: 'An active trip is already running' });
  }

  const tripId = uuidv4();
  const startedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO trips (id, driver_id, started_at, status)
     VALUES (?, ?, ?, 'ongoing')`
  ).run(tripId, driverId, startedAt);

  const deliveryInsert = db.prepare('INSERT OR IGNORE INTO trip_deliveries (trip_id, delivery_id) VALUES (?, ?)');
  const updateAssignment = db.prepare(
    `UPDATE delivery_assignments SET status = 'in_progress'
     WHERE delivery_id = ? AND driver_id = ?`
  );

  deliveryIds.forEach((deliveryId) => {
    deliveryInsert.run(tripId, deliveryId);
    updateAssignment.run(deliveryId, driverId);
  });

  res.status(201).json(getTripById(tripId));
});

router.post('/:tripId/location', (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Only drivers can log location points' });
  }

  const { latitude, longitude, recordedAt } = req.body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ?').get(req.params.tripId, req.user.id);
  if (!trip || trip.status !== 'ongoing') {
    return res.status(400).json({ message: 'Trip is not active' });
  }

  const lastPoint = db
    .prepare(
      'SELECT latitude, longitude, recorded_at as recordedAt FROM trip_points WHERE trip_id = ? ORDER BY recorded_at DESC LIMIT 1'
    )
    .get(req.params.tripId);

  const point = {
    id: uuidv4(),
    trip_id: req.params.tripId,
    latitude,
    longitude,
    recorded_at: recordedAt || new Date().toISOString()
  };

  let distanceFromLast = 0;
  if (lastPoint) {
    distanceFromLast = haversineDistance(
      { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
      { latitude, longitude }
    );
  }

  db.prepare(
    `INSERT INTO trip_points (id, trip_id, latitude, longitude, recorded_at, distance_from_last)
     VALUES (@id, @trip_id, @latitude, @longitude, @recorded_at, @distance_from_last)`
  ).run({ ...point, distance_from_last: distanceFromLast });

  if (distanceFromLast > 0) {
    db.prepare('UPDATE trips SET total_distance = total_distance + ? WHERE id = ?').run(distanceFromLast, req.params.tripId);
  }

  const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
  const updatedDuration =
    (new Date(point.recorded_at).getTime() - new Date(updatedTrip.started_at).getTime()) / 1000;
  db.prepare('UPDATE trips SET total_duration = ? WHERE id = ?').run(updatedDuration, req.params.tripId);

  res.status(201).json({ message: 'Point stored', distanceFromLast });
});

router.post('/:tripId/stop', (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Only drivers can stop trips' });
  }

  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ?').get(req.params.tripId, req.user.id);
  if (!trip || trip.status !== 'ongoing') {
    return res.status(400).json({ message: 'Trip is not active' });
  }

  const endedAt = new Date().toISOString();
  const totalDuration = (new Date(endedAt).getTime() - new Date(trip.started_at).getTime()) / 1000;

  db.prepare(
    `UPDATE trips
     SET status = 'completed', ended_at = ?, total_duration = ?
     WHERE id = ?`
  ).run(endedAt, totalDuration, req.params.tripId);

  const deliveryIds = db
    .prepare('SELECT delivery_id FROM trip_deliveries WHERE trip_id = ?')
    .all(req.params.tripId)
    .map((row) => row.delivery_id);

  if (deliveryIds.length > 0) {
    const placeholders = deliveryIds.map(() => '?').join(',');
    db.prepare(
      `UPDATE delivery_assignments
       SET status = 'completed'
       WHERE driver_id = ? AND delivery_id IN (${placeholders})`
    ).run(req.user.id, ...deliveryIds);
  }

  res.json(getTripById(req.params.tripId));
});

router.get('/', (req, res) => {
  if (req.user.role === 'driver') {
    const trips = db
      .prepare(
        `SELECT id FROM trips WHERE driver_id = ? ORDER BY started_at DESC`
      )
      .all(req.user.id)
      .map((row) => getTripById(row.id));
    return res.json(trips);
  }

  if (req.user.role === 'admin') {
    const { driverId } = req.query;
    const rows = driverId
      ? db.prepare('SELECT id FROM trips WHERE driver_id = ? ORDER BY started_at DESC').all(driverId)
      : db.prepare('SELECT id FROM trips ORDER BY started_at DESC').all();
    const trips = rows.map((row) => {
      const trip = getTripById(row.id);
      const driver = db.prepare('SELECT name, email FROM users WHERE id = ?').get(trip.driver_id);
      return {
        ...trip,
        driver
      };
    });
    return res.json(trips);
  }

  return res.status(403).json({ message: 'Unsupported role' });
});

router.get('/:tripId', (req, res) => {
  const trip = getTripById(req.params.tripId);
  if (!trip) {
    return res.status(404).json({ message: 'Trip not found' });
  }

  if (req.user.role === 'driver' && trip.driver_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(trip);
});

module.exports = router;
