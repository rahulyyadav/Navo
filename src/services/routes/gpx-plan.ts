import type { ImportedRoute } from "./gpx";
import { routeStats } from "./gpx";
import { coordinatePlace } from "../places/types";
import type { RoutePlan } from "../routing/types";
export function planGPXSegment(
  route: ImportedRoute,
  segment: number,
  id: string,
  date: string,
  time: string,
): RoutePlan {
  const points = route.segments[segment];
  if (!points || points.length < 2)
    throw new Error("Choose a valid GPX segment.");
  const stats = routeStats({ ...route, segments: [points] });
  if (stats.longestStep > 500)
    throw new Error(
      "This segment has sparse points or a gap over 500 m. Import a continuous track before starting GPS guidance.",
    );
  if (stats.metres < 10)
    throw new Error("This segment is too short to navigate.");
  const name =
    `${route.name}${route.segments.length > 1 ? ` · segment ${segment + 1}` : ""}`.slice(
      0,
      120,
    );
  const origin = coordinatePlace(points[0], `${name} start`),
    destination = coordinatePlace(points[points.length - 1], `${name} end`);
  return {
    version: 1,
    id,
    name,
    origin,
    destination,
    stops: [],
    date,
    time,
    pace: "normal",
    savedAt: new Date().toISOString(),
    route: {
      id: route.id,
      name,
      geometry: points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      distanceM: stats.metres,
      durationS: stats.metres / (4000 / 3600),
      durationBasis: "4kmh-assumption",
      ascentM: stats.ascent,
      descentM: stats.descent,
      instructions: [],
      provider: "user-gpx",
      fetchedAt: route.importedAt,
      snappedStart: origin,
      snappedEnd: destination,
      startOffsetM: 0,
      endOffsetM: 0,
    },
  };
}
