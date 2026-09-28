import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';

import { Backdrop, Badge, Button, Card, Eyebrow, Reveal, Row, SectionTitle, Stat, useReducedMotion } from '@/components/ui';
import { NepalMap } from '@/components/NepalMap';
import { TabIcon } from '@/components/TabIcon';
import { colorForTrek } from '@/data/map-style';
import { regionForTrek, trekById, trekStats, type TrekPoint } from '@/data/treks';
import { colors, radius, space } from '@/theme/tokens';

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
  const reduced = useReducedMotion();
  const trek = trekById(Array.isArray(params.id) ? params.id[0] : params.id);

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
    <Backdrop>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image accessibilityLabel={`${trek.name} in the ${trek.region} region`} resizeMode="cover" source={trek.image} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(8,13,18,0.10)', 'rgba(8,13,18,0.62)', colors.night]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroRegion}>{trek.region.toUpperCase()}</Text>
            <Text style={styles.heroName}>{trek.name}</Text>
            <Row gap={space.sm} style={styles.heroBadges}>
              <Badge label={trek.difficulty.toUpperCase()} tone={trek.difficulty === 'Strenuous' ? 'danger' : trek.difficulty === 'Challenging' ? 'warning' : 'lime'} />
              <Badge label={trek.days.toUpperCase()} />
              <Badge label={`${trek.maxElevation.toLocaleString()} M`} tone="info" />
            </Row>
          </View>
        </View>

        <Reveal delay={40}>
          <Card style={styles.stats}>
            <Row>
              <Stat label="DAYS" value={trek.days.split(' ')[0]} />
              <Stat label="MAX" value={`${trek.maxElevation.toLocaleString()}`} />
              <Stat label="EST. GAIN" value={`+${stats.ascent.toLocaleString()}`} />
              <Stat label="STOPS" value={String(stats.stops)} />
            </Row>
          </Card>
        </Reveal>

        <Reveal delay={70}>
          <Text style={styles.summary}>{trek.summary}</Text>
          <Text style={styles.caveat}>Planning overview only. Waypoints and durations are approximate, not a verified trail or an acclimatisation schedule.</Text>
        </Reveal>

        <Reveal delay={90}>
          <View style={styles.section}>
            <SectionTitle title="APPROXIMATE STOP ELEVATIONS" />
            <Card padded={false}>
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
                {profile.min.toLocaleString()}–{profile.max.toLocaleString()} m across {stats.stops} stops · {stats.descent.toLocaleString()} m decrease between listed stops. Horizontal spacing is not distance.
              </Text>
            </Card>
          </View>
        </Reveal>

        <Reveal delay={110}>
          <View style={styles.section}>
            <SectionTitle title="ROUTE" />
            <Card>
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
            <Card style={styles.factCard}>
              <Fact label="CHECK PERMITS" value={trek.permit} />
              <Fact label="BEST SEASON" value={trek.bestSeason} />
              <Fact label="TRIP LENGTH" value={trek.days} />
              <Fact label="DIFFICULTY" value={trek.difficulty} />
            </Card>
            <Text style={styles.caveat}>Confirm current permits, guide requirements and conditions before travel. Find official NTB and DHM sources in Trek preparation.</Text>
          </View>
        </Reveal>

        <Animated.View entering={reduced ? undefined : FadeInDown.delay(180).duration(420).springify().damping(16)} style={styles.cta}>
          <Eyebrow>WALK IT WITH YOUR PEOPLE</Eyebrow>
          <Text style={styles.ctaTitle}>Start a group for {trek.name}</Text>
          <Text style={styles.ctaDetail}>
            Keep a local team roster and prepare together. Group records and alarms stay on this device.
          </Text>
          <Button label="Create a group" onPress={() => router.push({ pathname: '/group/new', params: { trek: trek.id } })} />
          <Button label="Prepare for this trek" onPress={() => router.push({ pathname: '/plan', params: { trek: trek.id } })} style={styles.ctaSecondary} variant="outline" />
        </Animated.View>
      </ScrollView>
    </Backdrop>
  );
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
  scroll: { flexGrow: 1, paddingBottom: 44 },
  hero: { height: 292, justifyContent: 'flex-end', overflow: 'hidden' },
  heroCopy: { gap: 8, paddingHorizontal: 20, paddingBottom: 20 },
  heroRegion: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroName: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 38 },
  heroBadges: { flexWrap: 'wrap' },
  stats: { marginHorizontal: 20, marginTop: -22 },
  summary: { color: colors.muted, fontSize: 16, lineHeight: 25, marginTop: 20, paddingHorizontal: 20 },
  section: { marginTop: 30, paddingHorizontal: 20 },
  profileHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, paddingBottom: 4 },
  profileRight: { alignItems: 'flex-end' },
  profileLabel: { color: colors.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 },
  profileValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 5 },
  profilePlace: { color: colors.muted, fontSize: 12.5, marginTop: 3 },
  profileFoot: { color: colors.faint, fontSize: 12, lineHeight: 18, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 10 },
  stop: { flexDirection: 'row', gap: 12 },
  stopRail: { alignItems: 'center', width: 16 },
  stopDot: { backgroundColor: colors.night, borderColor: colors.line, borderRadius: 8, borderWidth: 2, height: 12, marginTop: 16, width: 12 },
  stopLine: { backgroundColor: colors.line, flex: 1, width: 1.5 },
  stopBody: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flex: 1, flexDirection: 'row', gap: 12, paddingVertical: 14 },
  stopIndex: { color: colors.faint, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, width: 18 },
  stopCopy: { flex: 1 },
  stopName: { color: colors.ink, fontSize: 15.5, fontWeight: '700' },
  stopMeta: { color: colors.muted, fontSize: 12.5, marginTop: 3 },
  stopCoords: { color: colors.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  caveat: { color: colors.faint, fontSize: 12.5, lineHeight: 18, marginTop: 12 },
  mapFrame: { borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, height: 250, overflow: 'hidden' },
  factCard: { gap: 2 },
  fact: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  factLabel: { color: colors.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
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
  ctaDetail: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  ctaSecondary: { marginTop: 10 },
  missing: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 32 },
  missingTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginTop: 8 },
  missingDetail: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  missingButton: { marginTop: 14, width: 220 },
});
