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
