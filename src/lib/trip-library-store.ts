import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeLibrary, emptyLibrary, type TripLibrary } from '@/services/trip-library';

const queues = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const key = (userId: string) => { if (!userId) throw new Error('Sign in to save your trips.'); return 'navo:trip-library:' + userId; };
export async function readLibrary(userId: string) {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return emptyLibrary();
  try { return decodeLibrary(JSON.parse(raw)); } catch { throw new Error('Your saved trips could not be read. They have been kept unchanged.'); }
}
export function changeLibrary(userId: string, change: (current: TripLibrary) => TripLibrary): Promise<TripLibrary> {
  const task = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const next = decodeLibrary(change(await readLibrary(userId)));
    await AsyncStorage.setItem(key(userId), JSON.stringify(next));
    listeners.get(userId)?.forEach(listener => listener());
    return next;
  });
  queues.set(userId, task);
  void task.finally(() => { if (queues.get(userId) === task) queues.delete(userId); }).catch(() => undefined);
  return task;
}
export function subscribeLibrary(userId: string, listener: () => void) {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId)!.add(listener);
  return () => { listeners.get(userId)?.delete(listener); if (!listeners.get(userId)?.size) listeners.delete(userId); };
}

export function clearLibrary(userId: string): Promise<void> {
  const task = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    await AsyncStorage.removeItem(key(userId));
    listeners.get(userId)?.forEach(listener => listener());
  });
  queues.set(userId, task);
  void task.finally(() => { if (queues.get(userId) === task) queues.delete(userId); }).catch(() => undefined);
  return task;
}
