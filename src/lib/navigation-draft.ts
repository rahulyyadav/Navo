import { utf8Bytes } from '@/services/utf8';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeAdventures, type NavigationHistory } from "./adventure-store";
export type NavigationDraft = {
  version: 1;
  phase?: "paused" | "ended";
  history: NavigationHistory;
  pathEnabled: boolean;
  samples: number;
};
const queue = new Map<string, Promise<unknown>>();
function key(uid: string, id: string) {
  if (!uid || !id) throw new Error("Missing navigation owner.");
  return `navo:nav-draft:${uid}:${id}`;
}
export async function readNavigationDraft(
  uid: string,
  id: string,
): Promise<NavigationDraft | null> {
  const raw = await AsyncStorage.getItem(key(uid, id));
  if (!raw) return null;
  const v = JSON.parse(raw) as NavigationDraft;
  if (
    v.version !== 1 ||
    (v.phase !== undefined && !["paused", "ended"].includes(v.phase)) ||
    typeof v.pathEnabled !== "boolean" ||
    !Number.isInteger(v.samples) ||
    v.samples < 0 ||
    v.history?.plan?.id !== id
  )
    throw new Error("The saved navigation session could not be read.");
  decodeAdventures(
    JSON.stringify({
      version: 1,
      recent: [],
      savedPlaces: [],
      plans: [],
      history: [v.history],
    }),
  );
  return v;
}
function enqueue(k: string, action: () => Promise<void>) {
  const task = (queue.get(k) ?? Promise.resolve())
    .catch(() => undefined)
    .then(action);
  queue.set(k, task);
  void task
    .finally(() => {
      if (queue.get(k) === task) queue.delete(k);
    })
    .catch(() => undefined);
  return task;
}
export function saveNavigationDraft(
  uid: string,
  id: string,
  value: NavigationDraft,
) {
  const raw = JSON.stringify(value);
  if (utf8Bytes(raw) > 1500000)
    return Promise.reject(
      new Error("This navigation session is too large to checkpoint."),
    );
  return enqueue(key(uid, id), () => AsyncStorage.setItem(key(uid, id), raw));
}
export function clearNavigationDraft(uid: string, id: string) {
  const k = key(uid, id);
  return enqueue(k, () => AsyncStorage.removeItem(k));
}
export async function clearNavigationDrafts(uid: string) {
  const prefix = `navo:nav-draft:${uid}:`;
  await Promise.all(
    [...queue]
      .filter(([k]) => k.startsWith(prefix))
      .map(([, task]) => task.catch(() => undefined)),
  );
  const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
    k.startsWith(prefix),
  );
  await AsyncStorage.multiRemove(keys);
}
