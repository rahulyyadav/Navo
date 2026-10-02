import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'navo:';

async function readRaw(key: string): Promise<string | null> {
  return AsyncStorage.getItem(PREFIX + key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, value);
}

async function dropRaw(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await readRaw(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  await writeRaw(key, JSON.stringify(value));
}

export { dropRaw };

/** Remove only this account's explicitly downloaded trip data. */
export async function clearTripDownloads(userId: string) {
  if (!userId) return;
  const prefixes = ['offline-pack', 'ai-plan', 'preparation'].map(kind => `${PREFIX}${kind}:${userId}:`);
  const keys = (await AsyncStorage.getAllKeys()).filter(key => prefixes.some(prefix => key.startsWith(prefix)));
  await AsyncStorage.multiRemove(keys);
}
