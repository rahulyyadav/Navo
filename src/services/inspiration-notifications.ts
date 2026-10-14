import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { hikeInspiration, inspirationDates } from './hike-inspiration';

const prefix = 'navo-inspiration-';
export async function setInspirationNotifications(enabled: boolean) {
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') {
    if (!enabled) return;
    throw new Error('Use the Navo development app on your phone for hike reminders.');
  }
  const notifications = await import('expo-notifications');
  if (enabled) {
    if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('hike-inspiration', { name: 'Hike inspiration', importance: notifications.AndroidImportance.DEFAULT });
    const permission = await notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Notifications are disabled. Enable them in your phone settings to receive reminders.');
  }
  const pending = await notifications.getAllScheduledNotificationsAsync();
  for (const item of pending) if (item.identifier.startsWith(prefix)) await notifications.cancelScheduledNotificationAsync(item.identifier);
  if (!enabled) return;
  const offset = Math.floor(Math.random() * hikeInspiration.length);
  try {
    for (const [index, date] of inspirationDates().entries()) await notifications.scheduleNotificationAsync({
      identifier: `${prefix}${index}`,
      content: { title: 'A little time outdoors?', body: hikeInspiration[(offset + index) % hikeInspiration.length], data: { kind: 'hike-inspiration' }, sound: 'default' },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'hike-inspiration' },
    });
  } catch (error) {
    for (let index = 0; index < 4; index++) await notifications.cancelScheduledNotificationAsync(`${prefix}${index}`).catch(() => undefined);
    throw error;
  }
}
