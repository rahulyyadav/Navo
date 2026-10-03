import { useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Backdrop, Badge, Button, Card, Heading, Notice, Reveal } from '@/components/ui';
import { CloudStatus } from '@/components/CloudStatus';
import { useCloud } from '@/context/CloudContext';
import { actionError } from '@/lib/api';
import { registerPush, unregisterPush } from '@/services/push';
import { colors } from '@/theme/tokens';
export default function NotificationsScreen() {
  const cloud = useCloud();
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const lock = useRef(false);
  const [success, setSuccess] = useState('');
  async function setPush(enabled: boolean) {
    if (lock.current) return; lock.current = true; setBusy('push'); setError(''); setSuccess('');
    try { if (enabled) await registerPush(cloud.api); else await unregisterPush(cloud.api); setSuccess(enabled ? 'Notifications are enabled for this phone.' : 'Remote notifications are paused for this account on this phone.'); }
    catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(''); }
  }
  async function respond(group: string, id: string, decision: string) {
    if (lock.current) return; lock.current = true; setBusy(id); setError('');
    try { await cloud.api(`/groups/${group}/invites/${id}/respond`, { decision }); if (decision === 'accepted') router.push(`/group/${group}`); }
    catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(''); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll}><Reveal><Heading title="Your trail circle." subtitle="Invitations and group alerts, delivered while you’re connected." /></Reveal><CloudStatus /><Button label="Enable notifications on this phone" variant="outline" busy={busy === 'push'} disabled={!cloud.ready || Boolean(busy)} onPress={() => void setPush(true)} /><Button label="Pause notifications on this phone" variant="quiet" disabled={!cloud.ready || Boolean(busy)} onPress={() => void setPush(false)} /><Notice message={error} /><Notice message={success} tone="success" />
    {!cloud.notifications.length && <Card><Text style={styles.title}>{cloud.ready ? 'You’re all caught up.' : 'Your inbox is waiting.'}</Text><Text style={styles.copy}>{cloud.ready ? 'New invitations and alerts will appear here.' : 'Connect to load your invitations and group updates.'}</Text></Card>}
    {cloud.notifications.map(item => <Card key={item.id}><Badge label={item.type === 'invitation' ? 'GROUP INVITATION' : `${item.kind ?? 'GROUP'} ALERT`} tone={item.kind === 'sos' ? 'danger' : 'lime'} /><Text style={styles.title}>{item.groupName}</Text><Text style={styles.copy}>{item.type === 'invitation' ? `${item.inviterName} invited you to trek together.` : item.message}</Text>
      {item.type === 'invitation' && item.status === 'pending' ? <View style={styles.actions}><Button label="Accept invitation" disabled={Boolean(busy)} busy={busy === item.id} onPress={() => void respond(item.groupId, item.id, 'accepted')} /><Button label="Decline" disabled={Boolean(busy)} variant="quiet" onPress={() => void respond(item.groupId, item.id, 'declined')} /></View> : <Button label={item.type === 'invitation' ? `Invitation ${item.status}` : 'View alert'} disabled={item.type === 'invitation'} variant="outline" onPress={() => { void cloud.api(`/notifications/${item.id}/read`).catch(failure => setError(actionError(failure))); router.push({ pathname: '/alert', params: { groupId: item.groupId, alertId: item.id } }); }} />}
    </Card>)}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 40, gap: 16 }, title: { color: colors.ink, fontSize: 23, fontWeight: '700', marginTop: 12 }, copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginVertical: 12 }, actions: { gap: 8 } });
