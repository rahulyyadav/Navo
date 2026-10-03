import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Backdrop, Badge, Card, Chip, Eyebrow, Field, Reveal, SectionTitle, relayout } from '@/components/ui';
import { TrekCard } from '@/components/TrekCard';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { treks } from '@/data/treks';
import { goalLabels } from '@/data/onboarding';
import { useCloud } from '@/context/CloudContext';
import { colors, radius, space } from '@/theme/tokens';

const ALL = 'All Nepal';

export default function DiscoverScreen() {
  const cloud = useCloud();
  const unread = cloud.notifications.filter(item => !item.read).length;
  const insets = useSafeAreaInsets();
  const { profile, imageUrl, groups, answers } = useNavo();
  const [region, setRegion] = useState(ALL);
  const [search, setSearch] = useState('');

  const regions = useMemo(() => [ALL, ...Array.from(new Set(treks.map(trek => trek.region)))], []);
  const visible = useMemo(
    () => treks.filter(trek => (region === ALL || trek.region === region) && `${trek.name} ${trek.region} ${trek.difficulty}`.toLowerCase().includes(search.trim().toLowerCase())),
    [region, search],
  );

  const firstName = (profile?.fullName ?? answers.fullName).split(/\s+/).filter(Boolean)[0] ?? 'trekker';
  const goals = goalLabels(profile?.goals ?? answers.goals);

  return (
    <Backdrop>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Reveal>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Eyebrow>NAVO · NEPAL</Eyebrow>
              <Text style={styles.greeting} numberOfLines={2}>Namaste, {firstName}.</Text>
              <Text style={styles.email}>A little preparation. A better day outside.</Text>
            </View>
            <Avatar name={profile?.fullName ?? answers.fullName} size={54} uri={imageUrl} />
          </View>
        </Reveal>

        <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')} style={styles.inbox}><View style={{ flex: 1 }}><Text style={styles.footerTitle}>{unread ? `${unread} new trail updates` : 'Your trail inbox'}</Text><Text style={styles.footerDetail}>Invitations, check-ins and group alerts</Text></View><Text style={styles.seeAll}>Open →</Text></Pressable>
        <Reveal delay={60}>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/map')} style={({ pressed }) => [styles.action, styles.actionLime, pressed && styles.pressed]}>
              <TabIcon color={colors.onAccent} name="compass" size={22} />
              <Text style={styles.actionTitle}>Trail map</Text>
              <Text style={styles.actionDetail}>Regions & waypoints →</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/day-hike')} style={({ pressed }) => [styles.action, styles.actionDark, pressed && styles.pressed]}>
              <TabIcon color={colors.danger} name="route" size={22} />
              <Text style={styles.actionTitleLight}>Plan a day hike</Text>
              <Text style={styles.actionDetailLight}>Kathmandu & anywhere →</Text>
            </Pressable>
          </View>
        </Reveal>

        {groups.length > 0 && (
          <Reveal delay={90}>
            <View style={styles.groupStrip}>
              <SectionTitle
                action={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/groups')}><Text style={styles.seeAll}>See all</Text></Pressable>}
                title="YOUR GROUPS"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
                {groups.slice(0, 4).map(group => (
                  <Pressable key={group.id} accessibilityRole="button" onPress={() => router.push(`/group/${group.id}`)} style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}>
                    <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                    <View style={styles.groupMeta}>
                      <TabIcon color={colors.lime} name="group" size={15} />
                      <Text style={styles.groupMetaText}>{group.members.length}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Reveal>
        )}

        <Reveal delay={110}>
          <SectionTitle title="FIND YOUR NEXT TREK" />
        </Reveal>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {regions.map(name => (
            <Chip key={name} label={name} onPress={() => setRegion(name)} selected={region === name} />
          ))}
        </ScrollView>

        <Field label="Find your next trek" placeholder="Try Langtang or moderate" value={search} onChangeText={setSearch} />
        {visible.length === 0 && <Text style={styles.footerDetail}>No treks match. Try another region or search.</Text>}
        <Animated.View layout={relayout} style={styles.list}>
          {visible.map(trek => (
            <Animated.View key={trek.id} layout={relayout}>
              <TrekCard onPress={() => router.push(`/trek/${trek.id}`)} trek={trek} />
            </Animated.View>
          ))}
        </Animated.View>

        {goals.length > 0 && (
          <Card style={styles.tasteCard}>
            <Eyebrow>TUNED TO YOU</Eyebrow>
            <Text style={styles.tasteTitle}>You said you’re after</Text>
            <View style={styles.tasteRow}>
              {goals.map(goal => <Badge key={goal} label={goal} tone="lime" />)}
            </View>
          </Card>
        )}

        <View style={styles.footerRow}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/copilot')} style={({ pressed }) => [styles.footerCard, pressed && styles.pressed]}>
            <Text style={styles.footerTitle}>AI trek copilot</Text>
            <Text style={styles.footerDetail}>Draft a plan, then review it with your guide.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/safety')} style={({ pressed }) => [styles.footerCard, pressed && styles.pressed]}>
            <Text style={styles.footerTitle}>Offline essentials</Text>
            <Text style={styles.footerDetail}>What to carry past the last signal.</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 36, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  headerCopy: { flex: 1 },
  greeting: { color: colors.ink, fontSize: 27, fontWeight: '700', letterSpacing: -0.8, lineHeight: 33, marginTop: 2 },
  email: { color: colors.faint, fontSize: 13, marginTop: 5 },
  inbox: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 },
  action: { borderRadius: radius.lg, flex: 1, gap: 6, minHeight: 108, padding: 16 },
  actionLime: { backgroundColor: colors.lime },
  actionDark: { backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.line },
  actionTitle: { color: colors.onAccent, fontSize: 17, fontWeight: '800', lineHeight: 21, marginTop: 6 },
  actionDetail: { color: 'rgba(25,41,58,0.72)', fontSize: 12.5, lineHeight: 17 },
  actionTitleLight: { color: colors.ink, fontSize: 17, fontWeight: '800', lineHeight: 21, marginTop: 6 },
  actionDetailLight: { color: colors.muted, fontSize: 12.5, lineHeight: 17 },
  pressed: { opacity: 0.85 },
  groupStrip: { marginTop: 26 },
  groupRow: { gap: 10, paddingBottom: 2 },
  groupCard: { backgroundColor: colors.navy, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, minWidth: 148, padding: 14 },
  groupName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  groupMeta: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8 },
  groupMetaText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  seeAll: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  chips: { gap: 9, paddingBottom: 18 },
  list: { gap: 14 },
  tasteCard: { marginTop: 26 },
  tasteTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  tasteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footerRow: { flexDirection: 'row', gap: 12, marginTop: space.xl },
  footerCard: { backgroundColor: colors.navy, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flex: 1, minHeight: 116, padding: 16 },
  footerTitle: { color: colors.lime, fontSize: 15, fontWeight: '800' },
  footerDetail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
});
