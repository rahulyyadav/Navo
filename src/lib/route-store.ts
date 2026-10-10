import { utf8Bytes } from '@/services/utf8';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeRoutes, type ImportedRoute } from '@/services/routes/gpx';
const key = (uid: string) => { if (!uid) throw new Error('Sign in to save routes.'); return `navo:imported-routes:${uid}`; };
const queues = new Map<string, Promise<unknown>>();
export async function readRoutes(uid: string) { return decodeRoutes(await AsyncStorage.getItem(key(uid))); }
export function updateRoutes(uid: string, change: (routes: ImportedRoute[]) => ImportedRoute[]) {
  const previous = queues.get(uid) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const next = change(await readRoutes(uid));
    if (next.length > 20) throw new Error('You have 20 saved routes. Remove one before adding another.');
    const raw = JSON.stringify(next); if(utf8Bytes(raw)>1500000) throw new Error('Local route storage is full. Export or remove an older route before saving.'); decodeRoutes(raw);
    await AsyncStorage.setItem(key(uid), raw); return next;
  });
  queues.set(uid, task); void task.finally(() => { if (queues.get(uid) === task) queues.delete(uid); }).catch(() => undefined); return task;
}
export function clearRoutes(uid: string) {
  const task = (queues.get(uid) ?? Promise.resolve()).catch(() => undefined).then(() => AsyncStorage.removeItem(key(uid)));
  queues.set(uid, task);
  void task.finally(() => { if (queues.get(uid) === task) queues.delete(uid); }).catch(() => undefined);
  return task;
}
