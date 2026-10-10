import { utf8Bytes } from "../utf8";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { distance } from "../trekking/navigation";
export type RoutePoint = {
  latitude: number;
  longitude: number;
  elevation: number | null;
  timestamp?: number;
};
export type ImportedRoute = {
  version: 1;
  id: string;
  name: string;
  importedAt: string;
  segments: RoutePoint[][];
  source: "user-gpx";
  verified: false;
};
export const MAX_GPX_BYTES = 2_000_000;
const array = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
function number(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    throw new Error("The GPX contains an invalid coordinate or elevation.");
  const result = Number(value);
  if (!Number.isFinite(result))
    throw new Error("The GPX contains an invalid number.");
  return result;
}
export function parseGPX(
  xml: string,
  id: string,
  importedAt = new Date().toISOString(),
): ImportedRoute {
  if (xml.length > MAX_GPX_BYTES || utf8Bytes(xml) > MAX_GPX_BYTES)
    throw new Error("Choose a GPX file smaller than 2 MB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error(
      "GPX files with document type or entity declarations are not supported.",
    );
  if (XMLValidator.validate(xml) !== true)
    throw new Error(
      "This GPX is incomplete or malformed. Export it again from its source.",
    );
  const document = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  }).parse(xml);
  const root = document.gpx;
  if (!root || typeof root !== "object")
    throw new Error("Choose a GPX track or route file.");
  let count = 0;
  const segments: RoutePoint[][] = [];
  const add = (raw: Record<string, unknown>[]) => {
    if (!raw.length) return;
    const points = raw.map((p) => {
      if (++count > 20000)
        throw new Error(
          "This track exceeds 20,000 points. Simplify it in the source app first.",
        );
      const latitude = number(p["@_lat"]),
        longitude = number(p["@_lon"]);
      const elevation = p.ele === undefined ? null : number(p.ele);
      if (
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        (elevation !== null && (elevation < -12000 || elevation > 10000))
      )
        throw new Error(
          "The GPX contains out-of-range coordinates or elevation.",
        );
      const timestamp =
        typeof p.time === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          p.time,
        )
          ? Date.parse(p.time)
          : NaN;
      return {
        latitude,
        longitude,
        elevation,
        ...(Number.isFinite(timestamp) ? { timestamp } : {}),
      };
    });
    if (points.length < 2)
      throw new Error("Every track segment needs at least two points.");
    segments.push(points);
  };
  for (const track of array<Record<string, unknown>>(root.trk))
    for (const segment of array<Record<string, unknown>>(
      track.trkseg as Record<string, unknown>[],
    ))
      add(array(segment.trkpt as Record<string, unknown>[]));
  for (const route of array<Record<string, unknown>>(root.rte))
    add(array(route.rtept as Record<string, unknown>[]));
  if (!segments.length)
    throw new Error(
      "No track or route geometry found. Waypoint-only GPX files cannot define a trail.",
    );
  const name =
    root.metadata?.name ??
    array<Record<string, unknown>>(root.trk)[0]?.name ??
    array<Record<string, unknown>>(root.rte)[0]?.name;
  return {
    version: 1,
    id,
    name:
      typeof name === "string"
        ? name.slice(0, 120) || "Imported route"
        : "Imported route",
    importedAt,
    segments,
    source: "user-gpx",
    verified: false,
  };
}
export function routeStats(route: ImportedRoute) {
  let metres = 0,
    ascent = 0,
    descent = 0,
    missingElevation = false,
    longestStep = 0;
  for (const segment of route.segments)
    for (let i = 0; i < segment.length; i++) {
      const point = segment[i];
      if (point.elevation === null) missingElevation = true;
      if (!i) continue;
      const previous = segment[i - 1],
        step = distance(previous, point);
      metres += step;
      longestStep = Math.max(longestStep, step);
      if (point.elevation !== null && previous.elevation !== null) {
        const gain = point.elevation - previous.elevation;
        ascent += Math.max(0, gain);
        descent += Math.max(0, -gain);
      }
    }
  return {
    metres,
    ascent: missingElevation ? null : ascent,
    descent: missingElevation ? null : descent,
    longestStep,
    points: route.segments.reduce((sum, s) => sum + s.length, 0),
  };
}
const escapeXML = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function exportGPX(route: ImportedRoute) {
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Navo" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapeXML(route.name)}</name>${route.segments.map((s) => `<trkseg>${s.map((p) => `<trkpt lat="${p.latitude}" lon="${p.longitude}">${p.elevation === null ? "" : `<ele>${p.elevation}</ele>`}${p.timestamp === undefined ? "" : `<time>${new Date(p.timestamp).toISOString()}</time>`}</trkpt>`).join("")}</trkseg>`).join("")}</trk></gpx>`;
}
export function decodeRoutes(raw: string | null): ImportedRoute[] {
  if (raw === null) return [];
  const values = JSON.parse(raw);
  if (!Array.isArray(values) || values.length > 20)
    throw new Error(
      "Saved routes could not be read. Your files have not been changed.",
    );
  return values.map((value) => {
    if (
      value.version !== 1 ||
      value.source !== "user-gpx" ||
      value.verified !== false ||
      typeof value.id !== "string" ||
      value.id.length > 100 ||
      typeof value.name !== "string" ||
      value.name.length > 120 ||
      !Number.isFinite(Date.parse(value.importedAt)) ||
      !Array.isArray(value.segments) ||
      !value.segments.length
    )
      throw new Error("Invalid saved route.");
    let count = 0;
    for (const segment of value.segments) {
      if (!Array.isArray(segment) || segment.length < 2)
        throw new Error("Invalid saved segment.");
      for (const point of segment) {
        if (
          (point?.timestamp !== undefined &&
            (!Number.isFinite(point.timestamp) ||
              Math.abs(point.timestamp) > 8640000000000000)) ||
          ++count > 20000 ||
          !point ||
          !Number.isFinite(point.latitude) ||
          Math.abs(point.latitude) > 90 ||
          !Number.isFinite(point.longitude) ||
          Math.abs(point.longitude) > 180 ||
          (point.elevation !== null &&
            (!Number.isFinite(point.elevation) ||
              point.elevation < -12000 ||
              point.elevation > 10000))
        )
          throw new Error("Invalid saved geometry.");
      }
    }
    return value as ImportedRoute;
  });
}
