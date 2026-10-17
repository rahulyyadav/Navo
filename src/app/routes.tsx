import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { planGPXSegment } from "@/services/routes/gpx-plan";
import { changeAdventures } from "@/lib/adventure-store";
import { suggestedDeparture } from "@/services/day-hike";
import * as Crypto from "expo-crypto";
import { Text } from "@/components/Typography";
import {
  Backdrop,
  Badge,
  Button,
  Card,
  Heading,
  Field,
  Chip,
  Notice,
} from "@/components/ui";
import { RouteElevationProfile } from '@/components/trekking/RouteElevationProfile';
import { ImportedRoutePreview } from "@/components/trekking/ImportedRoutePreview";
import { NepalMap } from "@/components/NepalMap";
import { useNavo } from "@/context/NavoContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { pickGPX, shareGPX } from "@/lib/gpx-files";
import { readRoutes, updateRoutes } from "@/lib/route-store";
import {
  exportGPX,
  parseGPX,
  routeStats,
  type ImportedRoute,
} from "@/services/routes/gpx";
import { indexRouteLibrary, searchRouteLibrary, type RouteLibraryOrder } from '@/services/routes/library';
import { colors } from "@/theme/tokens";

export default function RoutesScreen() {
  const { userId } = useNavo();
  return <RouteLibrary key={userId} uid={userId ?? ""} />;
}
function RouteLibrary({ uid }: { uid: string }) {
  const { page } = usePageLayout();
  const scroll = useRef<ScrollView>(null);
  const [routes, setRoutes] = useState<ImportedRoute[]>([]);
  const [selected, setSelected] = useState<ImportedRoute | null>(null);
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<RouteLibraryOrder>('recent');
  const index = useMemo(() => indexRouteLibrary(routes), [routes]);
  const matching = useMemo(() => searchRouteLibrary(index, query, order), [index, query, order]);
  const [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const alive = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    readRoutes(uid)
      .then((value) => {
        if (alive.current) {
          setRoutes(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive.current)
          setError(
            "Saved routes could not be read. Reopen this screen to retry. Existing data has not been changed.",
          );
      });
    return () => {
      alive.current = false;
    };
  }, [uid]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "This action could not finish. Please try again.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => { if (selected) scroll.current?.scrollTo({y:0,animated:false}); }, [selected]);
  const stats = selected ? routeStats(selected) : null;
  const points = selected?.segments.flat() ?? [];
  const minLat = Math.min(...points.map((p) => p.latitude)),
    maxLat = Math.max(...points.map((p) => p.latitude));
  const minLon = Math.min(...points.map((p) => p.longitude)),
    maxLon = Math.max(...points.map((p) => p.longitude));
  const saved = selected && routes.some((r) => r.id === selected.id);
  return (
    <Backdrop>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.page, page]}>
        <Heading
          title="Your trail library"
          subtitle="Bring a GPX track from a source you trust. Review its geometry before you head out."
        />
        <Notice message={error} />
        <Button
          label="Import a GPX file"
          disabled={busy || !loaded}
          busy={busy}
          onPress={() =>
            void run(async () => {
              const xml = await pickGPX();
              if (xml && alive.current) {
                setSelected(parseGPX(xml, Crypto.randomUUID()));
                setConfirm(false);
              }
            })
          }
        />
        {selected && stats && (
          <>
            <Card>
              <Badge label="IMPORTED · NOT VERIFIED" tone="warning" />
              <Heading title={selected.name} />
              <Text style={styles.copy}>
                {(stats.metres / 1000).toFixed(2)} km of supplied geometry ·{" "}
                {selected.segments.length} segment
                {selected.segments.length === 1 ? "" : "s"} ·{" "}
                {stats.points.toLocaleString()} points
              </Text>
              <Text style={styles.copy}>
                {stats.ascent === null
                  ? "Elevation is incomplete. Ascent and descent are unavailable."
                  : `Raw elevation: ${Math.round(stats.ascent)} m up · ${Math.round(stats.descent!)} m down. Source noise can inflate these totals.`}
              </Text>
              {selected.segments.length > 1 && (
                <Notice
                  tone="warning"
                  message="This file contains separate segments. Gaps are not joined or counted as walking distance."
                />
              )}
              {stats.longestStep > 500 && (
                <Notice
                  tone="warning"
                  message="Some points are more than 500 m apart. This may be a sparse route or a recording gap, not a continuous trail."
                />
              )}
            </Card>
            <RouteElevationProfile route={selected} />
            <ImportedRoutePreview key={selected.id} route={selected} />
            <View style={styles.map}>
              <NepalMap
                region={{
                  latitude: (minLat + maxLat) / 2,
                  longitude: (minLon + maxLon) / 2,
                  latitudeDelta: Math.max(0.005, (maxLat - minLat) * 1.2),
                  longitudeDelta: Math.max(0.005, (maxLon - minLon) * 1.2),
                }}
                regionNonce={0}
                selectedId={selected.id}
                onSelectTrek={() => undefined}
                myCoords={null}
                importedSegments={selected.segments}
              />
            </View>
            <Text style={styles.copy}>
              The map requires internet. Saved coordinates remain on this
              device. Importing does not establish access rights, trail
              conditions, or safe turn-by-turn directions.
            </Text>
            {!saved && (
              <Button
                label="Save route on this device"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const next = await updateRoutes(uid, (previous) => [
                      ...previous,
                      selected,
                    ]);
                    if (alive.current) setRoutes(next);
                  })
                }
              />
            )}
            <Card>
              <Text style={styles.copy}>
                GPS guidance uses your supplied line. Imported tracks are
                unverified. Time estimates assume 4 km/h before terrain and
                breaks; separate segments are followed individually.
              </Text>
              {selected.segments.map((_, i) => (
                <Button
                  key={i}
                  label={`Follow GPX segment ${i + 1}`}
                  variant="outline"
                  disabled={
                    busy ||
                    routeStats({
                      ...selected,
                      segments: [selected.segments[i]],
                    }).longestStep > 500
                  }
                  onPress={() =>
                    void run(async () => {
                      const departure = suggestedDeparture();
                      const plan = planGPXSegment(
                        selected,
                        i,
                        Crypto.randomUUID(),
                        departure.date,
                        departure.time,
                      );
                      await changeAdventures(uid, (v) => ({
                        ...v,
                        plans: [plan, ...v.plans].slice(0, 20),
                      }));
                      if (alive.current)
                        router.push({
                          pathname: "/navigate",
                          params: { plan: plan.id },
                        });
                    })
                  }
                />
              ))}
            </Card>
            <Button
              label="Export GPX"
              variant="outline"
              disabled={busy}
              onPress={() => void run(() => shareGPX(exportGPX(selected)))}
            />
            {saved && (
              <Button
                label="Remove saved route"
                variant="quiet"
                disabled={busy}
                onPress={() => setConfirm(true)}
              />
            )}
            {confirm && (
              <Card>
                <Text style={styles.copy}>
                  Remove this route from this account on this device? Your
                  original GPX file is unchanged.
                </Text>
                <Button
                  label="Remove route"
                  variant="danger"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const next = await updateRoutes(uid, (previous) =>
                        previous.filter((r) => r.id !== selected.id),
                      );
                      if (alive.current) {
                        setRoutes(next);
                        setSelected(null);
                        setConfirm(false);
                      }
                    })
                  }
                />
                <Button
                  label="Keep route"
                  variant="quiet"
                  onPress={() => setConfirm(false)}
                />
              </Card>
            )}
          </>
        )}
        <Heading
          title={`Saved routes · ${routes.length}/20`}
          subtitle="Private to this account on this device. Export a copy before changing phones."
        />
        {loaded && !routes.length && (
          <Card>
            <Text style={styles.copy}>
              No routes saved yet. Import a GPX to see its distance, elevation
              availability and segment gaps.
            </Text>
          </Card>
        )}
        {routes.length > 0 && <>
          <Field label="Search saved GPX routes" value={query} onChangeText={setQuery} placeholder="Route name…" autoCorrect={false} />
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {([['recent','Newest'],['shortest','Shortest'],['longest','Longest']] as const).map(([value,label]) => <Chip key={value} label={label} selected={order===value} onPress={() => setOrder(value)} />)}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.copy}>{matching.length} of {routes.length} saved routes</Text>
          {!matching.length && <Card><Text style={styles.copy}>No saved route matches this search.</Text><Button label="Clear search" variant="outline" onPress={() => setQuery('')} /></Card>}
        </>}
        {matching.map(({route,stats:summary}) => (
          <Card key={route.id}>
            <Text style={{color:colors.ink,fontSize:18,fontWeight:'700'}}>{route.name}</Text>
            <Text style={styles.copy}>{(summary.metres/1000).toFixed(2)} km · {summary.ascent === null ? 'Elevation incomplete' : `${Math.round(summary.ascent)} m raw ascent`} · {route.segments.length} segment{route.segments.length===1?'':'s'}</Text>
            <Badge label="YOUR GPX · NOT VERIFIED" tone="warning" />
            <Button label={`Review ${route.name}`} variant="outline" disabled={busy} onPress={() => { setSelected(route); setConfirm(false); scroll.current?.scrollTo({y:0,animated:false}); }} />
          </Card>
        ))}
      </ScrollView>
    </Backdrop>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: 20, gap: 18 },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 8,
  },
  map: { height: 340, borderRadius: 24, overflow: "hidden" },
});
