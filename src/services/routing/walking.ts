import { distance } from "../trekking/navigation";
import { isCoordinate, type Coordinate } from "../places/types";
import type { WalkingRoute, RouteInstruction } from "./types";
const endpoint = (
  process.env.EXPO_PUBLIC_WALKING_ROUTER_URL?.trim() ||
  (typeof __DEV__ !== "undefined" && __DEV__
    ? "https://routing.openstreetmap.de/routed-foot"
    : "")
).replace(/\/$/, "");
let lastRequest = 0;
const cache = new Map<string, { time: number; routes: WalkingRoute[] }>();
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const numeric = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
function geometry(value: unknown): Coordinate[] {
  if (
    !object(value) ||
    value.type !== "LineString" ||
    !Array.isArray(value.coordinates) ||
    value.coordinates.length < 2 ||
    value.coordinates.length > 30000
  )
    throw new Error("The walking route geometry is unavailable.");
  return value.coordinates.map((c) => {
    const p = {
      longitude: Array.isArray(c) ? c[0] : NaN,
      latitude: Array.isArray(c) ? c[1] : NaN,
    };
    if (!isCoordinate(p))
      throw new Error("The walking route contains invalid coordinates.");
    return p;
  });
}
export function decodeWalkingRoutes(
  value: unknown,
  points: Coordinate[],
): WalkingRoute[] {
  if (
    !object(value) ||
    value.code !== "Ok" ||
    !Array.isArray(value.routes) ||
    !value.routes.length
  )
    throw new Error(
      object(value) && ["NoRoute", "NoSegment"].includes(String(value.code))
        ? "No walkable connection was found. Choose a confirmed trailhead or another destination."
        : "The walking route service could not return a route. Retry when connected.",
    );
  if (
    !Array.isArray(value.waypoints) ||
    value.waypoints.length !== points.length
  )
    throw new Error("The route endpoints could not be verified.");
  const waypoints = value.waypoints.map((w) => {
    if (!object(w) || !Array.isArray(w.location))
      throw new Error("Invalid route endpoint.");
    const p = { longitude: w.location[0], latitude: w.location[1] };
    if (!isCoordinate(p)) throw new Error("Invalid route endpoint.");
    return p;
  });
  if (waypoints.some((p, i) => distance(p, points[i]) > 200))
    throw new Error(
      "A selected place is more than 200 m from the walking network. Pick its accessible entrance or trailhead.",
    );
  return value.routes.slice(0, 3).map((r, index) => {
    if (
      !object(r) ||
      !numeric(r.distance, 500000) ||
      !numeric(r.duration, 604800) ||
      !Array.isArray(r.legs)
    )
      throw new Error("The route distance or duration is incomplete.");
    const line = geometry(r.geometry);
    if (
      distance(line[0], waypoints[0]) > 50 ||
      distance(line[line.length - 1], waypoints[waypoints.length - 1]) > 50
    )
      throw new Error("The route line does not match the selected endpoints.");
    const instructions: RouteInstruction[] = [];
    for (const leg of r.legs) {
      if (!object(leg) || !Array.isArray(leg.steps)) continue;
      for (const step of leg.steps) {
        if (
          !object(step) ||
          !object(step.maneuver) ||
          !Array.isArray(step.maneuver.location) ||
          !numeric(step.distance, 500000) ||
          !numeric(step.duration, 604800)
        )
          continue;
        const coordinate = {
          longitude: step.maneuver.location[0],
          latitude: step.maneuver.location[1],
        };
        if (!isCoordinate(coordinate)) continue;
        const type = String(step.maneuver.type),
          modifier =
            typeof step.maneuver.modifier === "string"
              ? step.maneuver.modifier
              : "";
        const road =
          typeof step.name === "string" && step.name
            ? ` onto ${step.name.slice(0, 120)}`
            : "";
        const text =
          type === "depart"
            ? `Start walking${road}`
            : type === "arrive"
              ? "Arrive at the routed endpoint"
              : type === "new name"
                ? `Continue${road}`
                : `${type.replace(/\b\w/, (c) => c.toUpperCase())}${modifier ? ` ${modifier}` : ""}${road}`;
        const stepGeometry =
          object(step.geometry) &&
          Array.isArray(step.geometry.coordinates) &&
          step.geometry.coordinates.length > 1
            ? geometry(step.geometry)
            : [coordinate];
        instructions.push({
          text,
          distanceM: step.distance,
          durationS: step.duration,
          coordinate,
          geometry: stepGeometry,
        });
      }
    }
    return {
      id: `osrm-${index}`,
      name:
        index === 0 ? "Best available walking route" : `Alternative ${index}`,
      geometry: line,
      distanceM: r.distance,
      durationS: r.duration,
      ascentM: null,
      descentM: null,
      instructions,
      provider: "osrm-foot",
      fetchedAt: new Date().toISOString(),
      snappedStart: waypoints[0],
      snappedEnd: waypoints[waypoints.length - 1],
      startOffsetM: distance(points[0], waypoints[0]),
      endOffsetM: distance(
        points[points.length - 1],
        waypoints[waypoints.length - 1],
      ),
    };
  });
}
export async function calculateWalkingRoutes(
  origin: Coordinate,
  destination: Coordinate,
  stops: Coordinate[] = [],
  signal?: AbortSignal,
): Promise<WalkingRoute[]> {
  const points = [origin, ...stops, destination];
  if (points.length > 5 || !points.every(isCoordinate))
    throw new Error("Choose valid start, destination and up to three stops.");
  if (distance(origin, destination) < 10)
    throw new Error("Choose a destination at least 10 m from your start.");
  if (points.slice(1).some((p, i) => distance(points[i], p) > 100000))
    throw new Error(
      "Plan a walking stage under 100 km between stops. Choose a trailhead closer to the destination.",
    );
  if (!/^https:\/\//.test(endpoint) || /routed-car/.test(endpoint))
    throw new Error(
      "Walking routes are unavailable. Configure a walking-profile routing endpoint.",
    );
  const path = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
  const saved = cache.get(path);
  if (saved && Date.now() - saved.time < 300000) return saved.routes;
  if (Date.now() - lastRequest < 1200)
    throw new Error("Wait a moment before requesting another route.");
  lastRequest = Date.now();
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(
      `${endpoint}/route/v1/foot/${path}?overview=full&geometries=geojson&steps=true&alternatives=true`,
      { signal: controller.signal },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "The route service is busy. Wait a moment and retry."
          : "Couldn’t calculate a walking route. Check your connection and retry.",
      );
    const routes = decodeWalkingRoutes(await response.json(), points);
    cache.set(path, { time: Date.now(), routes });
    if (cache.size > 20) cache.delete(cache.keys().next().value!);
    return routes;
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      error instanceof Error &&
      !["AbortError", "TypeError", "SyntaxError"].includes(error.name)
        ? error.message
        : "Walking route request failed or timed out. Check your connection and retry.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function plannedDuration(
  route: WalkingRoute,
  pace: "relaxed" | "normal" | "brisk",
) {
  return route.durationS * { relaxed: 1.25, normal: 1, brisk: 0.85 }[pace];
}
export function routeDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}
