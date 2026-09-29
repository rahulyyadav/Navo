import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop, Badge, Button, Card, Heading, Reveal } from '@/components/ui';
import { CloudStatus } from '@/components/CloudStatus';
import { useCloud } from '@/context/CloudContext';
import { trekById } from '@/data/treks';
import { formatDate } from '@/services/format';
import { colors } from '@/theme/tokens';
export default function GroupsScreen() {
  const cloud = useCloud(); const insets = useSafeAreaInsets();
  const pending = cloud.notifications.filter(item => !item.read).length;
  return <Backdrop><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}><Reveal><Heading title="Better, together." subtitle="Your crew, conversations and check-ins. One shared place for the journey ahead." /></Reveal><CloudStatus />
    <Button label={`Invitations & updates${pending ? ` · ${pending}` : ''}`} variant="outline" onPress={() => router.push('/notifications')} />
    <Button label="Create a group" disabled={!cloud.ready} onPress={() => router.push('/group/new')} />
    {!cloud.groups.length && <Card><Text style={styles.title}>Find your trail circle.</Text><Text style={styles.copy}>Create a group or accept an invitation to start planning together.</Text></Card>}
    {cloud.groups.map(group => <Reveal key={group.id}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${group.name}`} onPress={() => router.push(`/group/${group.id}`)}><Card><View style={styles.row}><Badge label={group.members.length === 1 ? '1 MEMBER' : `${group.members.length} MEMBERS`} tone="lime" /><Text style={styles.arrow}>↗</Text></View><Text style={styles.title}>{group.name}</Text><Text style={styles.copy}>{trekById(group.trekId)?.name ?? 'Trek'} · {formatDate(group.startDate)}</Text><Text style={styles.detail}>Chat · team · check-ins · alerts</Text></Card></Pressable></Reveal>)}
    <Text style={styles.copy}>In-app alerts need a connection and an active app. Background push needs a configured development build and push worker. Navo does not dispatch rescue.</Text>
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 40, gap: 16 }, title: { color: colors.white, fontSize: 24, fontWeight: '700', marginTop: 12 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }, detail: { color: colors.lime, fontSize: 13, marginTop: 16 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, arrow: { color: colors.lime, fontSize: 26 } });
