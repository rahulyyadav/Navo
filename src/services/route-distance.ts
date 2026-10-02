export type Coordinate = { latitude: number; longitude: number };
const radians = (degrees: number) => degrees * Math.PI / 180;
// Local tangent-plane point-to-segment distance; appropriate for short trekking segments.
export function distanceToRoute(point: Coordinate, route: Coordinate[]): number | null {
  if (route.length < 2 || ![point.latitude, point.longitude, ...route.flatMap(p => [p.latitude, p.longitude])].every(Number.isFinite)) return null;
  const scale = Math.cos(radians(point.latitude));
  const project = (p: Coordinate) => ({ x: radians(p.longitude - point.longitude) * 6371000 * scale, y: radians(p.latitude - point.latitude) * 6371000 });
  let nearest = Infinity;
  for (let i = 1; i < route.length; i++) {
    const a = project(route[i - 1]); const b = project(route[i]); const dx = b.x - a.x; const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const ratio = length ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / length)) : 0;
    nearest = Math.min(nearest, Math.hypot(a.x + ratio * dx, a.y + ratio * dy));
  }
  return nearest;
}
export function offRouteDecision(input: { verified: boolean; distance: number | null; accuracy: number; now: number; startedAt: number | null; lastAlertAt: number | null; threshold?: number }) {
  const threshold = input.threshold ?? 150;
  if (!input.verified || input.distance === null || input.accuracy > 50 || input.distance - input.accuracy <= threshold) return { startedAt: null, alert: false };
  const startedAt = input.startedAt ?? input.now;
  return { startedAt, alert: input.now - startedAt >= 30000 && (input.lastAlertAt === null || input.now - input.lastAlertAt >= 300000) };
}
