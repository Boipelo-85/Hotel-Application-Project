export interface Coordinates { latitude: number; longitude: number }

export function parseCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if ((typeof latitude !== 'string' && typeof latitude !== 'number') ||
      (typeof longitude !== 'string' && typeof longitude !== 'number') ||
      String(latitude).trim() === '' || String(longitude).trim() === '') return null;
  const lat = Number(latitude), lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng } : null;
}
