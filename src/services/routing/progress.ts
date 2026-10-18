import { distanceToRoute } from "../route-distance";
import {
  buildRoute,
  matchRoute,
  type Fix,
  type RouteModel,
} from "../trekking/navigation";
import type { WalkingRoute } from "./types";
const models = new WeakMap<WalkingRoute, RouteModel>();
export function navigationProgress(
  route: WalkingRoute,
  fix: Fix | null,
  fresh: boolean,
) {
  if (!fix || !fresh || fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 50 || !Number.isFinite(fix.latitude) || Math.abs(fix.latitude) > 90 || !Number.isFinite(fix.longitude) || Math.abs(fix.longitude) > 180) return null;
  let model = models.get(route);
  if (!model) {
    try {
      model = buildRoute(route.geometry.map((p) => ({ ...p, elevation: 0, name: "" })));
    } catch {
      // Corrupted or zero-length saved geometry must not crash navigation.
      return null;
    }
    models.set(route, model);
  }
  const match = matchRoute(model, fix);
  const crossTrack = distanceToRoute(fix, route.geometry);
  if (!match.confident || crossTrack === null || crossTrack - fix.accuracy > 60)
    return {
      matched: false,
      remainingM: null,
      ratio: null,
      next: null,
      nextDistanceM: null,
      current: null,
      crossTrack,
    };
  const ratio = model.total > 0 ? match.progress / model.total : 0;
  let step = 0,
    covered = 0;
  for (let i = 0; i < route.instructions.length; i++) {
    covered += route.instructions[i].distanceM;
    if (covered >= route.distanceM * ratio) {
      step = i;
      break;
    }
    step = i;
  }
  return {
    matched: true,
    remainingM: Math.max(0, route.distanceM * (1 - ratio)),
    ratio,
    current: route.instructions[step] ?? null,
    next: route.instructions[Math.min(step + 1, route.instructions.length - 1)] ?? null,
    nextDistanceM: route.instructions.length ? Math.max(0, covered - route.distanceM * ratio) : null,
    crossTrack,
  };
}
export function sustainedDeviation(
  fix: Fix | null,
  crossTrack: number | null,
  fresh: boolean,
  now: number,
  since: number | null,
) {
  if (
    !fresh ||
    !fix ||
    fix.accuracy === null ||
    fix.accuracy > 50 ||
    crossTrack === null ||
    crossTrack - fix.accuracy <= 60
  )
    return { since: null, offRoute: false };
  const start = since ?? now;
  return { since: start, offRoute: now - start >= 30000 };
}
