import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Heading, Notice } from '@/components/ui';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import { useMyLocation } from '@/hooks/useMyLocation';
import { actionError, requestId } from '@/lib/api';
import { startAlarm, releaseAlarm } from '@/services/alerts';
import type { CloudAlert } from '@/types/cloud';
import { colors } from '@/theme/tokens';

export default function AlertScreen() {
  const params = useLocalSearchParams<{ groupId?: string; alertId?: string }>();
  const gid = typeof params.groupId === 'string' ? params.groupId : '';
  const cloud = useCloud(); const { userId, answers } = useNavo(); const insets = useSafeAreaInsets();
  const group = cloud.groups.find(item => item.id === gid);
  const feed = useGroupFeed<CloudAlert>(gid === 'demo' ? '' : gid, 'alerts');
  const [sentId, setSentId] = useState('');
  const event = feed.items.find(item => item.id === (sentId || params.alertId));
  const { coords, locate, state: locationState } = useMyLocation();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [sound, setSound] = useState(false); const [confirm, setConfirm] = useState(false);
  const lock = useRef(false); const eventRequest = useRef(requestId());
  const preview = gid === 'demo';
  const canResolve = event && (event.senderId === userId || group?.ownerId === userId);
  const eventId = event?.id;
  const resolvedAt = event?.resolvedAt;
  useEffect(() => {
    if (!eventId || resolvedAt || !answers.alertsEnabled) return;
    let active = true;
    void startAlarm().then(() => { if (active) setSound(true); }).catch(() => setError('Sound could not play. Check your media volume.'));
    return () => { active = false; void releaseAlarm(); };
  }, [eventId, resolvedAt, answers.alertsEnabled]);
  useEffect(() => () => { void releaseAlarm(); }, []);
  async function sendSOS() {
    if (lock.current || !group) return; lock.current = true; setBusy(true); setError('');
    try {
      const position = coords ? { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy ?? 100000, capturedAt: new Date(coords.timestamp ?? Date.now()).toISOString() } : null;
      const result = await cloud.api<{ id: string }>(`/groups/${gid}/alerts`, { kind: 'sos', requestId: eventRequest.current, confirmed: true, position });
      setSentId(result.id); setConfirm(false);
    } catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function act(action: string) {
    if (!event || lock.current) return; lock.current = true; setBusy(true);
    try { await cloud.api(`/groups/${gid}/alerts/${event.id}`, { action }); if (action === 'resolve') { await releaseAlarm(); setSound(false); } }
    catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function toggleSound() { try { if (sound) await releaseAlarm(); else await startAlarm(); setSound(!sound); } catch { setError('Sound could not play on this device.'); } }
  return <View style={{ flex: 1, backgroundColor: colors.nightDeep }}><ScrollView contentContainerStyle={{ padding: 22, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, gap: 18 }}>
    <Button label="Close" variant="quiet" onPress={() => router.back()} />
    <Badge label={preview ? 'ON-DEVICE SOUND PREVIEW' : event ? (event.resolvedAt ? 'RESOLVED' : `${event.kind.toUpperCase()} · GROUP ALERT`) : 'SOS CONFIRMATION'} tone="danger" />
    <Heading title={preview ? 'Test your phone’s alarm.' : event ? event.message : 'Need your crew’s help?'} subtitle={preview ? 'This preview is not sent to anyone.' : group?.name ?? 'Connect to your group to send or read an alert.'} />
    <Notice message={error || feed.error} />
    {event ? <Card><Text style={{ color: colors.ink, fontSize: 17 }}>{event.senderName}</Text><Text style={{ color: colors.muted, marginVertical: 12 }}>{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Syncing time'} · {event.acknowledgedBy.length} acknowledged{typeof event.recipientCount === 'number' ? ` · queued for ${event.recipientCount} members` : ''}</Text>{event.latitude !== null && event.longitude !== null && <Button label="View alert position" variant="outline" onPress={() => router.push({ pathname: '/(tabs)/map', params: { group: gid, latitude: String(event.latitude), longitude: String(event.longitude) } })} />}{!event.resolvedAt && <><Button label={event.acknowledgedBy.includes(userId) ? 'Acknowledged' : 'Acknowledge alert'} disabled={busy || event.acknowledgedBy.includes(userId)} onPress={() => void act('acknowledge')} />{canResolve && <Button label="Resolve alert" variant="outline" disabled={busy} onPress={() => void act('resolve')} />}</>}</Card> : !preview && !params.alertId && group && <>
      <Button label={coords ? 'Refresh attached position' : 'Attach my position (optional)'} variant="outline" busy={locationState === 'locating'} onPress={() => void locate()} />
      {coords && <Text style={{ color: colors.muted }}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)} · ±{Math.round(coords.accuracy ?? 0)} m</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Prepare SOS confirmation" disabled={busy} onPress={() => setConfirm(true)} onLongPress={() => void sendSOS()} delayLongPress={2000} style={{ padding: 28, borderRadius: 28, backgroundColor: colors.dangerDeep }}><Text style={{ color: colors.onAccent, fontSize: 24, fontWeight: '800', textAlign: 'center' }}>{busy ? 'Sending…' : 'Hold 2 seconds for SOS'}</Text></Pressable>
      {confirm && <Card><Text style={{ color: colors.ink, fontSize: 16, marginBottom: 16 }}>Send an SOS to connected members of {group.name}?</Text><Button label="Yes, send SOS" variant="danger" busy={busy} onPress={() => void sendSOS()} /><Button label="Cancel" variant="quiet" onPress={() => setConfirm(false)} /></Card>}
    </>}
    {params.alertId && !event && <Text style={{ color: colors.muted }}>{feed.loading ? 'Loading the alert…' : 'This alert could not be loaded. Check your connection or return to the group.'}</Text>}
    <Button label={sound ? 'Silence this phone' : 'Play alarm on this phone'} variant="outline" onPress={() => void toggleSound()} />
    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 23 }}>Group alerts require internet. Sound is limited by your phone’s media volume. Navo does not call emergency services or dispatch rescue.</Text>
    <Button label="Open emergency tools" variant="quiet" onPress={() => router.push('/safety')} />
  </ScrollView></View>;
}
