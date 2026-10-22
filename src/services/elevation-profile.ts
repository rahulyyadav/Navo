export type ProfileStop = { name: string; elevation: number };
export type ProfileMarker = { index: number; name: string; elevation: number; km: number; x: number; y: number };
export type ProfileGeometry = {
  width: number;
  height: number;
  baseline: number;
  min: number;
  max: number;
  totalKm: number;
  line: string;
  area: string;
  markers: ProfileMarker[];
  highest: ProfileMarker;
  lowest: ProfileMarker;
};

const PAD = 5;
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Plot elevation against real walking distance, not stop count, so a cluster of
 * close stops shows the climb it actually is. Falls back to even spacing only
 * when no usable distances exist.
 */
export function buildElevationProfile(stops: ProfileStop[], km: number[], width: number, height: number): ProfileGeometry | null {
  if (!stops.length || !(width > 0) || !(height > 0)) return null;
  const elevations = stops.map(stop => Number(stop.elevation));
  if (!elevations.every(Number.isFinite)) return null;

  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const span = max - min || 1;
  const inner = Math.max(width - PAD * 2, 1);
  const usable = Math.max(height - PAD * 2, 1);
  const baseline = round(PAD + usable);

  const distances = stops.map((_, index) => (Number.isFinite(km[index]) ? Math.max(0, km[index]) : 0));
  const totalKm = distances[distances.length - 1] ?? 0;
  const distanceX = (value: number) => PAD + (totalKm > 0 ? (Math.max(0, Math.min(value, totalKm)) / totalKm) * inner : 0);
  const xAt = (index: number) => round(totalKm > 0 ? distanceX(distances[index]) : stops.length > 1 ? PAD + (index * inner) / (stops.length - 1) : width / 2);
  const yAt = (elevation: number) => round(PAD + usable - ((elevation - min) / span) * usable);

  const markers = stops.map((stop, index) => ({
    index,
    name: stop.name,
    elevation: elevations[index],
    km: distances[index],
    x: xAt(index),
    y: yAt(elevations[index]),
  }));

  const line = markers.map((marker, index) => `${index ? 'L' : 'M'}${marker.x},${marker.y}`).join(' ');
  const first = markers[0];
  const last = markers[markers.length - 1];
  return {
    width,
    height,
    baseline,
    min,
    max,
    totalKm,
    line,
    area: `${line} L${last.x},${baseline} L${first.x},${baseline} Z`,
    markers,
    highest: markers.reduce((best, marker) => (marker.elevation > best.elevation ? marker : best), markers[0]),
    lowest: markers.reduce((best, marker) => (marker.elevation < best.elevation ? marker : best), markers[0]),
  };
}

/** Where a walked distance lands on a distance-proportionate profile. */
export function xAtDistance(geometry: ProfileGeometry, walkedKm: number): number {
  if (!(geometry.totalKm > 0)) return geometry.width / 2;
  const clamped = Math.max(0, Math.min(walkedKm, geometry.totalKm));
  return round(PAD + (clamped / geometry.totalKm) * Math.max(geometry.width - PAD * 2, 1));
}

export function formatAscent(delta: number): string {
  const value = Math.round(delta);
  return value === 0 ? 'level' : `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('en-US')} m`;
}
