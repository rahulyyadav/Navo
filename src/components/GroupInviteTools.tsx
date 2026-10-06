import { Text } from '@/components/Typography';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Button, Card, Notice, SectionTitle } from './ui';
import { useCloud } from '@/context/CloudContext';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import { actionError } from '@/lib/api';
import { colors } from '@/theme/tokens';

export function GroupInviteTools({ groupId }: { groupId: string }) {
  const cloud = useCloud();
  const requests = useGroupFeed<{ id: string; displayName: string; status: string }>(groupId, 'joinRequests');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (failure) { setError(actionError(failure)); } finally { setBusy(false); }
  }
  return <Card><SectionTitle title="BRING YOUR PEOPLE" />
    <Text style={{ color: colors.muted, lineHeight: 21 }}>Share a private link. New members sign in and request your approval before they can see this group. Links expire in 7 days.</Text>
    <Notice message={error || requests.error} /><Notice message={notice} tone="info" />
    <Button label={link ? 'Replace invitation link' : 'Create invitation link'} busy={busy} disabled={busy || !cloud.ready} onPress={() => void run(async () => {
      const result = await cloud.api<{ token: string }>(`/groups/${groupId}/join-link`);
      const origin = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.replace(/\/$/, '');
      const path = `join?group=${encodeURIComponent(groupId)}&token=${encodeURIComponent(result.token)}`;
      setLink(origin ? `${origin}/${path}` : Linking.createURL('join', { queryParams: { group: groupId, token: result.token } }));
      setNotice('Link ready. Creating another link invalidates the previous one.');
    })} />
    {link && <><Text selectable style={{ color: colors.muted, fontSize: 12, marginVertical: 12 }}>{link}</Text><Button label={Platform.OS === 'web' ? 'Copy invitation link' : 'Share invitation link'} variant="outline" onPress={() => void run(async () => {
      if (Platform.OS === 'web') { await Clipboard.setStringAsync(link); setNotice('Link copied.'); }
      else await Share.share({ message: `Join our Navo trek group. The leader approves new members. ${link}` });
    })} /></>}
    <Button label="Revoke active link" variant="quiet" disabled={busy || !cloud.ready} onPress={() => void run(async () => { await cloud.api(`/groups/${groupId}/join-link`, undefined, 'DELETE'); setLink(''); setNotice('The active link is revoked. Already submitted requests can still be reviewed below.'); })} />
    {requests.items.filter(item => item.status === 'pending').map(item => <View key={item.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, gap: 8 }}><Text style={{ color: colors.ink, fontWeight: '700' }}>{item.displayName} wants to join</Text>{(['approved', 'declined'] as const).map(decision => <Button key={decision} label={decision === 'approved' ? 'Approve member' : 'Decline request'} variant={decision === 'approved' ? 'outline' : 'quiet'} disabled={busy} onPress={() => void run(async () => { await cloud.api(`/groups/${groupId}/join-requests/${encodeURIComponent(item.id)}/respond`, { decision }); setNotice(decision === 'approved' ? 'Member added to your crew.' : 'Request declined.'); })} />)}</View>)}
  </Card>;
}
