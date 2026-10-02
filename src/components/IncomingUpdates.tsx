import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCloud } from '@/context/CloudContext';
import { useFirebaseAuth } from '@/context/AuthContext';
import { Reveal } from './ui';
import type { CloudNotification } from '@/types/cloud';
import { colors } from '@/theme/tokens';

/** Foreground updates work in Expo Go; remote taps require a development build. */
export function IncomingUpdates() {
  const { user } = useFirebaseAuth();
  const { notifications, ready } = useCloud();
  const insets = useSafeAreaInsets();
  const known = useRef<{ uid: string; ids: Set<string> } | null>(null);
  const [incoming, setIncoming] = useState<{ uid: string; item: CloudNotification } | null>(null);
  useEffect(() => {
    if (!ready || !user) return;
    const ids = new Set(notifications.map(item => item.id));
    const previous = known.current;
    known.current = { uid: user.uid, ids };
    if (!previous || previous.uid !== user.uid) return;
    const item = notifications.find(item => !item.read && !previous.ids.has(item.id));
    if (!item) return;
    // Schedule after the snapshot so rendering never mutates listener state.
    const show = setTimeout(() => setIncoming({ uid: user.uid, item }), 0);
    return () => clearTimeout(show);
  }, [notifications, ready, user]);

  useEffect(() => {
    if (!incoming) return;
    const timer = setTimeout(() => setIncoming(null), 8000);
    return () => clearTimeout(timer);
  }, [incoming]);

  useEffect(() => {
    if (!user || Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return;
    let active = true;
    let remove: (() => void) | undefined;
    const seen = new Set<string>();
    void import('expo-notifications').then(async notificationsAPI => {
      if (!active) return;
      const handle = (response: import('expo-notifications').NotificationResponse) => {
        if (!active || seen.has(response.notification.request.identifier)) return;
        seen.add(response.notification.request.identifier);
        const { groupId, alertId } = response.notification.request.content.data ?? {};
        if (typeof groupId === 'string' && /^[a-zA-Z0-9]{1,80}$/.test(groupId) && typeof alertId === 'string' && /^[a-zA-Z0-9]{1,80}$/.test(alertId)) {
          router.push({ pathname: '/alert', params: { groupId, alertId } });
        }
      };
      const listener = notificationsAPI.addNotificationResponseReceivedListener(handle);
      remove = () => listener.remove();
      const response = await notificationsAPI.getLastNotificationResponseAsync();
      if (response) { handle(response); await notificationsAPI.clearLastNotificationResponseAsync(); }
    }).catch(() => { /* The Firestore inbox remains available without native push setup. */ });
    return () => { active = false; remove?.(); };
  }, [user]);

  if (!incoming || incoming.uid !== user?.uid) return null;
  return <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}><Reveal>
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Pressable accessibilityRole="button" accessibilityLabel="Open new group update" style={styles.content} onPress={() => { setIncoming(null); router.push('/notifications'); }}>
        <Text style={styles.kicker}>{incoming.item.type === 'invitation' ? 'YOU’RE INVITED' : 'YOUR CREW HAS AN UPDATE'}</Text>
        <Text numberOfLines={2} style={styles.title}>{incoming.item.groupName}</Text>
        <Text style={styles.copy}>Tap to open your inbox</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss update" style={styles.dismiss} onPress={() => setIncoming(null)}><Text style={styles.title}>×</Text></Pressable>
    </View>
  </Reveal></View>;
}
const styles = StyleSheet.create({ overlay: { position: 'absolute', left: 16, right: 16, zIndex: 100 }, banner: { backgroundColor: colors.night, borderColor: colors.lime, borderWidth: 1, borderRadius: 24, flexDirection: 'row', padding: 8 }, content: { flex: 1, padding: 12, gap: 5 }, kicker: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 17, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 12 }, dismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
