import { useEffect, useMemo, useState } from 'react';
import RouteMap from '../components/driver/RouteMap.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { parseResponse } from '../utils/http.js';
import { formatDateTime, formatDistance, formatDuration } from '../utils/format.js';

function AdminDashboard() {
  const { authFetch } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [deliveryForm, setDeliveryForm] = useState({
    title: '',
    origin: '',
    destination: '',
    scheduledDate: '',
    notes: ''
  });
  const [assignment, setAssignment] = useState({ deliveryId: '', driverId: '' });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [driverData, deliveryData, tripData] = await Promise.all([
        authFetch('/api/drivers').then(parseResponse),
        authFetch('/api/deliveries').then(parseResponse),
        authFetch('/api/trips').then(parseResponse)
      ]);
      setDrivers(driverData);
      setDeliveries(deliveryData);
      setTrips(tripData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedTrip) return;
    const updated = trips.find((trip) => trip.id === selectedTrip.id);
    if (updated && updated !== selectedTrip) {
      setSelectedTrip(updated);
    }
  }, [trips, selectedTrip]);

  const handleDriverSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await authFetch('/api/drivers', {
        method: 'POST',
        body: JSON.stringify(driverForm)
      }).then(parseResponse);
      setDriverForm({ name: '', email: '', password: '' });
      setInfo('Driver account created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeliverySubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await authFetch('/api/deliveries', {
        method: 'POST',
        body: JSON.stringify(deliveryForm)
      }).then(parseResponse);
      setDeliveryForm({ title: '', origin: '', destination: '', scheduledDate: '', notes: '' });
      setInfo('Delivery created.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignment = async (event) => {
    event.preventDefault();
    if (!assignment.deliveryId || !assignment.driverId) {
      setError('Choose a delivery and driver to assign.');
      return;
    }
    setError(null);
    setInfo(null);
    try {
      await authFetch(`/api/deliveries/${assignment.deliveryId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ driverId: assignment.driverId })
      }).then(parseResponse);
      setAssignment({ deliveryId: '', driverId: '' });
      setInfo('Delivery assigned to driver.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const totals = useMemo(
    () => ({
      trips: trips.length,
      distance: trips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0),
      deliveries: trips.reduce((sum, trip) => sum + (trip.totalDeliveries || 0), 0)
    }),
    [trips]
  );

  return (
    <div className="grid gap">
      {loading && <div className="card">Loading fleet overview…</div>}
      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <section className="card">
        <h2>Drivers</h2>
        <form className="form-grid" onSubmit={handleDriverSubmit}>
          <label htmlFor="driver-name">Name</label>
          <input
            id="driver-name"
            name="name"
            value={driverForm.name}
            onChange={(event) => setDriverForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <label htmlFor="driver-email">Email</label>
          <input
            id="driver-email"
            name="email"
            type="email"
            value={driverForm.email}
            onChange={(event) => setDriverForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <label htmlFor="driver-password">Password</label>
          <input
            id="driver-password"
            name="password"
            type="password"
            value={driverForm.password}
            onChange={(event) => setDriverForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
          <button type="submit">Create driver</button>
        </form>
        <ul className="simple-list">
          {drivers.map((driver) => (
            <li key={driver.id}>
              <strong>{driver.name}</strong> – {driver.email}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Deliveries</h2>
        <form className="form-grid" onSubmit={handleDeliverySubmit}>
          <label htmlFor="delivery-title">Title</label>
          <input
            id="delivery-title"
            name="title"
            value={deliveryForm.title}
            onChange={(event) => setDeliveryForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <label htmlFor="delivery-origin">Origin</label>
          <input
            id="delivery-origin"
            name="origin"
            value={deliveryForm.origin}
            onChange={(event) => setDeliveryForm((prev) => ({ ...prev, origin: event.target.value }))}
            required
          />
          <label htmlFor="delivery-destination">Destination</label>
          <input
            id="delivery-destination"
            name="destination"
            value={deliveryForm.destination}
            onChange={(event) => setDeliveryForm((prev) => ({ ...prev, destination: event.target.value }))}
            required
          />
          <label htmlFor="delivery-date">Scheduled date</label>
          <input
            id="delivery-date"
            name="scheduledDate"
            type="datetime-local"
            value={deliveryForm.scheduledDate}
            onChange={(event) => setDeliveryForm((prev) => ({ ...prev, scheduledDate: event.target.value }))}
          />
          <label htmlFor="delivery-notes">Notes</label>
          <textarea
            id="delivery-notes"
            name="notes"
            rows="2"
            value={deliveryForm.notes}
            onChange={(event) => setDeliveryForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <button type="submit">Create delivery</button>
        </form>
        <div className="assignment">
          <h3>Assign delivery</h3>
          <form onSubmit={handleAssignment} className="assignment-form">
            <select
              value={assignment.deliveryId}
              onChange={(event) => setAssignment((prev) => ({ ...prev, deliveryId: event.target.value }))}
            >
              <option value="">Select delivery…</option>
              {deliveries.map((delivery) => (
                <option key={delivery.id} value={delivery.id}>
                  {delivery.title}
                </option>
              ))}
            </select>
            <select
              value={assignment.driverId}
              onChange={(event) => setAssignment((prev) => ({ ...prev, driverId: event.target.value }))}
            >
              <option value="">Select driver…</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            <button type="submit">Assign</button>
          </form>
        </div>
        <ul className="delivery-assignment-list">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              <div>
                <strong>{delivery.title}</strong>
                <div className="muted">
                  {delivery.origin} → {delivery.destination}
                </div>
                {delivery.scheduled_date && (
                  <div className="muted small">Scheduled: {formatDateTime(delivery.scheduled_date)}</div>
                )}
                {delivery.notes && <div className="muted small">{delivery.notes}</div>}
              </div>
              <div className="muted small assignments">
                {delivery.assignments && delivery.assignments.length > 0 ? (
                  delivery.assignments.map((assignmentDetail, index) => (
                    <span key={`${delivery.id}-${index}`}>
                      {assignmentDetail.name || 'Unassigned'} ({assignmentDetail.status})
                    </span>
                  ))
                ) : (
                  <span>Unassigned</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Trips</h2>
          <span className="muted">
            {totals.trips} trips • {formatDistance(totals.distance)} • {totals.deliveries} deliveries
          </span>
        </div>
        <div className="trip-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Start</th>
                <th>End</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className={selectedTrip?.id === trip.id ? 'selected' : ''}
                >
                  <td>
                    <strong>{trip.driver?.name}</strong>
                    <div className="muted small">{trip.driver?.email}</div>
                  </td>
                  <td>{formatDateTime(trip.started_at)}</td>
                  <td>{formatDateTime(trip.ended_at)}</td>
                  <td>{formatDistance(trip.total_distance)}</td>
                  <td>{formatDuration(trip.total_duration)}</td>
                  <td>{trip.totalDeliveries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedTrip && (
          <div className="trip-detail-panel">
            <div className="detail-header">
              <h3>Trip detail</h3>
              <button type="button" className="secondary" onClick={() => setSelectedTrip(null)}>
                Close
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <strong>Driver</strong>
                <span>{selectedTrip.driver?.name}</span>
              </div>
              <div>
                <strong>Started</strong>
                <span>{formatDateTime(selectedTrip.started_at)}</span>
              </div>
              <div>
                <strong>Completed</strong>
                <span>{formatDateTime(selectedTrip.ended_at)}</span>
              </div>
              <div>
                <strong>Distance</strong>
                <span>{formatDistance(selectedTrip.total_distance)}</span>
              </div>
              <div>
                <strong>Duration</strong>
                <span>{formatDuration(selectedTrip.total_duration)}</span>
              </div>
              <div>
                <strong>Deliveries</strong>
                <span>{selectedTrip.totalDeliveries}</span>
              </div>
            </div>
            <RouteMap points={selectedTrip.points} />
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
