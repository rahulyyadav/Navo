import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeAdventures } from './adventure-store';
import type { RoutePlan } from '@/services/routing/types';
const key = 'navo:pending-walking-signin';
// Created only by an explicit guest sign-in action. Expires after one hour.
export async function stageWalkingPlan(plan: RoutePlan) {
  await AsyncStorage.setItem(key, JSON.stringify({ plan, expires: Date.now() + 3600000, owner: null }));
}
export async function pendingWalkingPlan(uid: string): Promise<RoutePlan | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    if (raw.length > 4000000) throw Error('Too large');
    const value = JSON.parse(raw);
    if (!Number.isFinite(value.expires) || value.expires < Date.now()) throw Error('Expired');
    if (value.owner && value.owner !== uid) return null;
    const plan = decodeAdventures(JSON.stringify({ version: 1, recent: [], savedPlaces: [], history: [], plans: [value.plan] })).plans[0];
    if (!value.owner) await AsyncStorage.setItem(key, JSON.stringify({ ...value, owner: uid }));
    return plan;
  } catch { await AsyncStorage.removeItem(key); return null; }
}
export async function clearPendingWalkingPlan() { await AsyncStorage.removeItem(key); }
