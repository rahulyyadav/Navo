import { distance } from "../trekking/navigation";
import { isCoordinate, type Coordinate, type Place } from "./types";
const endpoint = (
  process.env.EXPO_PUBLIC_PHOTON_URL?.trim() ||
  (typeof __DEV__ !== "undefined" && __DEV__ ? "https://photon.komoot.io" : "")
).replace(/\/$/, "");
const cache = new Map<string, { time: number; results: Place[] }>();
export function decodePlaces(value: unknown, near?: Coordinate): Place[] {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { features?: unknown }).features)
  )
    throw new Error(
      "The place service returned an incomplete response. Please retry.",
    );
  const results: Place[] = [];
  for (const feature of (value as { features: unknown[] }).features.slice(
    0,
    20,
  )) {
    if (!feature || typeof feature !== "object") continue;
    const f = feature as {
      geometry?: { type?: string; coordinates?: number[] };
      properties?: Record<string, unknown>;
    };
    const p = f.properties,
      coordinates = f.geometry?.coordinates;
    if (!p || f.geometry?.type !== "Point" || !Array.isArray(coordinates))
      continue;
    const point = { longitude: coordinates[0], latitude: coordinates[1] };
    if (!isCoordinate(point) || typeof p.name !== "string" || !p.name.trim())
      continue;
    const string = (key: string) =>
      typeof p[key] === "string" ? (p[key] as string).slice(0, 200) : undefined;
    const city = string("city"),
      region = string("state") ?? string("county"),
      country = string("country");
    const name = p.name.slice(0, 200);
    const fullName = [
      ...new Set([name, city, region, country].filter(Boolean)),
    ].join(", ");
    const place: Place = {
      ...point,
      id: `photon:${String(p.osm_type).slice(0, 10)}:${String(p.osm_id).slice(0, 30)}:${point.latitude}:${point.longitude}`,
      name,
      fullName,
      city,
      region,
      country,
      countryCode: string("countrycode"),
      type: string("osm_value") ?? "destination",
      provider: "photon",
    };
    if (near) place.distanceM = distance(near, point);
    if (!results.some((v) => v.id === place.id)) results.push(place);
  }
  return results.slice(0, 6);
}
export async function searchPlaces(
  query: string,
  options: { near?: Coordinate; signal?: AbortSignal } = {},
): Promise<Place[]> {
  const q = query.trim();
  if (!q || q.length > 100) return [];
  const params = new URLSearchParams({ q, limit: "6", lang: "en" });
  const bias =
    options.near && isCoordinate(options.near)
      ? options.near
      : { latitude: 27.7, longitude: 85.3 };
  params.set("lat", String(Math.round(bias.latitude*100)/100));
  params.set("lon", String(Math.round(bias.longitude*100)/100));
  const key = params.toString(),
    saved = cache.get(key);
  if (saved && Date.now() - saved.time < 300000) return saved.results;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 10000);
  try {
    if (!/^https:\/\//.test(endpoint))
      throw new Error(
        "Place search is unavailable. Configure the production place-search endpoint.",
      );
    const response = await fetch(`${endpoint}/api/?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Place search is busy. Wait a moment and retry."
          : "Couldn’t search places. Check your connection and retry.",
      );
    const results = decodePlaces(await response.json(), options.near);
    cache.set(key, { time: Date.now(), results });
    if (cache.size > 50) cache.delete(cache.keys().next().value!);
    return results;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      error instanceof Error &&
      !["AbortError", "TypeError", "SyntaxError"].includes(error.name)
        ? error.message
        : "Couldn’t search places. Check your connection and retry.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
