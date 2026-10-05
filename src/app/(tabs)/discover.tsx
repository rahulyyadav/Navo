import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Backdrop, Badge, Button, Card, Chip, Eyebrow, Field, Reveal, SectionTitle, relayout } from '@/components/ui';
import { TrekCard } from '@/components/TrekCard';
import { TabIcon } from '@/components/TabIcon';
import { useNavo } from '@/context/NavoContext';
import { recommendPlaces, type SearchPlace } from '@/services/discovery-search';
import { dayHikes } from '@/services/day-hike';
import { usePageLayout } from '@/hooks/usePageLayout';
import { treks } from '@/data/treks';
import { goalLabels } from '@/data/onboarding';
import { useTripLibrary } from '@/hooks/useTripLibrary';
import { useCloud } from '@/context/CloudContext';
import { colors, radius, space } from '@/theme/tokens';

const ALL = 'All Nepal';
const places: SearchPlace[] = [
  ...dayHikes.filter(hike => hike.id !== 'custom').map(hike => ({ id: hike.id, name: hike.name, region: 'Kathmandu Valley', kind: 'day' as const, detail: hike.trailhead, aliases: ['day hike', 'day trip', ...(hike.id === 'phulchowki' ? ['pulchowki', 'phulchoki', 'lalitpur'] : ['budhanilkantha'])] })),
  ...treks.map(trek => ({ id: trek.id, name: trek.name, region: trek.region, kind: 'trek' as const, detail: trek.difficulty, aliases: [trek.id === 'everest-base-camp' ? 'ebc' : trek.id === 'annapurna-base-camp' ? 'abc' : '', trek.days] })),
];

export default function DiscoverScreen() {
  const layout = usePageLayout();
  const library = useTripLibrary();
  const cloud = useCloud();
  const unread = cloud.notifications.filter(item => !item.read).length;
  const insets = useSafeAreaInsets();
  const { profile, imageUrl, groups, answers } = useNavo();
  const [region, setRegion] = useState(ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [difficulty, setDifficulty] = useState('Any pace');
  const [savedOnly, setSavedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const suggestions = useMemo(() => recommendPlaces(places, search), [search]);
  const regions = useMemo(() => [ALL, ...Array.from(new Set(treks.map(trek => trek.region)))], []);
  const visible = useMemo(
    () => treks.filter(trek => (region === ALL || trek.region === region) && (difficulty === 'Any pace' || trek.difficulty === difficulty) && (!savedOnly || library.data.savedTrekIds.includes(trek.id)) && `${trek.name} ${trek.region} ${trek.difficulty}`.toLowerCase().includes(search.trim().toLowerCase())),
    [region, search, difficulty, savedOnly, library.data.savedTrekIds],
  );

  const firstName = (profile?.fullName ?? answers.fullName).split(/\s+/).filter(Boolean)[0] ?? 'trekker';
  const goals = goalLabels(profile?.goals ?? answers.goals);

  return (
    <Backdrop>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, layout.page, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
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
          <View style={[styles.actions, layout.compact && { flexDirection: 'column' }]}>
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
          <SectionTitle title="FIND YOUR NEXT TREK" action={<Button label={showFilters ? 'Hide filters' : 'Filters'} variant="quiet" onPress={() => setShowFilters(value => !value)} />} />
        </Reveal>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {regions.map(name => (
            <Chip key={name} label={name} onPress={() => setRegion(name)} selected={region === name} />
          ))}
        </ScrollView>

        {showFilters && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{['Any pace', 'Moderate', 'Challenging', 'Strenuous'].map(value => <Chip key={value} label={value} selected={difficulty === value} onPress={() => setDifficulty(value)} />)}<Chip label="Saved only" selected={savedOnly} onPress={() => setSavedOnly(value => !value)} /></ScrollView>}
        <Field label="Find your next trek" placeholder="Kathmandu, Pulchowki, Langtang…" value={search} onChangeText={setSearch} />
        <Card style={{ marginBottom: 16 }}><SectionTitle title={search.trim() ? 'MATCHING PLACES' : 'DAY HIKES NEAR KATHMANDU'} /><Text style={styles.footerDetail}>Suggestions from Navo’s planning catalogue · confirm the route before you go.</Text>{suggestions.map(place => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={'Explore ' + place.name} style={styles.suggestion} onPress={() => place.kind === 'day' ? router.push({ pathname: '/day-hike', params: { hike: place.id } }) : router.push({ pathname: '/trek/[id]', params: { id: place.id } })}><View style={{ flex: 1 }}><Text style={styles.suggestionTitle}>{place.name}</Text><Text style={styles.footerDetail}>{place.region} · {place.kind === 'day' ? 'Day hike' : place.detail}</Text></View><Text style={styles.seeAll}>→</Text></Pressable>)}{!suggestions.length && <><Text style={styles.footerDetail}>This place is not in our catalogue yet. You can still plan a hike with your own confirmed meeting point.</Text><Button label="Plan another hike" variant="quiet" onPress={() => router.push({ pathname: '/day-hike', params: { hike: 'custom', name: search.slice(0,60) } })} /></>}</Card>

        {visible.length === 0 && <Card><Text style={styles.footerDetail}>{savedOnly ? 'No saved treks match these filters. Save a trek from its detail page.' : 'No multi-day treks match these filters. Day-hike suggestions appear above.'}</Text><Button label="Reset filters" variant="quiet" onPress={() => { setRegion(ALL); setDifficulty('Any pace'); setSearch(''); setSavedOnly(false); }} /></Card>}
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}><Button label="Your trips" variant="outline" style={{ flex: 1 }} onPress={() => router.push('/trips')} /><Button label="Record a hike" variant="quiet" style={{ flex: 1 }} onPress={() => router.push('/record-hike')} /></View>
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
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  suggestionTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
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
