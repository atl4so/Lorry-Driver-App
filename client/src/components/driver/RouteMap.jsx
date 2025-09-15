import { useEffect, useMemo } from 'react';
import { MapContainer, Polyline, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

const defaultCenter = [51.505, -0.09];

function MapViewUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [map, position]);
  return null;
}

function RouteMap({ points }) {
  const coordinates = useMemo(
    () => (points && points.length > 0 ? points.map((point) => [point.latitude, point.longitude]) : []),
    [points]
  );

  const center = coordinates.length > 0 ? coordinates[coordinates.length - 1] : defaultCenter;
  const startPoint = coordinates.length > 0 ? coordinates[0] : null;
  const endPoint = coordinates.length > 1 ? coordinates[coordinates.length - 1] : null;

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '320px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <MapViewUpdater position={center} />
      {coordinates.length > 0 && <Polyline positions={coordinates} color="#2563eb" weight={4} />}
      {startPoint && (
        <Marker position={startPoint}>
          <Popup>Trip start</Popup>
        </Marker>
      )}
      {endPoint && (
        <Marker position={endPoint}>
          <Popup>Latest point</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

export default RouteMap;
