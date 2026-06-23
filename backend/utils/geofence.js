/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Check if a coordinate is inside a geofence
 */
export const isInsideGeofence = (empLat, empLng, geoLat, geoLng, radiusMeters) => {
  const distance = haversineDistance(empLat, empLng, geoLat, geoLng);
  return { inside: distance <= radiusMeters, distance: Math.round(distance) };
};

/**
 * Format minutes to HH:MM
 */
export const minutesToHHMM = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Get working minutes between two timestamps
 */
export const getWorkingMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.floor(diff / 60000));
};

/**
 * Check if employee is late
 */
export const isLate = (checkInTime) => {
  const officeHour = parseInt(process.env.OFFICE_START_HOUR) || 9;
  const officeMin = parseInt(process.env.OFFICE_START_MINUTE) || 0;
  const threshold = parseInt(process.env.LATE_THRESHOLD_MINUTES) || 15;

  const checkIn = new Date(checkInTime);
  const officeStart = new Date(checkIn);
  officeStart.setHours(officeHour, officeMin, 0, 0);

  const lateByMs = checkIn - officeStart - threshold * 60000;
  if (lateByMs > 0) {
    return { isLate: true, lateByMinutes: Math.floor(lateByMs / 60000) };
  }
  return { isLate: false, lateByMinutes: 0 };
};

/**
 * Get current date in YYYY-MM-DD
 */
export const todayDate = () => {
  return new Date().toISOString().split('T')[0];
};
