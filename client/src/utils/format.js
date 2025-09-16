export function formatDistance(kilometres) {
  if (kilometres == null) {
    return '0 km';
  }
  return `${kilometres.toFixed(2)} km`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return '0m';
  }
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}m`);
  }
  return parts.join(' ') || '0m';
}

export function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString();
}
