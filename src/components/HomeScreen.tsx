import { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput, type TextInputHandle } from '@/components/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Reveal, useReducedMotion } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { treks, type Trek } from '@/data/treks';

type Props = { name: string; unread: number; onInbox: () => void; onGroups: () => void; onPlan: () => void; onTrek: (trek: Trek) => void; onCopilot: () => void; onOffline: () => void };
function Icon({ name }: { name: 'bell' | 'grid' | 'search' | 'filter' }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {name === 'bell' ? <><Path fill="white" stroke="none" d="M12 2a2 2 0 0 1 2 2v.3a6 6 0 0 1 4 5.7v4l2 3H4l2-3v-4a6 6 0 0 1 4-5.7V4a2 2 0 0 1 2-2Z" /><Path d="M10 20h4" /></> : name === 'grid' ? <><Rect x={3} y={3} width={7} height={7} rx={1} fill="white" /><Rect x={14} y={3} width={7} height={7} rx={1} fill="white" /><Rect x={3} y={14} width={7} height={7} rx={1} fill="white" /><Path fill="white" d="m17.5 13 5 4.5-5 4.5-4.5-4.5Z" /></> : name === 'search' ? <><Circle cx={10.5} cy={10.5} r={7} /><Path d="m16 16 5 5" /></> : <><Path d="M3 6h18M3 12h18M3 18h18" /><Circle cx={15} cy={6} r={2} fill="#7891A8" /><Circle cx={8} cy={12} r={2} fill="#7891A8" /><Circle cx={15} cy={18} r={2} fill="#7891A8" /></>}
  </Svg>;
}
export function HomeScreen({ name, unread, onInbox, onGroups, onPlan, onTrek, onCopilot, onOffline }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const searchRef = useRef<TextInputHandle>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All Nepal');
  const [mode, setMode] = useState<'treks' | 'groups'>('treks');
  const [selected, setSelected] = useState(0);
  const [seeAll, setSeeAll] = useState(false);
  const list = treks.filter(trek => (region === 'All Nepal' || trek.region === region) && `${trek.name} ${trek.region} ${trek.difficulty}`.toLowerCase().includes(search.toLowerCase().trim()));
  const featured = list[selected % Math.max(list.length, 1)];
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => list.length > 1 && Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 40) setSelected(current => (current + (gesture.dx < 0 ? 1 : -1) + list.length) % list.length);
    },
  }), [list.length]);
  const heroHeight = Math.max(390, Math.min(height * 0.55, 560));
  const regions = ['All Nepal', ...new Set(treks.map(trek => trek.region))];

  return <View style={styles.page}>
    <LinearGradient colors={['#8AA9C4', '#536D86', '#3C5872']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 12) + 100 }]}>
      <Reveal distance={10}>
        <View style={styles.header}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting} numberOfLines={1}>Hello, {name}</Text>
            <Pressable accessibilityRole="button" onPress={onInbox} style={styles.notice}>
              <Text style={styles.noticeIcon}>!</Text><Text style={styles.noticeText}>{unread ? `${unread} trail updates need attention` : 'Your next adventure awaits'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={onInbox} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}><Icon name="bell" />{unread > 0 && <View style={styles.unreadDot} />}</Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open trek groups" onPress={onGroups} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}><Icon name="grid" /></Pressable>
        </View>
      </Reveal>
      <Reveal delay={70} distance={12}>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Search treks" accessibilityState={{ expanded: searchOpen }} onPress={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(''); else setTimeout(() => searchRef.current?.focus(), 150); }} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}><Icon name="search" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter by region" accessibilityState={{ expanded: filterOpen }} onPress={() => setFilterOpen(!filterOpen)} style={({ pressed }) => [styles.circle, filterOpen && styles.controlSelected, pressed && styles.pressed]}><Icon name="filter" /></Pressable>
          <View style={styles.segment}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'treks' }} onPress={() => setMode('treks')} style={[styles.segmentButton, mode === 'treks' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'treks' && styles.segmentTextActive]}>Trek routes</Text></Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'groups' }} onPress={() => { onGroups(); }} style={[styles.segmentButton, mode === 'groups' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'groups' && styles.segmentTextActive]}>Groups</Text></Pressable>
          </View>
        </View>
      </Reveal>
      {searchOpen && <Animated.View entering={reduced ? undefined : FadeInDown.duration(180)} exiting={reduced ? undefined : FadeOut.duration(120)}><TextInput ref={searchRef} accessibilityLabel="Search trek names and regions" placeholder="Find your mountain escape" placeholderTextColor="rgba(255,255,255,0.6)" value={search} onChangeText={value => { setSearch(value); setSelected(0); }} style={styles.search} autoCorrect={false} /></Animated.View>}
      {filterOpen && <Animated.View entering={reduced ? undefined : FadeInDown.duration(180)}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{regions.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: region === item }} onPress={() => { setRegion(item); setSelected(0); }} style={[styles.filter, region === item && styles.segmentActive]}><Text style={[styles.segmentText, region === item && styles.segmentTextActive]}>{item}</Text></Pressable>)}</ScrollView></Animated.View>}
      <Reveal delay={120} distance={12}>
        <View style={styles.preparation}>
          <Pressable accessibilityRole="button" onPress={onPlan} style={styles.prepareLink}><TabIcon name="route" color="rgba(255,255,255,0.8)" size={22} /><Text style={styles.prepareText}>Add a trek to your plan</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onPlan} style={({ pressed }) => [styles.readyButton, pressed && styles.pressed]}><Text style={styles.readyText}>Ready to go</Text></Pressable>
        </View>
      </Reveal>
      <Reveal delay={160} distance={12}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Popular destinations</Text><Pressable accessibilityRole="button" accessibilityLabel={seeAll ? 'Show featured destination' : 'See all treks'} hitSlop={8} onPress={() => setSeeAll(!seeAll)}><Text style={styles.seeAll}>{seeAll ? 'Show less' : 'See all'}</Text></Pressable></View>
      </Reveal>
      {featured ? <Reveal delay={210} distance={22}>
        <View style={[styles.deck, { height: heroHeight + 32 }]}>
          <View style={[styles.backCard, styles.backCardFar]} /><View style={[styles.backCard, styles.backCardNear]} />
          <Animated.View {...swipe.panHandlers} key={featured.id} entering={reduced ? undefined : FadeIn.duration(320)} style={[styles.hero, { height: heroHeight }]}>
            <Image source={featured.image} resizeMode="cover" style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(45,83,112,0.65)', 'rgba(32,63,87,0.12)', 'rgba(20,48,70,0.62)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${featured.name} trek`} accessibilityHint={`${featured.days}, ${featured.difficulty}. Swipe sideways to browse destinations.`} onPress={() => onTrek(featured)} style={styles.heroHit}>
              <View style={styles.heroTop}><Text style={styles.destination}>{featured.name},{'\n'}{featured.region}, Nepal</Text><View style={styles.openCircle}><Text style={styles.openArrow}>↗</Text></View></View>
            </Pressable>

          </Animated.View>
        </View>
      </Reveal> : <View style={styles.empty}><Text style={styles.sectionTitle}>No treks found</Text><Text style={styles.noticeText}>Try a different region or search.</Text></View>}
      {seeAll && <Animated.View layout={reduced ? undefined : LinearTransition.duration(220)} style={styles.results}>{list.map(trek => <Pressable key={trek.id} accessibilityRole="button" onPress={() => onTrek(trek)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}><Image source={trek.image} style={styles.thumbnail} /><View style={styles.resultCopy}><Text style={styles.resultTitle}>{trek.name}</Text><Text style={styles.noticeText}>{trek.days} · {trek.region}</Text></View><Text style={styles.openArrow}>↗</Text></Pressable>)}</Animated.View>}
      <View style={styles.bottomActions}><Pressable accessibilityRole="button" onPress={onCopilot} style={styles.bottomLink}><Text style={styles.readyText}>AI trek copilot ↗</Text></Pressable><Pressable accessibilityRole="button" onPress={onOffline} style={styles.bottomLink}><Text style={styles.readyText}>Offline essentials ↗</Text></Pressable></View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#536D86' }, scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 }, greetingBlock: { flex: 1 }, greeting: { color: 'white', fontSize: 27, fontWeight: '600', letterSpacing: -0.7 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 }, noticeIcon: { width: 14, height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.38)', textAlign: 'center', color: 'white', fontSize: 11, fontWeight: '700' }, noticeText: { color: 'rgba(255,255,255,0.74)', fontSize: 12, lineHeight: 18 },
  circle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(204,222,239,0.14)' }, unreadDot: { position: 'absolute', right: 12, top: 11, width: 6, height: 6, borderRadius: 3, backgroundColor: '#E4FF89' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 29 }, controlSelected: { backgroundColor: 'rgba(255,255,255,0.28)' }, segment: { flex: 1, flexDirection: 'row', borderRadius: 30, backgroundColor: 'rgba(204,222,239,0.13)', marginLeft: 1 }, segmentButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 30 }, segmentActive: { backgroundColor: '#FFFFFF' }, segmentText: { color: 'white', fontSize: 12, fontWeight: '500' }, segmentTextActive: { color: '#18212B' },
  preparation: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 }, prepareLink: { flex: 1, minHeight: 38, flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.65)' }, prepareText: { color: 'rgba(255,255,255,0.73)', fontSize: 13, flex: 1 }, readyButton: { borderRadius: 24, backgroundColor: 'rgba(204,222,239,0.14)', paddingHorizontal: 22, paddingVertical: 13 }, readyText: { color: 'white', fontSize: 12, fontWeight: '500' },
  sectionHeading: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: 'white', fontSize: 19, fontWeight: '600', letterSpacing: -0.4 }, seeAll: { color: 'rgba(255,255,255,0.64)', fontSize: 13 },
  deck: { marginTop: 20, position: 'relative' }, backCard: { position: 'absolute', height: 100, borderRadius: 28, backgroundColor: 'rgba(184,203,219,0.15)', borderWidth: 1, borderColor: 'rgba(233,242,249,0.15)' }, backCardFar: { top: 0, left: 44, right: 44 }, backCardNear: { top: 17, left: 23, right: 23 }, hero: { position: 'absolute', top: 32, left: 0, right: 0, borderRadius: 30, overflow: 'hidden', backgroundColor: '#456B87' }, heroHit: { flex: 1, padding: 20, justifyContent: 'space-between' }, heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, destination: { flex: 1, color: 'white', fontSize: 21, fontWeight: '500', lineHeight: 28, letterSpacing: -0.3 }, openCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(155,183,209,0.28)', alignItems: 'center', justifyContent: 'center' }, openArrow: { color: 'white', fontSize: 27, fontWeight: '300' }, heroFooter: { paddingBottom: 18 }, heroMeta: { color: 'white', fontSize: 12, fontWeight: '500' }, heroCaption: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }, pagination: { position: 'absolute', bottom: 15, left: 0, right: 0, flexDirection: 'row', gap: 7, justifyContent: 'center' }, dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' }, dotActive: { width: 16, backgroundColor: 'white' },
  search: { backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', borderRadius: 18, padding: 15, fontSize: 15, marginTop: 12 }, filters: { gap: 7, marginTop: 12 }, filter: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' }, empty: { paddingVertical: 50, gap: 8 }, results: { gap: 10, marginTop: 20 }, result: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' }, thumbnail: { width: 58, height: 58, borderRadius: 14 }, resultCopy: { flex: 1 }, resultTitle: { color: 'white', fontSize: 14, fontWeight: '600' }, bottomActions: { flexDirection: 'row', gap: 10, marginTop: 44 }, bottomLink: { flex: 1, padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignItems: 'center' }, pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
