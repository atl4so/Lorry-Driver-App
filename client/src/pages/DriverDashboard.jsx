import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import RouteMap from '../components/driver/RouteMap.jsx';
import TripHistory from '../components/driver/TripHistory.jsx';
import { parseResponse } from '../utils/http.js';

function DriverDashboard() {
  const { authFetch } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const watchIdRef = useRef(null);
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState(null);

  const hasSelectedDeliveries = selectedDeliveries.length > 0;

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deliveriesData, activeTripData, historyData] = await Promise.all([
        authFetch('/api/deliveries').then(parseResponse),
        authFetch('/api/trips/active').then(parseResponse),
        authFetch('/api/trips').then(parseResponse)
      ]);
      setDeliveries(deliveriesData);
      setActiveTrip(activeTripData);
      setTripHistory(historyData);
      if (activeTripData && activeTripData.id) {
        setSelectedHistoryTrip(activeTripData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTrip && activeTrip.status === 'ongoing') {
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported in this browser.');
        return;
      }
      setGeoError(null);
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const timestamp = new Date(position.timestamp || Date.now()).toISOString();
          sendLocationUpdate(activeTrip.id, position.coords, timestamp);
        },
        (geoErr) => {
          setGeoError(geoErr.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
      watchIdRef.current = watchId;
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id, activeTrip?.status]);

  const sendLocationUpdate = async (tripId, coords, timestamp) => {
    try {
      const response = await authFetch(`/api/trips/${tripId}/location`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          recordedAt: timestamp
        })
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({ message: 'Unable to store location point' }));
        throw new Error(message.message || 'Unable to store location point');
      }
      const data = await response.json();
      setActiveTrip((prev) => {
        if (!prev || prev.id !== tripId) return prev;
        const newPoint = {
          id: `${timestamp}-${coords.latitude}-${coords.longitude}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
          recordedAt: timestamp,
          distanceFromLast: data.distanceFromLast
        };
        const points = [...(prev.points || []), newPoint];
        const totalDistance = (prev.total_distance || 0) + (data.distanceFromLast || 0);
        const totalDuration =
          (new Date(timestamp).getTime() - new Date(prev.started_at).getTime()) / 1000;
        return {
          ...prev,
          points,
          total_distance: totalDistance,
          total_duration: totalDuration
        };
      });
    } catch (err) {
      setGeoError(err.message);
    }
  };

  const toggleDelivery = (deliveryId) => {
    setSelectedDeliveries((prev) =>
      prev.includes(deliveryId) ? prev.filter((id) => id !== deliveryId) : [...prev, deliveryId]
    );
  };

  const handleStartTrip = async () => {
    setError(null);
    setGeoError(null);
    try {
      const response = await authFetch('/api/trips/start', {
        method: 'POST',
        body: JSON.stringify({ deliveryIds: selectedDeliveries })
      });
      const data = await parseResponse(response);
      setActiveTrip(data);
      setSelectedDeliveries([]);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStopTrip = async () => {
    if (!activeTrip) return;
    try {
      const response = await authFetch(`/api/trips/${activeTrip.id}/stop`, {
        method: 'POST'
      });
      const data = await parseResponse(response);
      setActiveTrip(null);
      await fetchAll();
      setSelectedHistoryTrip(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    setSelectedHistoryTrip((prev) => {
      if (!prev || !activeTrip || prev.id !== activeTrip.id) {
        return prev;
      }
      return activeTrip;
    });
  }, [activeTrip]);

  useEffect(() => {
    if (!selectedHistoryTrip) return;
    const updated = tripHistory.find((trip) => trip.id === selectedHistoryTrip.id);
    if (updated && updated !== selectedHistoryTrip) {
      setSelectedHistoryTrip(updated);
    }
  }, [tripHistory, selectedHistoryTrip]);

  const pendingDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.status !== 'completed'),
    [deliveries]
  );

  return (
    <div className="grid gap">
      {loading && <div className="card">Loading driver data…</div>}
      {error && <div className="error">{error}</div>}

      <section className="card">
        <h2>Assigned deliveries</h2>
        {pendingDeliveries.length === 0 ? (
          <p className="muted">No deliveries assigned yet. Contact your dispatcher.</p>
        ) : (
          <ul className="delivery-list">
            {pendingDeliveries.map((delivery) => (
              <li key={delivery.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedDeliveries.includes(delivery.id)}
                    onChange={() => toggleDelivery(delivery.id)}
                    disabled={Boolean(activeTrip)}
                  />
                  <div>
                    <strong>{delivery.title}</strong>
                    <div className="muted">
                      {delivery.origin} → {delivery.destination}
                    </div>
                    {delivery.scheduled_date && (
                      <div className="muted small">Scheduled: {new Date(delivery.scheduled_date).toLocaleString()}</div>
                    )}
                    <div className="muted small">Status: {delivery.status}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={handleStartTrip} disabled={!hasSelectedDeliveries || Boolean(activeTrip)}>
          Start trip
        </button>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Active trip</h2>
          {activeTrip && (
            <button type="button" className="danger" onClick={handleStopTrip}>
              Stop trip
            </button>
          )}
        </div>
        {activeTrip ? (
          <div className="active-trip">
            <div className="stat-grid">
              <div>
                <strong>Started</strong>
                <span>{new Date(activeTrip.started_at).toLocaleString()}</span>
              </div>
              <div>
                <strong>Distance</strong>
                <span>{(activeTrip.total_distance || 0).toFixed(2)} km</span>
              </div>
              <div>
                <strong>Duration</strong>
                <span>{Math.round((activeTrip.total_duration || 0) / 60)} min</span>
              </div>
              <div>
                <strong>Deliveries</strong>
                <span>{activeTrip.totalDeliveries}</span>
              </div>
            </div>
            {geoError && <div className="error">{geoError}</div>}
            <RouteMap points={activeTrip.points || []} />
          </div>
        ) : (
          <p className="muted">No active trip. Select your deliveries and start tracking to begin.</p>
        )}
      </section>

      <section className="card">
        <TripHistory
          trips={tripHistory}
          selectedTrip={selectedHistoryTrip}
          onSelectTrip={setSelectedHistoryTrip}
          onClearSelection={() => setSelectedHistoryTrip(null)}
        />
      </section>
    </div>
  );
}

export default DriverDashboard;
