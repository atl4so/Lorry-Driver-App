const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  if (req.user.role === 'admin') {
    const deliveries = db
      .prepare(`
        SELECT d.id, d.title, d.origin, d.destination, d.scheduled_date, d.notes,
               group_concat(u.name || ':' || da.status) AS assignments
        FROM deliveries d
        LEFT JOIN delivery_assignments da ON da.delivery_id = d.id
        LEFT JOIN users u ON u.id = da.driver_id
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `)
      .all()
      .map((delivery) => ({
        ...delivery,
        assignments: delivery.assignments
          ? delivery.assignments.split(',').map((entry) => {
              const [name, status] = entry.split(':');
              return { name, status };
            })
          : []
      }));
    return res.json(deliveries);
  }

  if (req.user.role === 'driver') {
    const deliveries = db
      .prepare(`
        SELECT d.id, d.title, d.origin, d.destination, d.scheduled_date, d.notes, da.status
        FROM deliveries d
        INNER JOIN delivery_assignments da ON da.delivery_id = d.id
        WHERE da.driver_id = ?
        ORDER BY da.assigned_at DESC
      `)
      .all(req.user.id);
    return res.json(deliveries);
  }

  return res.status(403).json({ message: 'Unsupported role' });
});

router.post('/', requireRole('admin'), (req, res) => {
  const { title, origin, destination, scheduledDate, notes } = req.body;
  if (!title || !origin || !destination) {
    return res.status(400).json({ message: 'Title, origin and destination are required' });
  }

  const delivery = {
    id: uuidv4(),
    title,
    origin,
    destination,
    scheduled_date: scheduledDate || null,
    notes: notes || null
  };

  db.prepare(
    `INSERT INTO deliveries (id, title, origin, destination, scheduled_date, notes)
     VALUES (@id, @title, @origin, @destination, @scheduled_date, @notes)`
  ).run(delivery);

  res.status(201).json(delivery);
});

router.post('/:id/assign', requireRole('admin'), (req, res) => {
  const { driverId } = req.body;
  const deliveryId = req.params.id;
  if (!driverId) {
    return res.status(400).json({ message: 'driverId is required' });
  }

  const delivery = db.prepare('SELECT id FROM deliveries WHERE id = ?').get(deliveryId);
  if (!delivery) {
    return res.status(404).json({ message: 'Delivery not found' });
  }

  const driver = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'driver'").get(driverId);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const existingAssignment = db
    .prepare('SELECT id FROM delivery_assignments WHERE delivery_id = ? AND driver_id = ?')
    .get(deliveryId, driverId);
  if (existingAssignment) {
    return res.status(400).json({ message: 'Delivery already assigned to this driver' });
  }

  const assignment = {
    id: uuidv4(),
    delivery_id: deliveryId,
    driver_id: driverId,
    status: 'pending'
  };

  db.prepare(
    'INSERT INTO delivery_assignments (id, delivery_id, driver_id, status) VALUES (@id, @delivery_id, @driver_id, @status)'
  ).run(assignment);

  res.status(201).json({ message: 'Delivery assigned', assignment });
});

module.exports = router;
