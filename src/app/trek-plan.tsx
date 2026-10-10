import { openLocationSettings } from "@/lib/location-settings";
import type { HourlyForecast } from "@/services/weather/hourly";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { Text } from "@/components/Typography";
import {
  Backdrop,
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Heading,
  Notice,
  SectionTitle,
  useReducedMotion,
} from "@/components/ui";
import { shareGPX } from "@/lib/gpx-files";
import { exportGPX } from "@/services/routes/gpx";
import { utf8Bytes } from "@/services/utf8";
import { RouteCrew } from "@/components/RouteCrew";
import { RouteAssistant } from "@/components/RouteAssistant";
import { trekChatContext } from "@/services/routing/ai-context";
import { PlaceSearch } from "@/components/PlaceSearch";
import { NepalMap } from "@/components/NepalMap";
import { AdventureWeather } from "@/components/AdventureWeather";
import { useNavo } from "@/context/NavoContext";
import { useMyLocation } from "@/hooks/useMyLocation";
import { usePageLayout } from "@/hooks/usePageLayout";
import {
  changeAdventures,
  readAdventures,
  rememberPlace,
} from "@/lib/adventure-store";
import {
  coordinatePlace,
  isCoordinate,
  type Place,
} from "@/services/places/types";
import {
  calculateWalkingRoutes,
  plannedDuration,
  routeDuration,
} from "@/services/routing/walking";
import type { RoutePlan, WalkingRoute } from "@/services/routing/types";
import {
  directionsURL,
  suggestedDeparture,
  validHikeDate,
} from "@/services/day-hike";
import { colors, radius, space } from "@/theme/tokens";

function selectedPlace(raw: unknown): Place | null {
  try {
    const p = JSON.parse(typeof raw === "string" ? raw : "null");
    return typeof p?.name === "string" &&
      p.name.length <= 200 &&
      typeof p?.id === "string" &&
      typeof p?.fullName === "string" &&
      isCoordinate(p)
      ? (p as Place)
      : null;
  } catch {
    return null;
  }
}
export default function TrekPlanScreen() {
  const { userId } = useNavo();
  const params = useLocalSearchParams<{ destination?: string }>();
  const destination = useMemo(
    () => selectedPlace(params.destination),
    [params.destination],
  );
  return (
    <Planner
      key={`${userId}:${destination?.id ?? "new"}`}
      uid={userId ?? ""}
      initialDestination={destination}
    />
  );
}
function Planner({
  uid,
  initialDestination,
}: {
  uid: string;
  initialDestination: Place | null;
}) {
  const { email, isSignedIn } = useNavo();
  const { page } = usePageLayout(),
    gps = useMyLocation();
  const [approach, setApproach] = useState(false);
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const [destination, setDestination] = useState(initialDestination),
    [origin, setOrigin] = useState<Place | null>(null),
    [stops, setStops] = useState<Place[]>([]);
  const [recent, setRecent] = useState<Place[]>([]),
    [searchTarget, setSearchTarget] = useState<
      "origin" | "destination" | "stop" | null
    >(initialDestination ? null : "destination");
  const [mapTarget, setMapTarget] = useState<"origin" | "destination" | null>(
    null,
  );
  const [departure] = useState(suggestedDeparture);
  const [date, setDate] = useState(departure.date),
    [time, setTime] = useState(departure.time),
    [pace, setPace] = useState<RoutePlan["pace"]>("normal");
  const [routes, setRoutes] = useState<WalkingRoute[]>([]),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [mapNonce, setMapNonce] = useState(0);
  const scroll = useRef<ScrollView | null>(null);
  const presented = useRef(false);
  const reduced = useReducedMotion();
  const pending = useRef<AbortController | null>(null),
    alive = useRef(true),
    saveLock = useRef(false);
  useEffect(() => {
    alive.current = true;
    void readAdventures(uid)
      .then((v) => {
        if (alive.current) setRecent(v.recent);
      })
      .catch(() => undefined);
    return () => {
      alive.current = false;
      pending.current?.abort();
    };
  }, [uid]);
  function invalidate() {
    presented.current = false;
    setMapNonce((v) => v + 1);
    setForecast(null);
    setRoutes([]);
    setSelected(0);
    setMessage("");
    setError("");
  }
  function choose(place: Place) {
    if (searchTarget === "origin") setOrigin(place);
    else if (searchTarget === "stop")
      setStops((v) => (v.length < 3 ? [...v, place] : v));
    else setDestination(place);
    setSearchTarget(null);
    invalidate();
    void rememberPlace(uid, place).catch(() => undefined);
  }
  async function locate() {
    setError("");
    const fix = await gps.locate();
    if (!alive.current) return;
    if (!fix || fix.accuracy === null || fix.accuracy > 100) {
      setError(
        "A usable GPS position was not available. Check location permission or search another starting point.",
      );
      return;
    }
    setOrigin(coordinatePlace(fix, "Current location"));
    invalidate();
  }
  async function calculate() {
    if (pending.current) return;
    setError("");
    setMessage("");
    if (!origin || !destination) {
      setError("Choose your starting point and destination first.");
      return;
    }
    if (!validHikeDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Choose today or a future date and a time in HH:MM format.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const values = await calculateWalkingRoutes(
        origin,
        destination,
        stops,
        controller.signal,
      );
      if (alive.current) {
        setRoutes(values);
        setSelected(0);
      }
    } catch (f) {
      if (alive.current && !controller.signal.aborted)
        setError(
          f instanceof Error
            ? f.message
            : "Could not calculate a walking route.",
        );
    } finally {
      pending.current = null;
      if (alive.current) setBusy(false);
    }
  }
  const route = routes[selected];
  async function save(start = false) {
    if (saveLock.current || !route || !origin || !destination) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      const plan: RoutePlan = {
        version: 1,
        id: Crypto.randomUUID(),
        name: destination.name.slice(0, 120),
        origin,
        destination,
        stops,
        date,
        time,
        pace,
        route,
        savedAt: new Date().toISOString(),
        weather: forecast,
      };
      await changeAdventures(uid, (v) => ({
        ...v,
        plans: [plan, ...v.plans].slice(0, 20),
      }));
      if (alive.current) {
        setMessage(
          "Plan saved on this device. Its route geometry is available offline.",
        );
        if (start)
          router.push({ pathname: "/navigate", params: { plan: plan.id } });
      }
    } catch (f) {
      if (alive.current)
        setError(f instanceof Error ? f.message : "Could not save this route.");
    } finally {
      saveLock.current = false;
      if (alive.current) setSaving(false);
    }
  }
  const bounds = useMemo(() => {
    const points =
      route?.geometry ?? [origin, destination].filter((p): p is Place => !!p);
    if (!points.length)
      return {
        latitude: 27.7,
        longitude: 85.3,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    const lat = points.map((p) => p.latitude),
      lon = points.map((p) => p.longitude),
      minLat = Math.min(...lat),
      maxLat = Math.max(...lat),
      minLon = Math.min(...lon),
      maxLon = Math.max(...lon);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.006, (maxLat - minLat) * 1.2),
      longitudeDelta: Math.max(0.006, (maxLon - minLon) * 1.2),
    };
  }, [route, origin, destination]);
  const finish = route
    ? new Date(
        Date.parse(`${date}T${time}:00+05:45`) +
          Math.round(plannedDuration(route, pace) / 60) * 60000 +
          345 * 60000,
      )
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")
    : "";
  const mapBlock = (
    <View style={styles.map}>
      <NepalMap
        region={bounds}
        regionNonce={mapNonce + routes.length}
        selectedId={null}
        onSelectTrek={() => undefined}
        myCoords={null}
        walkingRoutes={routes.map((r) => ({
          id: r.id,
          geometry: r.geometry,
        }))}
        walkingRouteId={route?.id}
        endpoints={
          destination
            ? {
                start: route?.snappedStart ?? origin ?? undefined,
                end: route?.snappedEnd ?? destination,
              }
            : undefined
        }
        onSelectCoordinate={
          mapTarget
            ? (p) => {
                const place = coordinatePlace(p);
                if (mapTarget === "origin") setOrigin(place);
                else setDestination(place);
                setMapTarget(null);
                invalidate();
              }
            : undefined
        }
      />
    </View>
  );
  return (
    <Backdrop>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.page, page]}
      >
        <Heading
          title={
            destination ? `Walk to ${destination.name}` : "Where are you going?"
          }
          subtitle="Search a place, choose an accessible starting point, then compare real walking routes."
        />
        <Notice message={error} />
        <Notice tone="info" message={message} />
        {!isSignedIn && (
          <Notice
            tone="info"
            message="Explore routes freely. Sign in to save a plan, record a hike and keep private history."
          />
        )}
        <Card>
          <SectionTitle title="Your destination" />
          <Text style={styles.title}>
            {destination?.name ?? "Choose a place"}
          </Text>
          <Text style={styles.copy}>
            {destination?.fullName ??
              "Search globally for a settlement, landmark or trailhead."}
          </Text>
          {destination && <Badge label={`DESTINATION · ${destination.type}`} />}
          <Button
            label="Search destination"
            variant="quiet"
            disabled={busy}
            onPress={() => setSearchTarget("destination")}
          />
          {destination && (
            <Button
              label={
                isSignedIn ? "Save this place" : "Sign in to save this place"
              }
              variant="quiet"
              onPress={() => {
                if (!isSignedIn) {
                  router.push("/login");
                  return;
                }
                void changeAdventures(uid, (v) => ({
                  ...v,
                  savedPlaces: [
                    destination,
                    ...v.savedPlaces.filter((p) => p.id !== destination.id),
                  ].slice(0, 50),
                }))
                  .then(() => {
                    if (alive.current)
                      setMessage("Place saved in your adventures.");
                  })
                  .catch(() => {
                    if (alive.current) setError("Could not save this place.");
                  });
              }}
            />
          )}
        </Card>
        <Card>
          <SectionTitle title="Starting point" />
          <Text style={styles.title}>{origin?.name ?? "Current location"}</Text>
          <Text style={styles.copy}>
            {origin?.fullName ??
              "Location access starts only when you tap below. Routing sends the start and destination to the walking provider."}
          </Text>
          <Button
            label="Use my current location"
            variant="outline"
            busy={gps.state === "locating"}
            disabled={busy || gps.state === "locating"}
            onPress={() => void locate()}
          />
          {gps.state === "denied" && (
            <Button
              label="Open location settings"
              variant="quiet"
              onPress={() =>
                void openLocationSettings().then((message) => {
                  if (message) setError(message);
                })
              }
            />
          )}
          <Button
            label="Search another start"
            variant="quiet"
            disabled={busy}
            onPress={() => setSearchTarget("origin")}
          />
          <Button
            label="Pick start on the map"
            variant="quiet"
            disabled={busy}
            onPress={() => setMapTarget("origin")}
          />
          {origin && origin.name !== "Current location" && (
            <Button
              label={
                approach
                  ? "Hide approach options"
                  : "How to reach this walking start"
              }
              variant="quiet"
              onPress={() => setApproach((v) => !v)}
            />
          )}
          {approach && origin && (
            <>
              <Text style={styles.copy}>
                Reach the selected walking start before beginning the hike.
                Google Maps can show road or bus options; confirm local stops,
                schedules and fares. The selected start point is shared with
                Google when you open directions.
              </Text>
              {(
                [
                  ["driving", "Road / cab directions"],
                  ["transit", "Bus / transit options"],
                ] as const
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  label={label}
                  variant="outline"
                  onPress={() =>
                    void Linking.openURL(
                      directionsURL(
                        `${origin.latitude},${origin.longitude}`,
                        "",
                        mode,
                      ),
                    ).catch(() =>
                      setError("Could not open the directions app."),
                    )
                  }
                />
              ))}
            </>
          )}
        </Card>
        {searchTarget && (
          <Card>
            <PlaceSearch
              key={searchTarget}
              label={
                searchTarget === "stop"
                  ? "Add a stop"
                  : `Search ${searchTarget}`
              }
              recent={recent}
              near={origin ?? undefined}
              onSelect={choose}
              autoFocus
            />
            <Button
              label="Close search"
              variant="quiet"
              onPress={() => setSearchTarget(null)}
            />
          </Card>
        )}
        {!route && mapBlock}
        {mapTarget && (
          <Notice
            tone="info"
            message={`Tap the map to set your ${mapTarget}.`}
          />
        )}
        <Card>
          <SectionTitle title="When & how" />
          <Field
            label="Date · YYYY-MM-DD"
            value={date}
            onChangeText={(v) => {
              setDate(v);
              invalidate();
            }}
            maxLength={10}
            editable={!busy}
          />
          <Field
            label="Start time · HH:MM · Nepal time"
            value={time}
            onChangeText={(v) => {
              setTime(v);
              invalidate();
            }}
            maxLength={5}
            editable={!busy}
          />
          <Text style={styles.copy}>
            Walking pace · scales the provider estimate; allow extra time for
            breaks and terrain.
          </Text>
          <View style={styles.row}>
            {(["relaxed", "normal", "brisk"] as const).map((v) => (
              <Chip
                key={v}
                label={v}
                selected={pace === v}
                onPress={() => setPace(v)}
              />
            ))}
          </View>
          {stops.map((p, i) => (
            <View key={`${p.id}:${i}`}>
              <Text style={styles.copy}>
                Stop {i + 1}: {p.name}
              </Text>
              <Button
                label={`Remove stop ${i + 1}`}
                variant="quiet"
                disabled={busy}
                onPress={() => {
                  setStops((v) => v.filter((_, index) => index !== i));
                  invalidate();
                }}
              />
            </View>
          ))}
          {stops.length < 3 && (
            <Button
              label="Add an optional stop"
              variant="quiet"
              disabled={busy}
              onPress={() => setSearchTarget("stop")}
            />
          )}
          <Button
            label="Find walking routes"
            busy={busy}
            disabled={busy || saving}
            onPress={() => void calculate()}
          />
        </Card>
        {route && (
          <View
            style={{ gap: space.md }}
            onLayout={(event) => {
              if (!presented.current) {
                presented.current = true;
                scroll.current?.scrollTo({
                  y: Math.max(0, event.nativeEvent.layout.y - 12),
                  animated: !reduced,
                });
              }
            }}
          >
            {mapBlock}
            <Card>
              <SectionTitle
                title={
                  routes.length > 1
                    ? "Compare your routes"
                    : "Best available route"
                }
              />
              {routes.length > 1 && routes.map((r, i) => (
                <View key={r.id} style={{ marginBottom: space.md }}>
                  <Button
                    label={`${i === selected ? "Selected · " : ""}${r.name} · ${(r.distanceM / 1000).toFixed(1)} km · ${routeDuration(plannedDuration(r, pace))}`}
                    variant={i === selected ? "primary" : "outline"}
                    onPress={() => setSelected(i)}
                  />
                </View>
              ))}
              <Text style={styles.title}>
                {(route.distanceM / 1000).toFixed(2)} km ·{" "}
                {routeDuration(plannedDuration(route, pace))}
              </Text>
              <Text style={styles.copy}>
                Arrival {finish} NPT · walking estimate. Confirm access and trail suitability locally. Elevation and difficulty are unavailable.
              </Text>
              {(route.startOffsetM > 20 || route.endOffsetM > 20) && (
                <Notice
                  tone="warning"
                  message={`Routing uses nearby mapped endpoints: ${Math.round(route.startOffsetM)} m from your start and ${Math.round(route.endOffsetM)} m from your destination. Check these access points before departure.`}
                />
              )}
              <Text style={styles.copy}>
                {routes.length === 1
                  ? "Only one route was returned."
                  : `Provider returned ${routes.length} real options. Compare distance and estimated time; elevation and scenic quality were not supplied.`}
              </Text>
              <Button
                label="Export this route for your crew"
                variant="quiet"
                disabled={busy || saving}
                onPress={() => {
                  void (async () => {
                    try {
                      if (route.geometry.length > 20000)
                        throw new Error(
                          "This route is too detailed for a GPX pack. Choose a shorter stage.",
                        );
                      const xml = exportGPX({
                        version: 1,
                        id: route.id,
                        name: destination!.name,
                        source: "user-gpx",
                        verified: false,
                        importedAt: route.fetchedAt,
                        segments: [
                          route.geometry.map((p) => ({
                            ...p,
                            elevation: null,
                          })),
                        ],
                      });
                      if (utf8Bytes(xml) > 2000000)
                        throw new Error(
                          "The GPX export exceeds 2 MB. Choose a shorter stage.",
                        );
                      await shareGPX(xml);
                    } catch (f) {
                      setError(
                        f instanceof Error
                          ? f.message
                          : "Could not export this route.",
                      );
                    }
                  })();
                }}
              />
              <Button
                label={
                  isSignedIn ? "Save walking plan" : "Sign in to save this plan"
                }
                variant="outline"
                busy={saving}
                disabled={saving}
                onPress={() =>
                  isSignedIn ? void save() : router.push("/login")
                }
              />
              <View style={{ marginTop: space.md }}>
                <Button
                  label={
                    isSignedIn ? "Start Trek" : "Sign in to start tracking"
                  }
                  busy={saving}
                  disabled={saving}
                  onPress={() =>
                    isSignedIn ? void save(true) : router.push("/login")
                  }
                />
              </View>
            </Card>
            <RouteAssistant
              key={`${route.id}:${date}:${time}:${pace}`}
              email={isSignedIn ? email || null : null}
              context={trekChatContext({
                version: 1,
                id: "preview",
                name: destination!.name,
                origin: origin!,
                destination: destination!,
                stops,
                date,
                time,
                pace,
                route,
                savedAt: route.fetchedAt,
                weather: forecast,
              })}
            />
            <RouteCrew
              key={`${destination!.id}:${origin!.id}:${date}:${time}:${route.id}`}
              plan={{
                version: 1,
                id: "preview",
                name: destination!.name,
                origin: origin!,
                destination: destination!,
                stops,
                date,
                time,
                pace,
                route,
                savedAt: route.fetchedAt,
              }}
            />
            <AdventureWeather
              onForecast={setForecast}
              key={`${origin?.id}:${destination?.id}:${date}:${time}:${pace}:${route.id}`}
              origin={origin!}
              destination={destination!}
              date={date}
              time={time}
              durationS={plannedDuration(route, pace)}
            />
            <Card>
              <SectionTitle title="Walking instructions" />
              {route.instructions.slice(0, 12).map((i, index) => (
                <Text key={index} style={styles.copy}>
                  {index + 1}. {i.text} · {Math.round(i.distanceM)} m
                </Text>
              ))}
              {route.instructions.length > 12 && (
                <Text style={styles.copy}>
                  The complete instruction list is available during navigation.
                </Text>
              )}
            </Card>
          </View>
        )}
        <Button
          label={
            isSignedIn
              ? "My saved adventures"
              : "Sign in to open saved adventures"
          }
          variant="outline"
          onPress={() => router.push(isSignedIn ? "/adventures" : "/login")}
        />
        <Text style={styles.copy}>
          Routes: OSRM walking profile · OpenStreetMap contributors (ODbL).
        </Text>
        <Button
          label="View routing source & report a map issue"
          variant="quiet"
          onPress={() =>
            void Linking.openURL(
              "https://routing.openstreetmap.de/about.html",
            ).catch(() => setError("Could not open the routing source."))
          }
        />
      </ScrollView>
    </Backdrop>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: space.lg, gap: space.md },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700", lineHeight: 30 },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: space.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginVertical: space.md,
  },
  map: {
    height: 340,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.navy,
  },
});
