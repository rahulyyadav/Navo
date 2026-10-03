import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backdrop, Button, Card, Heading, Notice } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { useCloud } from '@/context/CloudContext';
import { CloudStatus } from '@/components/CloudStatus';
import { actionError } from '@/lib/api';
import { colors } from '@/theme/tokens';
const PENDING_INVITE = 'navo:pending-invite';
export default function JoinScreen() {
  const params = useLocalSearchParams<{ group: string; token: string }>();
  const group = typeof params.group === 'string' ? params.group : '';
  const token = typeof params.token === 'string' ? params.token : '';
  const valid = /^[a-zA-Z0-9]{1,80}$/.test(group) && /^[a-zA-Z0-9_-]{43}$/.test(token);
  const { isSignedIn, needsOnboarding } = useNavo(); const cloud = useCloud();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  const member = cloud.groups.some(item => item.id === group);
  useEffect(() => { if (valid) void AsyncStorage.setItem(PENDING_INVITE, JSON.stringify({ group, token })).catch(() => setError('Could not save this invitation. Keep the link to open again after signing in.')); }, [valid, group, token]);
  return <Backdrop><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}><Heading title={member ? 'Your crew is ready.' : sent ? 'Your request is with the leader.' : 'A trail is better together.'} subtitle="Private group invitation" /><Card><Text style={{ color: colors.muted, lineHeight: 23 }}>{sent ? 'You will see the group in Groups once the leader approves you. You can leave this screen.' : 'Sign in with your own account, then request to join. Your name is shared with the group leader. Group messages and locations stay private until approval.'}</Text></Card><Notice message={error || (!valid ? 'This invitation is incomplete. Ask the leader to share a new link.' : '')} />
    {!isSignedIn ? <Button label="Sign in to continue" disabled={!valid} onPress={() => router.push('/login')} /> : needsOnboarding ? <Button label="Finish your profile" onPress={() => router.push('/welcome')} /> : <><CloudStatus />{member ? <Button label="Open your group" onPress={() => { void AsyncStorage.removeItem(PENDING_INVITE); router.replace(`/group/${group}`); }} /> : <Button label={sent ? 'Request sent · awaiting approval' : 'Request to join'} busy={busy} disabled={!valid || !cloud.ready || busy || sent} onPress={() => { setBusy(true); setError(''); void cloud.api<{ status: string }>(`/groups/${group}/join-requests`, { token }).then(async () => { setSent(true); await AsyncStorage.removeItem(PENDING_INVITE); }).catch(failure => setError(actionError(failure))).finally(() => setBusy(false)); }} />}</>}
    <Button label="Close invitation" variant="quiet" onPress={() => { void AsyncStorage.removeItem(PENDING_INVITE); router.replace(isSignedIn ? (needsOnboarding ? '/welcome' : '/(tabs)/groups') : '/login'); }} />
  </ScrollView></Backdrop>;
}
