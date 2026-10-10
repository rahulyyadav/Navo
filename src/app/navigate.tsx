import { openLocationSettings } from "@/lib/location-settings";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import {
  usePreventRemove,
  type NavigationAction,
} from "expo-router/react-navigation";
import { useNetworkState } from "expo-network";
import { RouteSketch } from "@/components/trekking/RouteSketch";
import * as Crypto from "expo-crypto";
import { Text } from "@/components/Typography";
import {
  Backdrop,
  Badge,
  Button,
  Card,
  Chip,
  Heading,
  Notice,
  SectionTitle,
} from "@/components/ui";
import { TrekLocationSession } from "@/components/TrekLocationSession";
import { useCloud } from "@/context/CloudContext";
import { RouteAssistant } from "@/components/RouteAssistant";
import { trekChatContext } from "@/services/routing/ai-context";
import { NepalMap } from "@/components/NepalMap";
import { useNavo } from "@/context/NavoContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useTrekLocation } from "@/hooks/useTrekLocation";
import {
  changeAdventures,
  readAdventures,
  type NavigationHistory,
} from "@/lib/adventure-store";
import {
  readNavigationDraft,
  saveNavigationDraft,
  clearNavigationDraft,
  type NavigationDraft,
} from "@/lib/navigation-draft";
import { exportGPX } from "@/services/routes/gpx";
import { shareGPX } from "@/lib/gpx-files";
import type { RoutePlan } from "@/services/routing/types";
import type { Fix } from "@/services/trekking/navigation";
import {
  navigationProgress,
  sustainedDeviation,
} from "@/services/routing/progress";
import {
  calculateWalkingRoutes,
  plannedDuration,
  routeDuration,
} from "@/services/routing/walking";
import { recordedSegments } from "@/services/routing/recorded-path";
import { emptyTrack, recordFix, activeTime } from "@/services/hike-recording";
import { nepalDateTime } from "@/services/day-hike";
import { colors, radius, space } from "@/theme/tokens";

export default function NavigationScreen() {
  const { userId } = useNavo();
  const { plan: id } = useLocalSearchParams<{ plan?: string }>();
  return (
    <LoadNavigation
      key={`${userId}:${id}`}
      uid={userId ?? ""}
      id={typeof id === "string" ? id : ""}
    />
  );
}
function LoadNavigation({ uid, id }: { uid: string; id: string }) {
  const [plan, setPlan] = useState<RoutePlan | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [draft, setDraft] = useState<NavigationDraft | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([readAdventures(uid), readNavigationDraft(uid, id)])
      .then(([v, draft]) => {
        if (alive) {
          const selected = v.plans.find((p) => p.id === id);
          if (selected) {
            setDraft(draft);
            setPlan(draft?.history.plan ?? selected);
          } else
            setError(
              "This route plan is no longer on this device. Open the planner to calculate it again.",
            );
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Could not read this route plan. Retry when device storage is available.",
          );
      });
    return () => {
      alive = false;
    };
  }, [uid, id, attempt]);
  if (!plan)
    return (
      <Backdrop>
        <View style={{ padding: space.lg, gap: space.md }}>
          <Heading title="Opening your walking plan" />
          <Notice message={error} />
          {Boolean(error) && (
            <Button
              label="Retry saved plan"
              onPress={() => {
                setError("");
                setAttempt((v) => v + 1);
              }}
            />
          )}
        </View>
      </Backdrop>
    );
  return <LiveNavigation uid={uid} initial={plan} draft={draft} />;
}
function LiveNavigation({
  uid,
  initial,
  draft,
}: {
  uid: string;
  initial: RoutePlan;
  draft: NavigationDraft | null;
}) {
  const { email } = useNavo();
  const cloud = useCloud();
  const [sharingCrew, setSharingCrew] = useState("");
  const network = useNetworkState();
  const offline =
    network.isConnected === false || network.isInternetReachable === false;
  const [sketch, setSketch] = useState(false);
  const { page } = usePageLayout();
  const navigation = useNavigation();
  const leaveAction = useRef<NavigationAction | null>(null);
  const [plan, setPlan] = useState(initial),
    [phase, setPhase] = useState<"ready" | "active" | "paused" | "ended">(
      draft?.phase === "ended" ? "ended" : draft ? "paused" : "ready",
    ),
    [pathEnabled, setPathEnabled] = useState(draft?.pathEnabled ?? false),
    [follow, setFollow] = useState(true),
    [seconds, setSeconds] = useState(draft?.history.activeSeconds ?? 0),
    [offRoute, setOffRoute] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [endConfirm, setEndConfirm] = useState(false),
    [summary, setSummary] = useState<NavigationHistory | null>(
      draft?.phase === "ended" ? draft.history : null,
    ),
    [requestAfter, setRequestAfter] = useState(0),
    [clock, setClock] = useState(() => Date.now()),
    [mapNonce, setMapNonce] = useState(0),
    [leavePrompt, setLeavePrompt] = useState(false);
  const started = useRef<string | null>(draft?.history.startedAt ?? null),
    track = useRef({
      ...emptyTrack(),
      distanceM: draft?.history.distanceM ?? 0,
      samples: draft?.samples ?? 0,
    }),
    path = useRef<NavigationHistory["path"]>(draft?.history.path ?? []),
    highest = useRef<number | null>(draft?.history.highestM ?? null),
    since = useRef<number | null>(null),
    lastFix = useRef<Fix | null>(null),
    alive = useRef(true),
    saveLock = useRef(false),
    pending = useRef<AbortController | null>(null),
    requestStart = useRef(0),
    segment = useRef(
      Math.max(0, ...(draft?.history.path ?? []).map((p) => p.segment ?? 0)),
    ),
    elapsed = useRef(draft?.history.activeSeconds ?? 0),
    currentPlan = useRef(initial);
  const [measured, setMeasured] = useState({
    distanceM: draft?.history.distanceM ?? 0,
    samples: draft?.samples ?? 0,
    highestM: draft?.history.highestM ?? null,
  });
  const receive = useCallback(
    (fix: Fix) => {
      if (
        phase !== "active" ||
        fix.timestamp < requestStart.current ||
        fix.accuracy === null
      )
        return;
      lastFix.current = fix;
      if (
        track.current.last &&
        fix.timestamp - track.current.last.timestamp > 60000
      )
        segment.current++;
      const next = recordFix(track.current, { ...fix, accuracy: fix.accuracy });
      if (!next.last && track.current.last) segment.current++;
      const accepted = next.samples > track.current.samples;
      track.current = next;
      if (
        accepted &&
        fix.altitude !== null &&
        fix.altitudeAccuracy !== null &&
        fix.altitudeAccuracy >= 0 &&
        fix.altitudeAccuracy <= 20 &&
        Number.isFinite(fix.altitude)
      )
        highest.current =
          highest.current === null
            ? fix.altitude
            : Math.max(highest.current, fix.altitude);
      if (accepted && pathEnabled && path.current.length < 10000)
        path.current.push({
          latitude: fix.latitude,
          longitude: fix.longitude,
          timestamp: fix.timestamp,
          segment: segment.current,
          elevation:
            fix.altitudeAccuracy !== null && fix.altitudeAccuracy <= 20
              ? fix.altitude
              : null,
        });
      setMeasured({
        distanceM: next.distanceM,
        samples: next.samples,
        highestM: highest.current,
      });
      const progress = navigationProgress(plan.route, fix, true),
        deviation = sustainedDeviation(
          fix,
          progress?.crossTrack ?? null,
          true,
          Date.now(),
          since.current,
        );
      since.current = deviation.since;
      setOffRoute(deviation.offRoute);
    },
    [plan.route, pathEnabled, phase],
  );
  usePreventRemove(phase !== "ready" && !saved, ({ data }) => {
    leaveAction.current = data.action;
    setLeavePrompt(true);
  });
  const location = useTrekLocation(phase === "active", receive);
  useEffect(() => {
    if (location.stale || location.state !== "tracking") since.current = null;
  }, [location.stale, location.state]);
  const checkpoint = useCallback(() => {
    if (!started.current || saved || phase === "ended") return;
    const history: NavigationHistory = {
      id: initial.id,
      name: currentPlan.current.name,
      startedAt: started.current,
      endedAt: new Date().toISOString(),
      distanceM: track.current.distanceM,
      activeSeconds: elapsed.current,
      highestM: highest.current,
      path: pathEnabled ? [...path.current] : [],
      plan: currentPlan.current,
    };
    void saveNavigationDraft(uid, initial.id, {
      version: 1,
      history,
      pathEnabled,
      samples: track.current.samples,
    }).catch(() => {
      if (alive.current)
        setError(
          "Your session checkpoint could not be saved. Finish and save your hike before leaving.",
        );
    });
  }, [initial.id, pathEnabled, uid, phase, saved]);
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        checkpoint();
        setPhase((p) => (p === "active" ? "paused" : p));
        track.current = { ...track.current, last: null };
      }
    });
    return () => {
      alive.current = false;
      sub.remove();
      pending.current?.abort();
    };
  }, [checkpoint]);
  useFocusEffect(
    useCallback(
      () => () => {
        setPhase((p) => (p === "active" ? "paused" : p));
        track.current = { ...track.current, last: null };
      },
      [],
    ),
  );
  useEffect(() => {
    if (phase !== "active") return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      setSeconds((v) => v + Math.min(2, (now - last) / 1000));
      elapsed.current += Math.min(2, (now - last) / 1000);
      last = now;
      setClock(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== "active") return;
    const timer = setInterval(() => checkpoint(), 30000);
    return () => clearInterval(timer);
  }, [phase, checkpoint]);
  const fresh =
    phase === "active" &&
    !location.stale &&
    location.state === "tracking" &&
    !!location.fix &&
    location.fix.timestamp >= requestAfter;
  const progress = useMemo(
    () => navigationProgress(plan.route, location.fix, fresh),
    [plan.route, location.fix, fresh],
  );
  const remainingS = progress?.matched
    ? plannedDuration(plan.route, plan.pace) * (1 - (progress.ratio ?? 0))
    : null;
  const eta =
    remainingS === null
      ? "Unavailable"
      : new Date(clock + remainingS * 1000 + 345 * 60000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ") + " NPT";
  const sketchSegments = useMemo(() => [plan.route.geometry], [plan.route]);
  const mapRoutes = useMemo(
    () => [{ id: plan.route.id, geometry: plan.route.geometry }],
    [plan.route],
  );
  const mapEndpoints = useMemo(
    () => ({ start: plan.route.snappedStart, end: plan.route.snappedEnd }),
    [plan.route],
  );
  const mapRegion = useMemo(() => {
    const p = plan.route.geometry,
      lat = p.map((v) => v.latitude),
      lon = p.map((v) => v.longitude),
      minLat = Math.min(...lat),
      maxLat = Math.max(...lat),
      minLon = Math.min(...lon),
      maxLon = Math.max(...lon);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.008, (maxLat - minLat) * 1.2),
      longitudeDelta: Math.max(0.008, (maxLon - minLon) * 1.2),
    };
  }, [plan.route]);
  function start() {
    if (!started.current) {
      const now = new Date();
      started.current = now.toISOString();
      const npt = nepalDateTime(now);
      const livePlan = {
        ...plan,
        date: npt.date,
        time: npt.time,
        weather: plan.weather?.date === npt.date ? plan.weather : null,
      };
      currentPlan.current = livePlan;
      setPlan(livePlan);
    }
    segment.current++;
    requestStart.current = Date.now();
    setRequestAfter(requestStart.current);
    setClock(requestStart.current);
    track.current = { ...track.current, last: null };
    since.current = null;
    setOffRoute(false);
    setPhase("active");
  }
  function finish() {
    pending.current?.abort();
    setPhase("ended");
    setEndConfirm(false);
    const history: NavigationHistory = {
      id: Crypto.randomUUID(),
      name: plan.name,
      startedAt: started.current ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      distanceM: track.current.distanceM,
      activeSeconds: elapsed.current,
      highestM: highest.current,
      path: pathEnabled ? [...path.current] : [],
      plan,
    };
    setSummary(history);
    void saveNavigationDraft(uid, initial.id, {
      version: 1,
      phase: "ended",
      history,
      pathEnabled,
      samples: track.current.samples,
    }).catch(() => {
      if (alive.current)
        setError(
          "Your summary checkpoint could not be saved. Save this hike before leaving.",
        );
    });
  }
  async function recalculate() {
    const fix = lastFix.current;
    if (
      pending.current ||
      !fix ||
      Date.now() - fix.timestamp > 15000 ||
      fix.accuracy === null ||
      fix.accuracy > 50
    ) {
      setError(
        "Acquire a fresh GPS position with accuracy better than 50 m before recalculating.",
      );
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const routes = await calculateWalkingRoutes(
        fix,
        plan.destination,
        [],
        controller.signal,
      );
      if (alive.current && !controller.signal.aborted) {
        const next = {
          ...plan,
          route: routes[0],
          stops: [],
          origin: { ...plan.origin, ...fix, name: "Recalculated start" },
        };
        currentPlan.current = next;
        setPlan(next);
        setMapNonce((v) => v + 1);
        since.current = null;
        setOffRoute(false);
      }
    } catch (f) {
      if (alive.current && !controller.signal.aborted)
        setError(
          f instanceof Error
            ? f.message
            : "Recalculation failed. Your existing route is retained.",
        );
    } finally {
      pending.current = null;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (!summary || saveLock.current || saved) return;
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      await changeAdventures(uid, (v) => ({
        ...v,
        history: [
          summary,
          ...v.history.filter((h) => h.id !== summary.id),
        ].slice(0, 50),
      }));
      await clearNavigationDraft(uid, initial.id);
      if (alive.current) setSaved(true);
    } catch {
      if (alive.current)
        setError("Could not save this hike. Retry before leaving this screen.");
    } finally {
      saveLock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function exportPath() {
    if (!summary || !recordedSegments(summary.path).length) {
      setError("Not enough continuous GPS points to export a track.");
      return;
    }
    setBusy(true);
    try {
      await shareGPX(
        exportGPX({
          version: 1,
          id: summary.id,
          name: summary.name,
          importedAt: summary.endedAt,
          source: "user-gpx",
          verified: false,
          segments: recordedSegments(summary.path).map((segment) =>
            segment.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
              elevation: p.elevation,
              timestamp: p.timestamp,
            })),
          ),
        }),
      );
    } catch {
      setError("Could not export this track. Please retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Backdrop>
      <ScrollView contentContainerStyle={[styles.page, page]}>
        <Heading
          title={phase === "ended" ? "Your hike summary" : plan.name}
          subtitle={
            phase === "ended"
              ? "Measured totals from this session. Save before leaving."
              : "Follow the planned line. Confirm access and trail conditions locally."
          }
        />
        <Notice message={error} />
        {leavePrompt && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setLeavePrompt(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(13,20,26,.8)",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <Card>
                <Text style={styles.copy}>
                  Finish and save this hike before leaving, or keep this screen
                  open to continue.
                </Text>
                {phase !== "ended" && (
                  <Button
                    label="End & review hike"
                    onPress={() => {
                      setLeavePrompt(false);
                      finish();
                    }}
                  />
                )}
                <Button
                  label="Stay on this screen"
                  variant="quiet"
                  onPress={() => setLeavePrompt(false)}
                />
                {phase === "ended" && (
                  <Button
                    label="Leave without saving"
                    variant="quiet"
                    onPress={() => {
                      setLeavePrompt(false);
                      if (leaveAction.current)
                        navigation.dispatch(leaveAction.current);
                    }}
                  />
                )}
              </Card>
            </View>
          </Modal>
        )}
        <Badge
          label={phase === "active" ? "GPS · FOREGROUND" : phase.toUpperCase()}
          tone="lime"
        />
        {offline && (
          <Notice
            tone="info"
            message="Offline. GPS and the saved route continue in the foreground. New weather and recalculation need a connection."
          />
        )}
        {offline || sketch ? (
          <Card>
            <RouteSketch
              segments={sketchSegments}
              position={fresh ? location.fix : null}
            />
          </Card>
        ) : (
          <View style={styles.map}>
            <NepalMap
              region={mapRegion}
              regionNonce={mapNonce}
              selectedId={null}
              onSelectTrek={() => undefined}
              myCoords={fresh ? location.fix : null}
              followUser={follow && fresh}
              walkingRoutes={mapRoutes}
              walkingRouteId={plan.route.id}
              endpoints={mapEndpoints}
            />
          </View>
        )}
        <Button
          label={sketch ? "Show online map" : "Show offline route overview"}
          variant="quiet"
          onPress={() => setSketch((v) => !v)}
        />
        {plan.route.provider === "user-gpx" && (
          <Notice
            tone="warning"
            message="User-imported GPX line. No verified turns or access information are available. Time estimates assume 4 km/h before terrain and breaks."
          />
        )}
        {phase === "ready" && (
          <Card>
            <Text style={styles.copy}>
              Navo uses foreground GPS to show your position and progress. Keep
              this screen open; locking or backgrounding pauses tracking. No
              internet is needed for GPS calculations after the route is saved.
            </Text>
            <Chip
              label={
                pathEnabled
                  ? "GPS path will be saved locally"
                  : "Save GPS path locally · off"
              }
              selected={pathEnabled}
              onPress={() => setPathEnabled((v) => !v)}
            />
            <Text style={styles.copy}>
              Optional path history stays on this device. With this off, only
              totals are saved.
            </Text>
            <Button label="Start live GPS" onPress={start} />
          </Card>
        )}
        {phase === "active" && (
          <>
            <Card>
              <SectionTitle title="Your progress" />
              <Text style={styles.title}>
                {progress?.remainingM === null ||
                progress?.remainingM === undefined
                  ? "Remaining distance unavailable"
                  : `${(progress.remainingM / 1000).toFixed(2)} km remaining`}
              </Text>
              <Text style={styles.copy}>
                Measured walking {(measured.distanceM / 1000).toFixed(2)} km ·{" "}
                {measured.samples} usable samples
              </Text>
              <Text style={styles.copy}>
                Elapsed {activeTime(seconds)} · estimated arrival {eta}
                {remainingS === null
                  ? ""
                  : ` · ${routeDuration(remainingS)} remaining`}
              </Text>
              <Text style={styles.copy}>
                {fresh
                  ? `GPS ±${Math.round(location.fix?.accuracy ?? 0)} m · fix ${location.age}s ago`
                  : `Waiting for usable GPS · ${location.state}. Progress is paused until a fresh fix is available.`}
              </Text>
              {fresh &&
                location.fix?.altitude !== null &&
                location.fix?.altitudeAccuracy !== null &&
                location.fix &&
                location.fix.altitudeAccuracy <= 20 &&
                Number.isFinite(location.fix.altitude) && (
                  <Text style={styles.copy}>
                    GPS elevation {Math.round(location.fix.altitude!)} m ·
                    approximate
                  </Text>
                )}
              {fresh &&
                location.fix?.heading !== null &&
                location.fix &&
                location.fix.heading >= 0 &&
                location.fix.heading <= 360 && (
                  <Text style={styles.copy}>
                    GPS bearing {Math.round(location.fix.heading)}° · direction
                    while moving
                  </Text>
                )}
              {fresh &&
                location.fix?.speed !== null &&
                location.fix &&
                location.fix.speed >= 0 &&
                location.fix.speed < 4 && (
                  <Text style={styles.copy}>
                    GPS speed {(location.fix.speed * 3.6).toFixed(1)} km/h
                  </Text>
                )}
              {progress?.matched && progress.next && (
                <Text style={styles.title}>{progress.next.text}</Text>
              )}
              {progress?.ratio !== null && progress?.ratio !== undefined && (
                <Text style={styles.copy}>
                  {Math.round(progress.ratio * 100)}% along the planned line
                </Text>
              )}
              {!progress?.matched &&
                fresh &&
                (location.fix?.accuracy ?? 100) > 50 && (
                  <Notice
                    tone="info"
                    message="GPS accuracy is low. Remaining distance and ETA will return with a better fix."
                  />
                )}
              {!progress?.matched &&
                fresh &&
                (location.fix?.accuracy ?? 100) <= 50 && (
                  <Notice
                    tone="warning"
                    message="Your position is away from the planned line or its match is uncertain. Remaining distance and ETA are unavailable."
                  />
                )}
            </Card>
            {offRoute && fresh && (
              <Card>
                <Notice
                  tone="warning"
                  message="You’ve moved away from the planned route for at least 30 seconds."
                />
                <Button
                  label="Recalculate from my position"
                  busy={busy}
                  disabled={busy}
                  onPress={() => void recalculate()}
                />
                <Text style={styles.copy}>
                  Recalculation sends your current position to the walking
                  provider and removes optional stops. Check the new route
                  before following it.
                </Text>
              </Card>
            )}
            {progress?.matched && (progress.remainingM ?? Infinity) < 30 && (
              <Notice
                tone="info"
                message="You are near the routed endpoint. Confirm you have arrived, then end the trek."
              />
            )}
            {["denied", "unavailable", "poor"].includes(location.state) && (
              <Button
                label="Retry GPS"
                variant="outline"
                onPress={location.retry}
              />
            )}
            <Button
              label={follow ? "Explore map freely" : "Recenter on me"}
              variant="outline"
              onPress={() => setFollow((v) => !v)}
            />
            {cloud.ready && cloud.groups.length > 0 && (
              <Card>
                <SectionTitle title="Your crew on this hike" />
                <Text style={styles.copy}>
                  Choose a group to share with. Updates and nearby alerts go
                  only to that group after you turn sharing on.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: space.sm,
                  }}
                >
                  {cloud.groups.map((group) => (
                    <Chip
                      key={group.id}
                      label={group.name}
                      selected={sharingCrew === group.id}
                      onPress={() =>
                        setSharingCrew((v) => (v === group.id ? "" : group.id))
                      }
                    />
                  ))}
                </View>
                {Boolean(sharingCrew) && (
                  <TrekLocationSession
                    key={sharingCrew}
                    groupId={sharingCrew}
                    context="navigation"
                    externalFix={fresh ? location.fix : null}
                  />
                )}
              </Card>
            )}
            <RouteAssistant
              email={email ?? null}
              context={trekChatContext(
                plan,
                progress?.remainingM ?? null,
                remainingS === null ? null : eta,
              )}
            />
            <Button
              label="Pause Trek"
              variant="outline"
              onPress={() => {
                checkpoint();
                setPhase("paused");
                track.current = { ...track.current, last: null };
              }}
            />
          </>
        )}
        {location.state === "denied" && phase === "active" && (
          <Button
            label="Open location settings"
            variant="outline"
            onPress={() =>
              void openLocationSettings().then((message) => {
                if (message) setError(message);
              })
            }
          />
        )}
        {phase === "paused" && (
          <Card>
            <Text style={styles.copy}>
              Tracking is paused. Resume to request a fresh GPS fix. Paused gaps
              are excluded from measured distance.
            </Text>
            <Button label="Resume Trek" onPress={start} />
          </Card>
        )}
        {(phase === "active" || phase === "paused") && (
          <Button
            label="End Trek"
            variant="quiet"
            onPress={() => setEndConfirm(true)}
          />
        )}
        {endConfirm && (
          <Card>
            <Text style={styles.copy}>
              End this session and review your measured summary?
            </Text>
            <Button label="End & review" onPress={finish} />
            <Button
              label="Keep trekking"
              variant="quiet"
              onPress={() => setEndConfirm(false)}
            />
          </Card>
        )}
        {summary && (
          <Card>
            <SectionTitle title="Measured hike" />
            <Text style={styles.title}>
              {(summary.distanceM / 1000).toFixed(2)} km ·{" "}
              {activeTime(summary.activeSeconds)}
            </Text>
            <Text style={styles.copy}>
              Average{" "}
              {summary.activeSeconds > 0
                ? ((summary.distanceM / summary.activeSeconds) * 3.6).toFixed(1)
                : "0"}{" "}
              km/h ·{" "}
              {summary.highestM === null
                ? "Elevation unavailable"
                : `highest usable GPS altitude ${Math.round(summary.highestM)} m`}
            </Text>
            <Text style={styles.copy}>
              Started {new Date(summary.startedAt).toLocaleString()}
              {"\n"}Ended {new Date(summary.endedAt).toLocaleString()}
              {"\n"}
              {summary.path.length
                ? `${summary.path.length} path points saved if you choose Save hike.`
                : "Raw GPS history was not retained."}
            </Text>
            <Button
              label={saved ? "Hike saved" : "Save hike"}
              disabled={saved || busy}
              busy={busy}
              onPress={() => void save()}
            />
            {summary.path.length >= 2 && (
              <Button
                label="Export recorded GPX"
                variant="outline"
                disabled={busy}
                onPress={() => void exportPath()}
              />
            )}
            <Button
              label="Open my hike history"
              variant="quiet"
              onPress={() => router.replace("/adventures")}
            />
            <Button
              label="Return Home"
              variant="quiet"
              onPress={() => router.replace("/(tabs)/discover")}
            />
          </Card>
        )}
        <Text style={styles.copy}>
          Walking route · OpenStreetMap contributors, or your imported GPX
          source. Estimated times exclude unplanned stops. GPS uncertainty can
          prevent a reliable match.
        </Text>
        <Button
          label="Routing source & map corrections"
          variant="quiet"
          onPress={() =>
            void Linking.openURL(
              "https://www.openstreetmap.org/fixthemap",
            ).catch(() => setError("Could not open map corrections."))
          }
        />
      </ScrollView>
    </Backdrop>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: space.lg, gap: space.md },
  map: { height: 350, borderRadius: radius.lg, overflow: "hidden" },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: space.sm,
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700", lineHeight: 30 },
});
