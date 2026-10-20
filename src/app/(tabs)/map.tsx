import { PlaceSearch } from '@/components/PlaceSearch';
import type { Place } from '@/services/places/types';
import { satelliteTiles, satelliteAttribution, basemapOptions } from '@/services/map-providers';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Typography';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MapBasemap, NepalMapProps } from '@/components/maps/document';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import type { CloudMember } from '@/types/cloud';
import { NepalMap } from '@/components/NepalMap';
import { ElevationProfile } from '@/components/ElevationProfile';
import { TabIcon } from '@/components/TabIcon';
import { Badge, Button, Chip, Reveal, useReducedMotion } from '@/components/ui';
import { colorForTrek } from '@/data/map-style';
import { NEPAL_REGION, cumulativeKm, regionForTrek, trekById, trekStats, treks, type MapRegion } from '@/data/treks';
import { useMyLocation } from '@/hooks/useMyLocation';
import { useMeasuredSize } from '@/hooks/useMeasuredSize';
import { colors, radius, shadow, space } from '@/theme/tokens';

const difficultyTone = { Moderate: 'lime', Challenging: 'warning', Strenuous: 'danger' } as const;

export default function MapScreen() {
  const params = useLocalSearchParams<{ trek?: string; group?: string; latitude?: string; longitude?: string }>();
  const members = useGroupFeed<CloudMember>(params.group ?? '', 'members');
  const positions: NonNullable<NepalMapProps['positions']> = members.items.filter(item => item.lastLocation && item.locationSharingEnabled).map(item => ({ id: item.id, name: item.name, latitude: item.lastLocation!.latitude, longitude: item.lastLocation!.longitude, recordedAt: item.lastLocation!.capturedAt }));
  const alertLat = Number(params.latitude); const alertLng = Number(params.longitude);
  const hasAlertPosition = Boolean(params.latitude && params.longitude && Number.isFinite(alertLat) && Number.isFinite(alertLng) && Math.abs(alertLat) <= 90 && Math.abs(alertLng) <= 180);
  if (hasAlertPosition) positions.push({ id: 'alert', name: 'Alert position', latitude: alertLat, longitude: alertLng, recordedAt: 'at alert creation', alert: true });
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const reduced = useReducedMotion();
  const { coords, state, locate } = useMyLocation();
  const [selectedId, setSelectedId] = useState<string | null>(typeof params.trek === 'string' && trekById(params.trek) ? params.trek : null);
  const [region, setRegion] = useState<MapRegion>(() => { if (hasAlertPosition) return { latitude: alertLat, longitude: alertLng, latitudeDelta: 0.03, longitudeDelta: 0.03 }; const trek = typeof params.trek === 'string' ? trekById(params.trek) : null; return trek ? regionForTrek(trek) : { latitude: 27.68, longitude: 85.35, latitudeDelta: 0.32, longitudeDelta: 0.38 }; });
  const [nonce, setNonce] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [foundPlace, setFoundPlace] = useState<Place | null>(null);
  const [basemap, setBasemap] = useState<MapBasemap>('terrain');
  const [expanded, setExpanded] = useState(false);
  const { measureRef: attachCard, size: cardSize, onLayout: cardLayout } = useMeasuredSize();
  const { measureRef: attachHeader, size: headerSize, onLayout: headerLayout } = useMeasuredSize();

  const layers = useMemo(() => basemapOptions(satelliteTiles, satelliteAttribution), []);
  const selected = useMemo(() => (selectedId ? trekById(selectedId) : null), [selectedId]);
  const stats = useMemo(() => (selected ? trekStats(selected.route) : null), [selected]);
  const distances = useMemo(() => (selected ? cumulativeKm(selected.route) : []), [selected]);

  const [appliedTrek, setAppliedTrek] = useState(params.trek);
  if (params.trek !== appliedTrek) {
    setAppliedTrek(params.trek);
    const next = typeof params.trek === 'string' ? trekById(params.trek) : null;
    if (next) { setSelectedId(next.id); setRegion(regionForTrek(next)); setNonce(value => value + 1); }
  }

  const alertKey = hasAlertPosition ? `${alertLat}/${alertLng}` : '';
  const [appliedAlert, setAppliedAlert] = useState(alertKey);
  if (alertKey !== appliedAlert) {
    setAppliedAlert(alertKey);
    if (hasAlertPosition) {
      setSelectedId(null);
      setRegion({ latitude: alertLat, longitude: alertLng, latitudeDelta: 0.03, longitudeDelta: 0.03 });
      setNonce(value => value + 1);
    }
  }

  function flyTo(next: MapRegion, trek: string | null) {
    setFoundPlace(null); setSearchOpen(false);
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

  // The header is measured so the map starts under it, and the trek card gets a fixed
  // allowance it scrolls inside. Neither depends on the card's own content height, so the
  // map always keeps ~162 px and the card can never slide over it.
  const dock = Math.max(insets.bottom, 12) + 72;
  const cardOpen = Boolean(selected || foundPlace);
  const headerHeight = Math.round(headerSize.height);
  const mapTop = expanded ? insets.top + 12 : (headerHeight || insets.top + 205);
  const cardHeight = Math.max(214, Math.round(viewport.height - mapTop - dock - 174));
  // Expanded mode floats the card over the map, so it may not eat more than a slice of it.
  const cardAllowance = expanded ? Math.min(cardHeight, Math.round(viewport.height * 0.45)) : cardHeight;
  const foundHeight = Math.round(cardSize.height);
  const reserved = !cardOpen ? 44 : selected ? cardHeight + 12 : Math.min(foundHeight || cardHeight, cardHeight) + 12;
  const mapBottom = expanded ? Math.max(insets.bottom, 12) + 12 : dock + reserved;

  return (
    <View style={styles.root}><LinearGradient colors={[colors.homeTop, colors.homeMiddle, colors.homeBottom]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: mapTop, bottom: mapBottom }}><NepalMap basemap={basemap} endpoints={foundPlace ? { end: foundPlace } : undefined} positions={positions} key="nepal-map" myCoords={coords} onSelectTrek={selectTrek} region={region} regionNonce={nonce} selectedId={selectedId} /></View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: mapBottom + 6, left: 16, right: 80 }}>
        <Text style={styles.caveat}>Online tiles · approximate waypoints, not a navigation track</Text>
      </View>

      {expanded ? (
        <ScrollView contentContainerStyle={[styles.expandBar, { paddingTop: insets.top + 10 }]} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
          <Chip label="Trails" selected={false} onPress={() => setExpanded(false)} />
          {layers.map(layer => <Chip key={layer.id} label={layer.label} selected={basemap === layer.id} onPress={() => setBasemap(layer.id)} />)}
        </ScrollView>
      ) : (
      <View pointerEvents="box-none" onLayout={headerLayout} ref={attachHeader} style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        {cardOpen ? null : (
        <Reveal>
          <View style={styles.titleRow}>
            <Text style={styles.titleKicker}>NEPAL · TERRAIN & TRAILS</Text>
            <Text style={styles.title}>Find your trail.</Text>
          </View>
        </Reveal>
        )}

        <View style={styles.layerRow}>
          <Button label={searchOpen ? 'Close search' : 'Search hikes & places'} variant="outline" onPress={() => setSearchOpen(value => !value)} style={{ flex: 1 }} />
          <Pressable accessibilityLabel="Zoom out to all of Nepal" accessibilityRole="button" onPress={() => flyTo(NEPAL_REGION, null)} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
            <TabIcon color={colors.lime} name="compass" size={20} />
          </Pressable>
          <Pressable accessibilityLabel="Expand the map to full screen" accessibilityRole="button" onPress={() => { setExpanded(true); setSearchOpen(false); }} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
            <TabIcon color={colors.lime} name="map" size={20} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {layers.map(layer => <Chip key={layer.id} label={layer.label} selected={basemap === layer.id} onPress={() => setBasemap(layer.id)} />)}
        </ScrollView>
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
      )}

      <Pressable
        accessibilityLabel="Find my location"
        accessibilityRole="button"
        disabled={state === 'locating'}
        onPress={() => void focusMe()}
        style={({ pressed }) => [styles.locateButton, { bottom: mapBottom + 26 }, pressed && styles.pressed]}
      >
        <TabIcon color={state === 'locating' ? colors.faint : colors.onAccent} name="pin" size={22} />
      </Pressable>

      {searchOpen && <ScrollView keyboardShouldPersistTaps="handled" style={{ position: 'absolute', zIndex: 20, left: 16, right: 16, top: insets.top + 195, maxHeight: '55%', backgroundColor: colors.navy, borderRadius: 24 }} contentContainerStyle={{ padding: 16 }}><PlaceSearch autoFocus near={coords ?? undefined} onSelect={place => { setFoundPlace(place); setSelectedId(null); setSearchOpen(false); setRegion({ ...place, latitudeDelta: .06, longitudeDelta: .06 }); setNonce(value => value + 1); }} /></ScrollView>}
      {foundPlace && !searchOpen && <View pointerEvents="box-none" onLayout={cardLayout} ref={attachCard} style={[styles.sheet, { bottom: dock }]}><View style={styles.sheetInner}><Text style={styles.sheetTitle}>{foundPlace.name}</Text><Text style={styles.sheetSummary}>{foundPlace.type === 'peak' ? 'Hill / mountain destination · choose an accessible trailhead before routing.' : foundPlace.fullName}</Text><Button label="Plan a walk here" onPress={() => router.push({ pathname: '/trek-plan', params: { destination: JSON.stringify(foundPlace) } })} /></View></View>}
      {selected && stats ? (
        <Animated.View entering={reduced ? undefined : FadeInUp.duration(320)} pointerEvents="box-none" style={[styles.sheet, { bottom: dock }]}>
          <View pointerEvents="box-none" style={[styles.sheetInner, { height: cardAllowance }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close trek details" hitSlop={12} onPress={() => setSelectedId(null)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><Text style={styles.closeText}>Close ×</Text></Pressable>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetCopy}>
              <View style={styles.sheetBadges}>
                <Badge label={selected.region.toUpperCase()} tone="neutral" />
                <Badge label={selected.difficulty} tone={difficultyTone[selected.difficulty]} />
                <Badge label={selected.routeType.toUpperCase()} tone="info" />
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
              <Text style={styles.statValue}>{stats.km}</Text>
              <Text style={styles.statLabel}>APPROX. KM</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>+{Math.round(stats.ascent / 100) / 10}k</Text>
              <Text style={styles.statLabel}>APPROX. GAIN</Text>
            </View>
          </View>

          <ElevationProfile caption={`ELEVATION · ${selected.days.toUpperCase()} PROFILE (APPROX.)`} color={colorForTrek(selected.id)} height={76} km={distances} stops={selected.route} style={styles.profile} />
          </ScrollView>

          <View style={styles.sheetActions}>
            <Button label="Open trek" onPress={() => router.push(`/trek/${selected.id}`)} style={styles.sheetButton} />
            <Button label="Preview trek" onPress={() => router.push({ pathname: '/journey', params: { trek: selected.id } })} style={styles.sheetButton} variant="outline" />
          </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.nightDeep, flex: 1 },
  topBar: { left: 0, position: 'absolute', right: 0, top: 0 },
  expandBar: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  caveat: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  titleRow: { paddingHorizontal: 20, marginBottom: 2 },
  titleKicker: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.white, fontSize: 25, fontWeight: '700', letterSpacing: -0.7, lineHeight: 31, marginTop: 5 },
  layerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  resetButton: { alignItems: 'center', backgroundColor: 'rgba(8,13,18,0.82)', borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  chips: { gap: 9, paddingHorizontal: 20, paddingVertical: 8 },
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
    left: 16,
    bottom: 8,
    position: 'absolute',
    right: 16,
  },
  sheetInner: {
    ...shadow,
    backgroundColor: 'rgba(13,20,26,0.96)',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  closeButton: { alignSelf: 'flex-end', minHeight: 32, minWidth: 44 },
  sheetScroll: { flex: 1, minHeight: 0 },
  closeText: { color: colors.lime, fontSize: 14, fontWeight: '700' },
  sheetHeader: { flexDirection: 'row' },
  sheetCopy: { flex: 1 },
  sheetBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 10 },
  sheetSummary: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCell: { alignItems: 'center', backgroundColor: 'rgba(25,41,58,0.7)', borderRadius: radius.md, flex: 1, paddingVertical: 10 },
  statValue: { color: colors.lime, fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.faint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  profile: { marginTop: 14 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: space.md },
  sheetButton: { flex: 1 },
});
