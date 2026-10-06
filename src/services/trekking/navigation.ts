/** Provider-independent geometry. Distances describe the supplied geometry, not verified trail length. */
export type Point = { latitude: number; longitude: number; elevation: number; name: string };
export type Fix = { latitude: number; longitude: number; accuracy: number | null; altitude: number | null; altitudeAccuracy: number | null; heading: number | null; speed: number | null; timestamp: number };
export type RouteModel = { points: Point[]; distances: number[]; total: number };
const R = 6371000;
const radians = (n: number) => n * Math.PI / 180;
export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export function distance(a: Pick<Point, 'latitude' | 'longitude'>, b: Pick<Point, 'latitude' | 'longitude'>) {
  const lat = radians(b.latitude - a.latitude), lon = radians(b.longitude - a.longitude);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(clamp(h)));
}
export function bearing(a: Pick<Point, 'latitude' | 'longitude'>, b: Pick<Point, 'latitude' | 'longitude'>) {
  const lon = radians(b.longitude - a.longitude), lat1 = radians(a.latitude), lat2 = radians(b.latitude);
  return (Math.atan2(Math.sin(lon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon)) * 180 / Math.PI + 360) % 360;
}
export function shortestAngle(from: number, to: number) { return ((to - from + 540) % 360) - 180; }
export function buildRoute(points: Point[]): RouteModel {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180 || !Number.isFinite(p.elevation))) throw new Error('Invalid route geometry');
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  const total = distances[distances.length - 1];
  if (total < 1) throw new Error('Route needs distinct points');
  return { points, distances, total };
}
export function sampleRoute(route: RouteModel, metres: number) {
  const progress = clamp(metres, 0, route.total);
  let segment = route.points.length - 2;
  for (let i = 0; i < route.points.length - 1; i++) if (route.distances[i + 1] > progress) { segment = i; break; }
  const a = route.points[segment], b = route.points[segment + 1];
  const span = route.distances[segment + 1] - route.distances[segment];
  const t = span > 0 ? clamp((progress - route.distances[segment]) / span) : 0;
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t, elevation: a.elevation + (b.elevation - a.elevation) * t, heading: bearing(a, b), slope: span > 0 ? (b.elevation - a.elevation) / span : 0, segment, progress };
}
export function matchRoute(route: RouteModel, fix: Fix, previousProgress?: number) {
  const scaleX = R * Math.cos(radians(fix.latitude)) * Math.PI / 180, scaleY = R * Math.PI / 180;
  const candidates = route.points.slice(0, -1).map((a, segment) => {
    const b = route.points[segment + 1];
    const ax = (a.longitude - fix.longitude) * scaleX, ay = (a.latitude - fix.latitude) * scaleY;
    const dx = (b.longitude - a.longitude) * scaleX, dy = (b.latitude - a.latitude) * scaleY;
    const length2 = dx * dx + dy * dy;
    const t = length2 > 0 ? clamp(-(ax * dx + ay * dy) / length2) : 0;
    const crossTrack = Math.hypot(ax + t * dx, ay + t * dy);
    const progress = route.distances[segment] + (route.distances[segment + 1] - route.distances[segment]) * t;
    const continuity = previousProgress === undefined ? 0 : Math.min(Math.abs(progress - previousProgress) * 0.05, 100);
    return { progress, crossTrack, score: crossTrack + continuity };
  }).sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const tolerance = Math.max(25, Math.min(fix.accuracy ?? 100, 60) * 1.5);
  return { ...sampleRoute(route, best.progress), crossTrack: best.crossTrack, confident: fix.accuracy !== null && fix.accuracy <= 60 && best.crossTrack <= tolerance && (!candidates[1] || candidates[1].crossTrack - best.crossTrack > 8 || Math.abs(candidates[1].progress - best.progress) < 100) };
}
export function acceptFix(next: Fix, previous: Fix | null, now: number) {
  if (!Number.isFinite(next.latitude) || Math.abs(next.latitude) > 90 || !Number.isFinite(next.longitude) || Math.abs(next.longitude) > 180 || !Number.isFinite(next.timestamp) || next.timestamp > now + 5000 || now - next.timestamp > 30000 || next.accuracy === null || !Number.isFinite(next.accuracy) || next.accuracy < 0 || next.accuracy > 100) return false;
  if (!previous) return true;
  if (next.timestamp <= previous.timestamp) return false;
  const seconds = (next.timestamp - previous.timestamp) / 1000;
  return distance(previous, next) <= 6 * seconds + (previous.accuracy ?? 0) + next.accuracy;
}
export function nextCheckpoints(route: RouteModel, progress: number) {
  return route.points.map((point, i) => ({ ...point, distance: route.distances[i] - progress, gain: point.elevation - sampleRoute(route, progress).elevation })).filter(p => p.distance > 1).slice(0, 3);
}
export function elevationTrend(fixes: Fix[]) {
  const valid = fixes.filter(f => f.altitude !== null && Number.isFinite(f.altitude) && f.altitudeAccuracy !== null && f.altitudeAccuracy >= 0 && f.altitudeAccuracy <= 20);
  if (valid.length < 3) return 0;
  const first = valid[0], last = valid[valid.length - 1];
  const metres = distance(first, last);
  const gain = last.altitude! - first.altitude!;
  if (metres < 30 || Math.abs(gain) < Math.max(5, (first.altitudeAccuracy! + last.altitudeAccuracy!) / 2)) return 0;
  return clamp(gain / metres, -0.3, 0.3);
}
export function formatDistance(metres: number) { return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres / 10) * 10} m`; }
