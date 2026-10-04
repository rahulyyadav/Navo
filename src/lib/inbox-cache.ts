import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CloudNotification } from '@/types/cloud';
const key = (uid: string) => { if (!uid) throw new Error('Account required'); return 'navo:inbox:' + uid; };
export type InboxCache = { savedAt: string; items: CloudNotification[] };
export function decodeInbox(raw: string, now = Date.now()): InboxCache {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt)) || Date.parse(value.savedAt) > now + 60000 || now - Date.parse(value.savedAt) > 7 * 86400000 || !Array.isArray(value.items) || value.items.length > 50) throw new Error('Inbox cache unavailable');
  for (const item of value.items) {
    if (!item || typeof item !== 'object' || !['invitation', 'alert'].includes(item.type) || typeof item.read !== 'boolean' || !['id','groupId'].every(field => typeof item[field] === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(item[field])) || typeof item.groupName !== 'string' || item.groupName.length > 200 || !['message','kind','status','inviterName','senderName','createdAt'].every(field => item[field] === undefined || (typeof item[field] === 'string' && item[field].length <= 2000))) throw new Error('Inbox cache unavailable');
  }
  return { savedAt: value.savedAt, items: value.items };
}
const queues = new Map<string, Promise<unknown>>();
function enqueue<T>(uid: string, action: () => Promise<T>): Promise<T> {
  const task = (queues.get(uid) ?? Promise.resolve()).catch(() => undefined).then(action);
  queues.set(uid, task);
  void task.finally(() => { if (queues.get(uid) === task) queues.delete(uid); }).catch(() => undefined);
  return task;
}
export async function readInbox(uid: string): Promise<InboxCache | null> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value?.version === 1 && typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) && Date.now() - Date.parse(value.savedAt) > 7 * 86400000) {
    await enqueue(uid, async () => { if (await AsyncStorage.getItem(key(uid)) === raw) await AsyncStorage.removeItem(key(uid)); });
    return null;
  }
  return decodeInbox(raw);
}
export function saveInbox(uid: string, items: CloudNotification[]) {
  const raw = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), items: items.slice(0,50) });
  const decoded = decodeInbox(raw);
  return enqueue(uid, async () => { await AsyncStorage.setItem(key(uid), raw); return decoded; });
}
export function clearInbox(uid: string) { return enqueue(uid, () => AsyncStorage.removeItem(key(uid))); }
