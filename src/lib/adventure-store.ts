import { utf8Bytes } from "@/services/utf8";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isCoordinate,
  type Place,
  type Coordinate,
} from "@/services/places/types";
import type { RoutePlan } from "@/services/routing/types";
export type NavigationHistory = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string;
  distanceM: number;
  activeSeconds: number;
  highestM: number | null;
  path: (Coordinate & {
    timestamp: number;
    elevation: number | null;
    segment?: number;
  })[];
  plan: RoutePlan;
};
export type Adventures = {
  version: 1;
  recent: Place[];
  savedPlaces: Place[];
  plans: RoutePlan[];
  history: NavigationHistory[];
};
const empty = (): Adventures => ({
  version: 1,
  recent: [],
  savedPlaces: [],
  plans: [],
  history: [],
});
const key = (uid: string) => {
  if (!uid) throw new Error("Sign in to save your adventure.");
  return `navo:adventures:${uid}`;
};
const queues = new Map<string, Promise<unknown>>();
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
function place(v: unknown): v is Place {
  return (
    isCoordinate(v) &&
    typeof (v as Place).id === "string" &&
    typeof (v as Place).name === "string" &&
    (v as Place).name.length <= 200 &&
    typeof (v as Place).fullName === "string" &&
    (v as Place).fullName.length <= 1000
  );
}
function plan(v: RoutePlan) {
  return (
    v?.version === 1 &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    place(v.origin) &&
    place(v.destination) &&
    Array.isArray(v.stops) &&
    v.stops.length <= 3 &&
    v.stops.every(place) &&
    typeof v.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    Number.isFinite(Date.parse(v.date)) &&
    new Date(v.date).toISOString().slice(0, 10) === v.date &&
    typeof v.time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.time) &&
    ["normal", "relaxed", "brisk"].includes(v.pace) &&
    date(v.savedAt) &&
    (v.weather === undefined ||
      v.weather === null ||
      (date(v.weather.fetchedAt) &&
        v.weather.date === v.date &&
        typeof v.weather.sunset === "string" &&
        Array.isArray(v.weather.hours) &&
        v.weather.hours.length === 24 &&
        v.weather.hours.every(
          (h) =>
            Number.isFinite(h.temperature) &&
            Number.isFinite(h.rainChance) &&
            h.rainChance >= 0 &&
            h.rainChance <= 100 &&
            Number.isFinite(h.wind),
        ))) &&
    ["osrm-foot", "user-gpx"].includes(v.route?.provider) &&
    Array.isArray(v.route.geometry) &&
    v.route.geometry.length >= 2 &&
    v.route.geometry.length <= 30000 &&
    v.route.geometry.every(isCoordinate) &&
    Number.isFinite(v.route.distanceM) &&
    v.route.distanceM >= 0 &&
    Number.isFinite(v.route.durationS) &&
    v.route.durationS >= 0 &&
    Array.isArray(v.route.instructions) &&
    v.route.instructions.length <= 10000 &&
    v.route.instructions.every(
      (i) =>
        typeof i.text === "string" &&
        isCoordinate(i.coordinate) &&
        Number.isFinite(i.distanceM) &&
        i.distanceM >= 0,
    ) &&
    isCoordinate(v.route.snappedStart) &&
    isCoordinate(v.route.snappedEnd)
  );
}
export function decodeAdventures(raw: string | null): Adventures {
  if (raw === null) return empty();
  const v = JSON.parse(raw) as Adventures;
  if (
    !v ||
    v.version !== 1 ||
    !Array.isArray(v.recent) ||
    v.recent.length > 10 ||
    !v.recent.every(place) ||
    !Array.isArray(v.savedPlaces) ||
    v.savedPlaces.length > 50 ||
    !v.savedPlaces.every(place) ||
    !Array.isArray(v.plans) ||
    v.plans.length > 20 ||
    !v.plans.every(plan) ||
    !Array.isArray(v.history) ||
    v.history.length > 50 ||
    !v.history.every(
      (h) =>
        typeof h.id === "string" &&
        typeof h.name === "string" &&
        date(h.startedAt) &&
        date(h.endedAt) &&
        Number.isFinite(h.distanceM) &&
        h.distanceM >= 0 &&
        Number.isFinite(h.activeSeconds) &&
        h.activeSeconds >= 0 &&
        (h.highestM === null || Number.isFinite(h.highestM)) &&
        Array.isArray(h.path) &&
        h.path.length <= 10000 &&
        h.path.every(
          (p) =>
            isCoordinate(p) &&
            Number.isFinite(p.timestamp) &&
            (p.elevation === null || Number.isFinite(p.elevation)),
        ) &&
        plan(h.plan),
    )
  )
    throw new Error(
      "Your saved adventures could not be read. Existing data has been kept unchanged.",
    );
  return v;
}
export async function readAdventures(uid: string) {
  return decodeAdventures(await AsyncStorage.getItem(key(uid)));
}
export function changeAdventures(
  uid: string,
  change: (v: Adventures) => Adventures,
) {
  const task = (queues.get(uid) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const next = change(await readAdventures(uid));
      const raw = JSON.stringify(next);
      if (utf8Bytes(raw) > 1500000)
        throw new Error(
          "Local adventure storage is full. Remove an older plan or hike before saving.",
        );
      decodeAdventures(raw);
      await AsyncStorage.setItem(key(uid), raw);
      return next;
    });
  queues.set(uid, task);
  void task
    .finally(() => {
      if (queues.get(uid) === task) queues.delete(uid);
    })
    .catch(() => undefined);
  return task;
}
export function rememberPlace(uid: string, p: Place) {
  return changeAdventures(uid, (v) => ({
    ...v,
    recent: [p, ...v.recent.filter((i) => i.id !== p.id)].slice(0, 10),
  }));
}
export function clearAdventures(uid: string) {
  const task = (queues.get(uid) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(key(uid)));
  queues.set(uid, task);
  void task
    .finally(() => {
      if (queues.get(uid) === task) queues.delete(uid);
    })
    .catch(() => undefined);
  return task;
}
