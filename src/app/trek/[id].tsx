import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Typography';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';

import { Backdrop, Button, Card, Reveal, Row, SectionTitle, useReducedMotion } from '@/components/ui';
import { NepalMap } from '@/components/NepalMap';
import { TabIcon } from '@/components/TabIcon';
import { colorForTrek } from '@/data/map-style';
import { regionForTrek, trekById, trekStats, type TrekPoint } from '@/data/treks';
import { colors, radius } from '@/theme/tokens';

const PROFILE_WIDTH = 640;
const PROFILE_HEIGHT = 190;

function elevationProfile(route: TrekPoint[]) {
  const elevations = route.map(point => point.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const span = Math.max(max - min, 1);
  const pad = 14;
  const stepX = route.length > 1 ? (PROFILE_WIDTH - pad * 2) / (route.length - 1) : 0;
  const points = route.map((point, index) => ({
    x: pad + index * stepX,
    y: PROFILE_HEIGHT - pad - ((point.elevation - min) / span) * (PROFILE_HEIGHT - pad * 2),
    elevation: point.elevation,
    name: point.name,
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${PROFILE_HEIGHT} L${first.x.toFixed(1)},${PROFILE_HEIGHT} Z`;
  return { area, line, max, min, points };
}

export default function TrekScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  return <TrekDetail id={Array.isArray(params.id) ? params.id[0] : params.id} />;
}

export function TrekDetail({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const detailsY = useRef(0);
  const [selectedView, setSelectedView] = useState(1);
  const reduced = useReducedMotion();
  const trek = trekById(id);

  if (!trek) {
    return (
      <Backdrop>
        <View style={styles.missing}>
          <TabIcon color={colors.lime} name="route" size={34} />
          <Text style={styles.missingTitle}>That route isn’t on Navo yet</Text>
          <Text style={styles.missingDetail}>We only map four Nepali routes for now. Pick one from the Discover tab.</Text>
          <Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} style={styles.missingButton} />
        </View>
      </Backdrop>
    );
  }

  const stats = trekStats(trek.route);
  const profile = elevationProfile(trek.route);
  const accent = colorForTrek(trek.id);
  const start = trek.route[0];
  const summit = trek.route[trek.route.length - 1];

  return (
    <View style={styles.screen}>
      <Animated.View key={`${trek.id}-${selectedView}`} entering={reduced ? undefined : FadeIn.duration(420)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={trek.image} resizeMode="cover" style={[styles.backgroundImage, { transform: [{ scale: selectedView === 0 ? 1.2 : selectedView === 2 ? 1.45 : 1 }] }]} />
      </Animated.View>
      <LinearGradient colors={['rgba(104,136,158,0.35)', 'rgba(51,81,109,0.30)', 'rgba(45,72,99,0.95)', '#304C66']} locations={[0, 0.36, 0.69, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <ScrollView ref={scroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 118 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { minHeight: Math.max(420, height * 0.54), paddingTop: insets.top + 14 }]}>
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover')} style={({ pressed }) => [styles.roundControl, pressed && styles.pressed]}>
              <Svg width={25} height={25} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 12H4m7-7-7 7 7 7" /></Svg>
            </Pressable>
            <View style={styles.toolbarRight}>
              <Pressable accessibilityRole="button" accessibilityLabel="View trek on map" onPress={() => router.push({ pathname: '/(tabs)/map', params: { trek: trek.id } })} style={({ pressed }) => [styles.roundControl, pressed && styles.pressed]}><TabIcon name="map" color="white" size={23} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="View route details" onPress={() => scroll.current?.scrollTo({ y: detailsY.current, animated: !reduced })} style={({ pressed }) => [styles.roundControl, pressed && styles.pressed]}><Svg width={25} height={25} viewBox="0 0 24 24" fill="white"><SvgCircle cx={5} cy={12} r={1.7} /><SvgCircle cx={12} cy={12} r={1.7} /><SvgCircle cx={19} cy={12} r={1.7} /></Svg></Pressable>
            </View>
          </View>
          <Reveal delay={40}>
            <View style={styles.heroCopy}>
              <View style={styles.nameRow}><Text style={styles.heroName}>{trek.name}</Text><Text style={styles.difficulty}>{trek.difficulty}</Text></View>
              <Row gap={5}><TabIcon name="pin" color="white" size={17} /><Text style={styles.location}>{trek.region}, Nepal</Text></Row>
            </View>
          </Reveal>
        </View>
        <View style={styles.overview}>
          <Reveal delay={80}><View style={styles.statsRow}>
            <OverviewStat symbol="◷" value={trek.days} label="Duration" />
            <OverviewStat symbol="△" value={`${trek.maxElevation.toLocaleString()} m`} label="High point" />
            <OverviewStat symbol="⌁" value={`${stats.stops} stops`} label="Route" />
          </View></Reveal>
          <Reveal delay={120}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {['Wide view', 'Mountain view', 'Closer view'].map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: selectedView === index }} onPress={() => setSelectedView(index)} style={({ pressed }) => [styles.photoCard, selectedView === index && styles.photoSelected, pressed && styles.pressed]}>
              <Image source={trek.image} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', transform: [{ scale: index === 0 ? 1.2 : index === 2 ? 1.45 : 1 }] }]} />
              <LinearGradient colors={['transparent', 'rgba(25,41,58,0.4)']} style={StyleSheet.absoluteFill} />
            </Pressable>)}
          </ScrollView></Reveal>
          <Reveal delay={150}><Pressable accessibilityRole="button" accessibilityLabel="See trek route and information" onPress={() => scroll.current?.scrollTo({ y: detailsY.current, animated: !reduced })} style={({ pressed }) => [styles.detailLink, pressed && styles.pressed]}><Text style={styles.detailLinkText}>Explore this trek</Text><Text style={styles.detailArrow}>↓</Text></Pressable></Reveal>
        </View>
        <View onLayout={event => { detailsY.current = event.nativeEvent.layout.y; }}>
        <Reveal delay={70}>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/journey", params: { trek: trek.id } })} style={[styles.detailLink, { marginTop: 20 }]}><Text style={styles.detailLinkText}>Start Trek</Text><TabIcon name="route" color="#E4FF89" size={22} /></Pressable>
          <Text style={styles.summary}>{trek.summary}</Text>
          <Text style={[styles.caveat, { paddingHorizontal: 20 }]}>Planning overview only. Waypoints and durations are approximate, not a verified trail or an acclimatisation schedule.</Text>
        </Reveal>

        </View>
        <Reveal delay={90}>
          <View style={styles.section}>
            <SectionTitle title="APPROXIMATE STOP ELEVATIONS" />
            <Card padded={false} style={styles.glassCard}>
              <View style={styles.profileHead}>
                <View>
                  <Text style={styles.profileLabel}>START</Text>
                  <Text style={styles.profileValue}>{start.elevation.toLocaleString()} m</Text>
                  <Text style={styles.profilePlace}>{start.name}</Text>
                </View>
                <View style={styles.profileRight}>
                  <Text style={styles.profileLabel}>HIGH POINT</Text>
                  <Text style={[styles.profileValue, { color: accent }]}>{summit.elevation.toLocaleString()} m</Text>
                  <Text style={styles.profilePlace}>{summit.name}</Text>
                </View>
              </View>
              <Svg height={PROFILE_HEIGHT} viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`} width="100%">
                <Defs>
                  <SvgGradient id="profileFill" x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0" stopColor={accent} stopOpacity={0.42} />
                    <Stop offset="1" stopColor={accent} stopOpacity={0} />
                  </SvgGradient>
                </Defs>
                <Path d={profile.area} fill="url(#profileFill)" />
                <Path d={profile.line} fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                {profile.points.map(point => (
                  <SvgCircle cx={point.x} cy={point.y} fill={colors.night} key={point.name} r={4} stroke={accent} strokeWidth={2.5} />
                ))}
              </Svg>
              <Text style={styles.profileFoot}>
                {profile.min.toLocaleString()}–{profile.max.toLocaleString()} m across {stats.stops} stops · +{stats.ascent.toLocaleString()} m estimated gain · {stats.descent.toLocaleString()} m decrease between listed stops. Horizontal spacing is not distance.
              </Text>
            </Card>
          </View>
        </Reveal>

        <Reveal delay={110}>
          <View style={styles.section}>
            <SectionTitle title="ROUTE" />
            <Card style={styles.glassCard}>
              {trek.route.map((point, index) => {
                const previous = index > 0 ? trek.route[index - 1] : null;
                const delta = previous ? point.elevation - previous.elevation : 0;
                return (
                  <View key={point.name} style={styles.stop}>
                    <View style={styles.stopRail}>
                      <View style={[styles.stopDot, index === 0 || index === trek.route.length - 1 ? { backgroundColor: accent, borderColor: accent } : null]} />
                      {index < trek.route.length - 1 ? <View style={styles.stopLine} /> : null}
                    </View>
                    <View style={styles.stopBody}>
                      <Text style={styles.stopIndex}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.stopCopy}>
                        <Text style={styles.stopName}>{point.name}</Text>
                        <Text style={styles.stopMeta}>
                          {point.elevation.toLocaleString()} m
                          {previous ? ` · ${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()} m` : ' · trailhead'}
                        </Text>
                      </View>
                      <Text style={styles.stopCoords}>{point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
            <Text style={styles.caveat}>
              Route geometry here is illustrative. Check it against a licensed GPX track before you walk it.
            </Text>
          </View>
        </Reveal>

        <Reveal delay={130}>
          <View style={styles.section}>
            <SectionTitle
              action={
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/map', params: { trek: trek.id } })}>
                  <Text style={styles.linkText}>Open on map</Text>
                </Pressable>
              }
              title="WHERE IT SITS"
            />
            <View style={styles.mapFrame}>
              <NepalMap interactive={false} myCoords={null} onSelectTrek={() => router.push({ pathname: '/(tabs)/map', params: { trek: trek.id } })} region={regionForTrek(trek)} regionNonce={0} selectedId={trek.id} />
            </View>
          </View>
        </Reveal>

        <Reveal delay={150}>
          <View style={styles.section}>
            <SectionTitle title="BEFORE YOU GO" />
            <Card style={[styles.glassCard, styles.factCard]}>
              <Fact label="CHECK PERMITS" value={trek.permit} />
              <Fact label="BEST SEASON" value={trek.bestSeason} />
              <Fact label="TRIP LENGTH" value={trek.days} />
              <Fact label="DIFFICULTY" value={trek.difficulty} />
            </Card>
            <Text style={styles.caveat}>Confirm current permits, guide requirements and conditions before travel. Find official NTB and DHM sources in Trek preparation.</Text>
          </View>
        </Reveal>


      </ScrollView>
      <LinearGradient colors={['rgba(48,76,102,0)', 'rgba(48,76,102,0.95)', '#304C66']} style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plan', params: { trek: trek.id } })} style={({ pressed }) => [styles.prepareButton, pressed && styles.pressed]}><Text style={styles.prepareText}>Prepare for this trek</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Create a group" accessibilityHint={`Start a group for ${trek.name}`} onPress={() => router.push({ pathname: '/group/new', params: { trek: trek.id } })} style={({ pressed }) => [styles.groupButton, pressed && styles.pressed]}><TabIcon name="group" color="white" size={26} /></Pressable>
      </LinearGradient>
    </View>
  );
}

function OverviewStat({ symbol, value, label }: { symbol: string; value: string; label: string }) {
  return <View style={styles.statPill}><Text style={styles.statSymbol}>{symbol}</Text><View style={styles.statCopy}><Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={styles.statLabel}>{label}</Text></View></View>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: '#304C66' },
  backgroundImage: { width: '100%', height: '100%' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  roundControl: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(205,225,235,0.18)', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  difficulty: { color: '#E4FF89', fontSize: 14, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  overview: { gap: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20 },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 28, backgroundColor: 'rgba(177,206,228,0.20)', paddingHorizontal: 12, height: 54 },
  statCopy: { flex: 1 },
  statSymbol: { color: '#E4FF89', fontSize: 25 },
  statValue: { color: 'white', fontSize: 12, fontWeight: '500' },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 3 },
  gallery: { gap: 8, paddingHorizontal: 20 },
  photoCard: { height: 174, width: 145, borderRadius: 26, overflow: 'hidden', borderWidth: 1.3, borderColor: 'rgba(255,255,255,0.15)' },
  photoSelected: { borderColor: '#E4FF89' },
  detailLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 18, height: 46, borderRadius: 25, backgroundColor: 'rgba(197,218,233,0.15)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 },
  detailLinkText: { color: 'white', fontSize: 14 },
  detailArrow: { color: '#E4FF89', fontSize: 24 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20 },
  prepareButton: { height: 60, borderRadius: 32, backgroundColor: '#E4FF89', alignItems: 'center', justifyContent: 'center', flex: 1 },
  prepareText: { color: '#19293A', fontSize: 16, fontWeight: '500' },
  groupButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(190,214,233,0.24)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  hero: { justifyContent: 'space-between', paddingBottom: 18 },
  heroCopy: { gap: 8, paddingHorizontal: 20, paddingBottom: 0 },
  heroRegion: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroName: { color: 'white', fontSize: 22, fontWeight: '500', lineHeight: 28, flex: 1 },
  heroBadges: { flexWrap: 'wrap' },
  stats: { marginHorizontal: 20, marginTop: -22 },
  summary: { color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 25, marginTop: 24, paddingHorizontal: 20 },
  section: { marginTop: 30, paddingHorizontal: 20 },
  profileHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, paddingBottom: 4 },
  profileRight: { alignItems: 'flex-end' },
  profileLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 },
  profileValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  profilePlace: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 3 },
  profileFoot: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 10 },
  stop: { flexDirection: 'row', gap: 12 },
  stopRail: { alignItems: 'center', width: 16 },
  stopDot: { backgroundColor: colors.night, borderColor: colors.line, borderRadius: 8, borderWidth: 2, height: 12, marginTop: 16, width: 12 },
  stopLine: { backgroundColor: colors.line, flex: 1, width: 1.5 },
  stopBody: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flex: 1, flexDirection: 'row', gap: 12, paddingVertical: 14 },
  stopIndex: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, width: 18 },
  stopCopy: { flex: 1 },
  stopName: { color: colors.ink, fontSize: 15.5, fontWeight: '700' },
  stopMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 3 },
  stopCoords: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontVariant: ['tabular-nums'] },
  caveat: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 18, marginTop: 12 },
  mapFrame: { borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, height: 250, overflow: 'hidden' },
  glassCard: { backgroundColor: 'rgba(177,206,228,0.13)', borderColor: 'rgba(255,255,255,0.14)', borderRadius: 26 },
  factCard: { gap: 2 },
  fact: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  factLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  factValue: { color: colors.ink, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  linkText: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  cta: {
    backgroundColor: colors.navy,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 30,
    padding: 20,
  },
  ctaTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, lineHeight: 27 },
  ctaDetail: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21, marginBottom: 10 },
  ctaSecondary: { marginTop: 10 },
  missing: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 32 },
  missingTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginTop: 8 },
  missingDetail: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  missingButton: { marginTop: 14, width: 220 },
});
