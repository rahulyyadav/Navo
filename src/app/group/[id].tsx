import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Backdrop, Badge, Button, Card, Chip, Field, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { CloudStatus } from '@/components/CloudStatus';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import { useMyLocation } from '@/hooks/useMyLocation';
import { actionError, requestId } from '@/lib/api';
import { normalizeEmail, validEmail } from '@/services/auth-errors';
import { timeAgo } from '@/services/format';
import { colors, radius } from '@/theme/tokens';
import type { CloudAlert, CloudMember, CloudMessage } from '@/types/cloud';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const gid = typeof id === 'string' ? id : '';
  const cloud = useCloud(); const { userId } = useNavo();
  const group = cloud.groups.find(item => item.id === gid);
  const members = useGroupFeed<CloudMember>(gid, 'members');
  const messages = useGroupFeed<CloudMessage>(gid, 'messages');
  const alerts = useGroupFeed<CloudAlert>(gid, 'alerts');
  const { locate, state: gpsState } = useMyLocation();
  const [tab, setTab] = useState('Crew'); const [email, setEmail] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const lock = useRef(false); const pending = useRef({ text: '', id: requestId() }); const list = useRef<ScrollView>(null);
  async function action(name: string, run: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(name); setError(''); setSuccess('');
    try { await run(); } catch (failure) { setError(actionError(failure)); } finally { setBusy(''); lock.current = false; }
  }
  function invite() { return action('invite', async () => {
    if (!validEmail(normalizeEmail(email))) throw new Error('Enter a valid email address.');
    await cloud.api(`/groups/${gid}/invites`, { email: normalizeEmail(email) }); setEmail(''); setSuccess('Invitation sent to their Navo inbox.');
  }); }
  function send() { return action('message', async () => {
    const text = message.trim(); if (!text) return;
    if (pending.current.text !== text) pending.current = { text, id: requestId() };
    await cloud.api(`/groups/${gid}/messages`, { text, requestId: pending.current.id }); setMessage(''); pending.current = { text: '', id: requestId() };
  }); }
  function checkin() { return action('checkin', async () => {
    const coords = await locate(); if (!coords) throw new Error('No GPS fix. Enable location permission or try outdoors.');
    await cloud.api(`/groups/${gid}/checkins`, { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy ?? 100000, capturedAt: new Date(coords.timestamp ?? Date.now()).toISOString() }); setSuccess('Checked in. Your latest position is shared with this group.');
  }); }
  function testAlert() { return action('test', async () => { const result = await cloud.api<{ id: string }>(`/groups/${gid}/alerts`, { kind: 'test', requestId: requestId() }); router.push({ pathname: '/alert', params: { groupId: gid, alertId: result.id } }); }); }
  if (!group) return <Backdrop><View style={styles.scroll}><Heading title="Connecting to your crew." subtitle="This group appears after Firebase confirms your membership." /><CloudStatus /><Button label="Back to groups" onPress={() => router.replace('/(tabs)/groups')} /></View></Backdrop>;
  return <Backdrop><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}><ScrollView ref={list} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Reveal><Badge label={`${group.members.length} MEMBERS · ${group.startDate}`} tone="lime" /><Heading title={group.name} subtitle="Stay close, even when the trail opens up." /></Reveal>
    <CloudStatus /><View style={styles.row}>{['Crew', 'Chat', 'Safety'].map(name => <Chip key={name} label={name} selected={tab === name} onPress={() => setTab(name)} />)}</View>
    <Notice message={error || members.error || messages.error || alerts.error} />{success && <Notice message={success} tone="info" />}
    {(members.error || messages.error || alerts.error) && <Button label="Retry group feeds" variant="outline" onPress={() => { members.retry(); messages.retry(); alerts.retry(); }} />}
    {tab === 'Crew' && <>
      <SectionTitle title="YOUR PEOPLE" />
      {members.loading && <Text style={styles.copy}>Loading members…</Text>}
      {members.items.map(member => <Card key={member.id}><View style={styles.row}><Avatar name={member.name} size={44} /><View style={{ flex: 1 }}><Text style={styles.name}>{member.name}{member.id === userId ? ' (you)' : ''}</Text><Text style={styles.copy}>{member.id === group.ownerId ? 'Owner' : 'Member'}</Text></View></View>{member.lastLocation && <Text style={styles.copy}>Last shared {timeAgo(member.lastLocationAt ?? '')} · {member.lastLocation.latitude.toFixed(4)}, {member.lastLocation.longitude.toFixed(4)} · ±{Math.round(member.lastLocation.accuracy)} m</Text>}{group.ownerId === userId && member.id !== userId && <Button label="Remove member" variant="quiet" disabled={Boolean(busy)} onPress={() => void action('remove', async () => { await cloud.api(`/groups/${gid}/members/${member.id}`, undefined, 'DELETE'); })} />}</Card>)}
      {group.ownerId === userId && <Card><SectionTitle title="INVITE A TEAMMATE" /><Field label="Their Navo email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} placeholder="teammate@example.com" /><Button label="Send invitation" busy={busy === 'invite'} disabled={Boolean(busy) || !cloud.ready} onPress={() => void invite()} /><Text style={styles.copy}>They must have connected to Navo once. Invitations arrive in their in-app inbox.</Text></Card>}
    </>}
    {tab === 'Chat' && <>
      <Text style={styles.copy}>{messages.cached ? 'Cached messages · reconnecting' : 'Latest 100 messages'} · messages send only while connected.</Text>
      {!messages.items.length && <Card><Text style={styles.name}>Start the conversation.</Text><Text style={styles.copy}>Meet here before you meet at the trailhead.</Text></Card>}
      {[...messages.items].reverse().map(item => <View key={item.id} style={[styles.bubble, item.senderId === userId && styles.own, item.type === 'system' && styles.system]}><Text style={styles.sender}>{item.senderName} · {item.createdAt ? timeAgo(item.createdAt) : 'Syncing'}</Text><Text style={styles.message}>{item.text}</Text></View>)}
      <Field label="Message your crew" multiline value={message} editable={!busy} onChangeText={setMessage} placeholder="What’s the plan for tomorrow?" maxLength={2000} /><Button label={busy === 'message' ? 'Sending…' : 'Send message'} disabled={!message.trim() || Boolean(busy)} busy={busy === 'message'} onPress={() => void send()} /><Text style={styles.copy}>If sending fails, your draft stays here. Retry uses the same message ID to avoid duplicates.</Text>
    </>}
    {tab === 'Safety' && <>
      <Button label="Check in safe & share position" disabled={Boolean(busy)} busy={busy === 'checkin' || gpsState === 'locating'} onPress={() => void checkin()} /><Button label="View group positions" variant="outline" onPress={() => router.push({ pathname: '/(tabs)/map', params: { group: gid, trek: group.trekId } })} />
      <Button label="Stop showing my last position" variant="quiet" onPress={() => void action('stop', async () => { await cloud.api(`/groups/${gid}/location`, undefined, 'DELETE'); setSuccess('Your current member position is hidden. Previous check-in events remain in group history.'); })} />
      {group.ownerId === userId && <Button label="Send test group alert" variant="outline" disabled={Boolean(busy)} busy={busy === 'test'} onPress={() => void testAlert()} />}
      <Button label="SOS · open confirmation" variant="danger" onPress={() => router.push({ pathname: '/alert', params: { groupId: gid, kind: 'sos' } })} />
      <Text style={styles.copy}>SOS notifies connected group members. It does not call emergency services. Off-route detection is unavailable until a verified trail track is supplied.</Text>
      <SectionTitle title="RECENT GROUP ALERTS" />{alerts.items.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/alert', params: { groupId: gid, alertId: item.id } })}><Card><Badge label={item.resolvedAt ? 'RESOLVED' : item.kind.toUpperCase()} tone={item.kind === 'sos' && !item.resolvedAt ? 'danger' : 'neutral'} /><Text style={styles.name}>{item.message}</Text><Text style={styles.copy}>{item.createdAt ? timeAgo(item.createdAt) : 'Syncing'} · {item.acknowledgedBy.length} acknowledged</Text></Card></Pressable>)}
    </>}
    <Button label="Save an offline trip pack" variant="quiet" onPress={() => router.push({ pathname: '/offline', params: { group: gid, trek: group.trekId } })} />
  </ScrollView></KeyboardAvoidingView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, name: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 8 }, copy: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 6 }, bubble: { padding: 16, borderRadius: radius.md, backgroundColor: colors.navy, maxWidth: '92%', alignSelf: 'flex-start' }, own: { alignSelf: 'flex-end', backgroundColor: colors.slate, borderColor: 'rgba(228,255,137,.3)', borderWidth: 1 }, system: { alignSelf: 'center', backgroundColor: 'transparent' }, sender: { color: colors.lime, fontSize: 11, marginBottom: 6 }, message: { color: colors.ink, fontSize: 16, lineHeight: 24 } });
