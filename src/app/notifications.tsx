import { usePageLayout } from '@/hooks/usePageLayout';
import { useRef, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text } from '@/components/Typography';
import { router } from 'expo-router';
import { Backdrop, Badge, Button, Card, Heading, Notice, Reveal, Chip } from '@/components/ui';
import { CloudStatus } from '@/components/CloudStatus';
import { useInbox } from '@/hooks/useInbox';
import { useCloud } from '@/context/CloudContext';
import { actionError } from '@/lib/api';
import { registerPush, unregisterPush } from '@/services/push';
import { colors } from '@/theme/tokens';
export default function NotificationsScreen() {
  const layout = usePageLayout();
  const cloud = useCloud(); const inbox = useInbox();
  const [filter, setFilter] = useState('All'); const [settings, setSettings] = useState(false);
  const unread = inbox.items.filter(item => !item.read).length;
  const items = inbox.items.filter(item => filter === 'Unread' ? !item.read : filter === 'Invitations' ? item.type === 'invitation' : true);
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
  return <Backdrop><ScrollView contentContainerStyle={[styles.scroll, layout.page]}><Reveal><Heading title="Your trail circle." subtitle="Invitations and group alerts, delivered while you’re connected." /></Reveal><View style={styles.filters}>{['All', 'Unread', 'Invitations'].map(label => <Chip key={label} label={label === 'Unread' ? `Unread (${unread})` : label} selected={filter === label} onPress={() => setFilter(label)} />)}</View><Badge label={inbox.cached ? 'SAVED INBOX · RECONNECT TO ACT' : 'UP TO DATE'} tone={inbox.cached ? 'warning' : 'lime'} />{inbox.cached && <Text style={styles.copy}>{inbox.savedAt ? `Saved ${new Date(inbox.savedAt).toLocaleString()}. These updates may have changed.` : 'Connect to load your latest group updates.'}</Text>}<Notice message={inbox.error} /><Button label={settings ? 'Hide connection & notification settings' : 'Connection & notification settings'} variant="quiet" onPress={() => setSettings(value => !value)} />{settings && <><CloudStatus /><Button label="Enable notifications on this phone" variant="outline" busy={busy === 'push'} disabled={!cloud.ready || Boolean(busy)} onPress={() => void setPush(true)} /><Button label="Pause notifications on this phone" variant="quiet" disabled={!cloud.ready || Boolean(busy)} onPress={() => void setPush(false)} /></>}<Notice message={error} /><Notice message={success} tone="success" />
    {!items.length && <Card><Text style={styles.title}>{inbox.loading ? 'Loading updates…' : filter !== 'All' ? 'Nothing in this filter.' : inbox.live ? 'You’re all caught up.' : 'Your inbox is waiting.'}</Text><Text style={styles.copy}>{cloud.ready ? 'New invitations and alerts will appear here.' : 'Connect to load your invitations and group updates.'}</Text></Card>}
    {items.map(item => <Card key={item.id}><Badge label={item.type === 'invitation' ? 'GROUP INVITATION' : `${item.kind ?? 'GROUP'} ALERT`} tone={item.kind === 'sos' ? 'danger' : 'lime'} /><Text style={styles.title}>{item.groupName}</Text><Text style={styles.date}>{!item.read ? 'Unread · ' : 'Read · '}{item.createdAt && Number.isFinite(Date.parse(item.createdAt)) ? new Date(item.createdAt).toLocaleString() : 'Time unavailable'}</Text><Text style={styles.copy}>{item.type === 'invitation' ? `${item.inviterName} invited you to trek together.` : item.message}</Text>
      {item.type === 'invitation' && item.status === 'pending' ? <View style={styles.actions}><Button label="Accept invitation" disabled={!inbox.live || Boolean(busy)} busy={busy === item.id} onPress={() => void respond(item.groupId, item.id, 'accepted')} /><Button label="Decline" disabled={!inbox.live || Boolean(busy)} variant="quiet" onPress={() => void respond(item.groupId, item.id, 'declined')} /></View> : <Button label={item.type === 'invitation' ? `Invitation ${item.status}` : 'View alert'} disabled={!inbox.live || item.type === 'invitation' || Boolean(busy)} variant="outline" onPress={() => { if (lock.current) return; lock.current = true; setBusy(item.id); setError(''); void cloud.api(`/notifications/${item.id}/read`).then(() => router.push({ pathname: '/alert', params: { groupId: item.groupId, alertId: item.id } })).catch(failure => setError(actionError(failure))).finally(() => { lock.current = false; setBusy(''); }); }} />}
    </Card>)}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 16, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, date: { color: colors.muted, fontSize: 13, marginTop: 8 }, title: { color: colors.ink, fontSize: 23, fontWeight: '700', marginTop: 12 }, copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginVertical: 12 }, actions: { gap: 8 } });
