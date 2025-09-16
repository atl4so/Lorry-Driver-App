import RouteMap from './RouteMap.jsx';
import { formatDateTime, formatDistance, formatDuration } from '../../utils/format.js';

function TripHistory({ trips, selectedTrip, onSelectTrip, onClearSelection }) {
  return (
    <div className="trip-history">
      <div className="trip-history-list">
        <h3>Trip history</h3>
        {trips.length === 0 && <p className="muted">No trips recorded yet.</p>}
        <ul>
          {trips.map((trip) => (
            <li key={trip.id}>
              <button
                type="button"
                className={selectedTrip?.id === trip.id ? 'active' : ''}
                onClick={() => onSelectTrip(trip)}
              >
                <span className="title">{formatDateTime(trip.started_at)}</span>
                <span className="meta">
                  {formatDistance(trip.total_distance)} • {formatDuration(trip.total_duration)} • {trip.totalDeliveries}{' '}
                  deliveries
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="trip-history-detail">
        {selectedTrip ? (
          <div>
            <div className="detail-header">
              <h3>Trip detail</h3>
              <button type="button" className="secondary" onClick={onClearSelection}>
                Close
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <strong>Started</strong>
                <span>{formatDateTime(selectedTrip.started_at)}</span>
              </div>
              <div>
                <strong>Ended</strong>
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
            <h4>Route</h4>
            <RouteMap points={selectedTrip.points} />
            {selectedTrip.deliveries && selectedTrip.deliveries.length > 0 && (
              <div className="delivery-summary">
                <h4>Deliveries completed</h4>
                <ul>
                  {selectedTrip.deliveries.map((delivery) => (
                    <li key={delivery.id}>
                      <strong>{delivery.title}</strong>
                      <div className="muted">
                        {delivery.origin} → {delivery.destination}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">Select a trip to view details and the route map.</p>
        )}
      </div>
    </div>
  );
}

export default TripHistory;
