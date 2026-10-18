import { distance } from '../trekking/navigation';
import type { ImportedRoute } from './gpx';
export type ProfilePoint = { distanceM: number; elevationM: number };
/** Source elevation only. Segment gaps never add distance or connect chart lines. */
export function elevationProfile(route: ImportedRoute) {
  if (!route.segments.length || route.segments.length > 100) return null;
  const count = route.segments.reduce((n, segment) => n + segment.length, 0);
  if (count < 2) return null;
  let travelled = 0, low = Infinity, high = -Infinity;
  const segments: ProfilePoint[][] = [];
  for (const segment of route.segments) {
    if (segment.length < 2) return null;
    const budget = Math.max(2, Math.floor(400 * segment.length / count));
    const stride = Math.max(1, Math.ceil((segment.length - 1) / (budget - 1)));
    const sampled: ProfilePoint[] = [];
    for (let i = 0; i < segment.length; i++) {
      const point = segment[i];
      if (point.elevation === null || !Number.isFinite(point.elevation)) return null;
      if (i) travelled += distance(segment[i - 1], point);
      low = Math.min(low, point.elevation); high = Math.max(high, point.elevation);
      if (i % stride === 0 || i === segment.length - 1) sampled.push({ distanceM: travelled, elevationM: point.elevation });
    }
    segments.push(sampled);
  }
  if (!Number.isFinite(travelled) || travelled < 1) return null;
  return { segments, distanceM: travelled, lowM: low, highM: high, sampled: count > segments.reduce((n,s) => n + s.length,0) };
}
