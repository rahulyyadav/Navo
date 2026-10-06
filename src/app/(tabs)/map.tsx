import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NepalMap } from '@/components/NepalMap';
import { TabIcon } from '@/components/TabIcon';
import { Badge, Button, Reveal, useReducedMotion } from '@/components/ui';
import { colorForTrek } from '@/data/map-style';
import { NEPAL_REGION, regionForTrek, trekById, trekStats, treks, type MapRegion } from '@/data/treks';
import { useMyLocation } from '@/hooks/useMyLocation';
import { colors, radius, shadow, space } from '@/theme/tokens';

const difficultyTone = { Moderate: 'lime', Challenging: 'warning', Strenuous: 'danger' } as const;

export default function MapScreen() {
  const params = useLocalSearchParams<{ trek?: string }>();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { coords, state, locate } = useMyLocation();
  const [selectedId, setSelectedId] = useState<string | null>(typeof params.trek === 'string' && trekById(params.trek) ? params.trek : null);
  const [region, setRegion] = useState<MapRegion>(() => { const trek = typeof params.trek === 'string' ? trekById(params.trek) : null; return trek ? regionForTrek(trek) : NEPAL_REGION; });
  const [nonce, setNonce] = useState(0);

  const [appliedTrek, setAppliedTrek] = useState(params.trek);
  if (params.trek !== appliedTrek) {
    setAppliedTrek(params.trek);
    const next = typeof params.trek === 'string' ? trekById(params.trek) : null;
    if (next) { setSelectedId(next.id); setRegion(regionForTrek(next)); setNonce(value => value + 1); }
  }

  const selected = useMemo(() => (selectedId ? trekById(selectedId) : null), [selectedId]);
  const stats = useMemo(() => (selected ? trekStats(selected.route) : null), [selected]);

  function flyTo(next: MapRegion, trek: string | null) {
    setSelectedId(trek);
    setRegion(next);
    setNonce(value => value + 1);
  }

  function selectTrek(id: string) {
    const trek = trekById(id);
    if (trek) flyTo(regionForTrek(trek), id);
  }

  async function focusMe() {
    const found = await locate();
    if (!found) return;
    flyTo({ latitude: found.latitude, longitude: found.longitude, latitudeDelta: 0.09, longitudeDelta: 0.09 }, null);
  }

  return (
    <View style={styles.root}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 145, bottom: Math.max(insets.bottom, 12) + 72 + (selected ? 305 : 44) }}><NepalMap key="nepal-map" myCoords={coords} onSelectTrek={selectTrek} region={region} regionNonce={nonce} selectedId={selectedId} /></View>
      <Text style={{ position: 'absolute', bottom: Math.max(insets.bottom, 12) + 72 + (selected ? 290 : 12), left: 16, color: colors.muted, fontSize: 11 }}>Online tiles · approximate waypoints, not a navigation track</Text>

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Reveal>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.titleKicker}>NEPAL · {treks.length} TREK OVERVIEWS</Text>
              <Text style={styles.title}>Where will you walk?</Text>
            </View>
            <Pressable accessibilityLabel="Zoom out to all of Nepal" accessibilityRole="button" onPress={() => flyTo(NEPAL_REGION, null)} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
              <TabIcon color={colors.lime} name="compass" size={20} />
            </Pressable>
          </View>
        </Reveal>

        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {treks.map(trek => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: trek.id === selectedId }}
              key={trek.id}
              onPress={() => flyTo(regionForTrek(trek), trek.id)}
              style={({ pressed }) => [styles.chip, trek.id === selectedId && styles.chipOn, pressed && styles.pressed]}
            >
              <View style={[styles.chipDot, { backgroundColor: colorForTrek(trek.id) }]} />
              <Text style={[styles.chipText, trek.id === selectedId && styles.chipTextOn]}>{trek.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {(state === 'denied' || state === 'unavailable') && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{state === 'denied' ? 'Location permission is off. Enable it in Settings to locate yourself.' : 'No GPS fix. Try again outdoors with a clear view of the sky.'}</Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityLabel="Find my location"
        accessibilityRole="button"
        disabled={state === 'locating'}
        onPress={() => void focusMe()}
        style={({ pressed }) => [styles.locateButton, { bottom: Math.max(insets.bottom, 12) + 72 + (selected ? 315 : 60) }, pressed && styles.pressed]}
      >
        <TabIcon color={state === 'locating' ? colors.faint : colors.onAccent} name="pin" size={22} />
      </Pressable>

      {selected && stats ? (
        <Animated.View entering={reduced ? undefined : FadeInUp.duration(320)} pointerEvents="box-none" style={[styles.sheet, { paddingBottom: 16, bottom: Math.max(insets.bottom, 12) + 72 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close trek details" onPress={() => setSelectedId(null)} style={{ alignSelf: 'flex-end', minHeight: 32, minWidth: 44 }}><Text style={{ color: colors.lime }}>Close ×</Text></Pressable>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetCopy}>
              <View style={styles.sheetBadges}>
                <Badge label={selected.region.toUpperCase()} tone="neutral" />
                <Badge label={selected.difficulty} tone={difficultyTone[selected.difficulty]} />
              </View>
              <Text style={styles.sheetTitle}>{selected.name}</Text>

            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{selected.days.replace(' days', '')}</Text>
              <Text style={styles.statLabel}>DAYS</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{(selected.maxElevation / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>MAX M</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>+{Math.round(stats.ascent / 100) / 10}k</Text>
              <Text style={styles.statLabel}>APPROX. GAIN</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{stats.stops}</Text>
              <Text style={styles.statLabel}>STOPS</Text>
            </View>
          </View>

          <View style={styles.sheetActions}>
            <Button label="Open trek" onPress={() => router.push(`/trek/${selected.id}`)} style={styles.sheetButton} />
            <Button label="Start Trek" onPress={() => router.push({ pathname: '/journey', params: { trek: selected.id } })} style={styles.sheetButton} variant="outline" />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.nightDeep, flex: 1 },
  topBar: { left: 0, position: 'absolute', right: 0, top: 0 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  titleCopy: { flex: 1 },
  titleKicker: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.white, fontSize: 25, fontWeight: '700', letterSpacing: -0.7, lineHeight: 31, marginTop: 5 },
  resetButton: { alignItems: 'center', backgroundColor: 'rgba(8,13,18,0.82)', borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, height: 44, justifyContent: 'center', marginTop: 4, width: 44 },
  chips: { gap: 9, paddingHorizontal: 20, paddingVertical: 14 },
  chip: { alignItems: 'center', backgroundColor: 'rgba(8,13,18,0.8)', borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  chipOn: { borderColor: colors.lime, backgroundColor: 'rgba(228,255,137,0.16)' },
  chipDot: { borderRadius: 4, height: 8, width: 8 },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: colors.lime },
  pressed: { opacity: 0.75 },
  banner: { backgroundColor: 'rgba(255,111,97,0.16)', borderColor: 'rgba(255,111,97,0.4)', borderRadius: radius.md, borderWidth: 1, marginHorizontal: 20, padding: 12 },
  bannerText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  locateButton: { ...shadow, alignItems: 'center', backgroundColor: colors.lime, borderRadius: radius.pill, height: 54, justifyContent: 'center', position: 'absolute', right: 20, width: 54 },
  sheet: {
    ...shadow,
    backgroundColor: 'rgba(13,20,26,0.96)',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    left: 16,
    bottom: 8,
    padding: 14,
    position: 'absolute',
    right: 16,
  },
  sheetHeader: { flexDirection: 'row' },
  sheetCopy: { flex: 1 },
  sheetBadges: { flexDirection: 'row', gap: 8 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 10 },
  sheetSummary: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCell: { alignItems: 'center', backgroundColor: 'rgba(25,41,58,0.7)', borderRadius: radius.md, flex: 1, paddingVertical: 10 },
  statValue: { color: colors.lime, fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.faint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: space.md },
  sheetButton: { flex: 1 },
});
