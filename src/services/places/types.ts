export type Coordinate = { latitude: number; longitude: number };
export type Place = Coordinate & {
  id: string;
  name: string;
  fullName: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  type: string;
  provider: "photon" | "coordinates";
  distanceM?: number;
};
export function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== "object") return false;
  const p = value as Coordinate;
  return (
    Number.isFinite(p.latitude) &&
    Math.abs(p.latitude) <= 90 &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.longitude) <= 180
  );
}
export function coordinatePlace(
  point: Coordinate,
  name = "Selected map point",
): Place {
  if (!isCoordinate(point)) throw new Error("Choose valid coordinates.");
  return {
    ...point,
    id: `point:${point.latitude}:${point.longitude}`,
    name,
    fullName: `${name} · ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
    type: "destination",
    provider: "coordinates",
  };
}
