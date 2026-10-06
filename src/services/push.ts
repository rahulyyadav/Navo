import { firebaseAuth } from '@/lib/firebase';
import { readJSON, writeJSON, dropRaw } from '@/lib/storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { requestAPI } from '@/lib/api';
export async function registerPush(api: <T>(path: string, body?: unknown, method?: string) => ReturnType<typeof requestAPI<T>>) {
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') throw new Error('Remote notifications require a Navo development build on a physical phone. The in-app inbox works in Expo Go.');
  const notifications = await import('expo-notifications');
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('trek-alerts', { name: 'Trek alerts', importance: notifications.AndroidImportance.HIGH });
  const permission = await notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Notifications are disabled. You can still use the in-app inbox.');
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Configure this app’s EAS project ID before registering push notifications.');
  const token = await notifications.getExpoPushTokenAsync({ projectId });
  const registration = { token: token.data, platform: Platform.OS };
  await api('/devices', registration);
  if (firebaseAuth?.currentUser) await writeJSON(`push-device:${firebaseAuth.currentUser.uid}`, registration);
}

export async function unregisterPush(api: <T>(path: string, body?: unknown, method?: string) => ReturnType<typeof requestAPI<T>>) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) return;
  const key = `push-device:${uid}`;
  const registration = await readJSON<{ token: string; platform: string }>(key);
  if (!registration) return;
  await api('/devices', registration, 'DELETE');
  await dropRaw(key);
}
