import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Typography";
import {
  Backdrop,
  Button,
  Card,
  Heading,
  Notice,
  SectionTitle,
} from "@/components/ui";
import { useNavo } from "@/context/NavoContext";
import { usePageLayout } from "@/hooks/usePageLayout";
import {
  changeAdventures,
  readAdventures,
  type Adventures,
} from "@/lib/adventure-store";
import { shareGPX } from "@/lib/gpx-files";
import { exportGPX } from "@/services/routes/gpx";
import { recordedSegments } from "@/services/routing/recorded-path";
import { clearNavigationDraft } from "@/lib/navigation-draft";
import { NepalMap } from "@/components/NepalMap";
import { routeDuration } from "@/services/routing/walking";
import { colors, space } from "@/theme/tokens";
export default function AdventuresScreen() {
  const { userId } = useNavo();
  return <AdventureLibrary key={userId} uid={userId ?? ""} />;
}
function AdventureLibrary({ uid }: { uid: string }) {
  const { page } = usePageLayout();
  const [data, setData] = useState<Adventures | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState<{
      kind: "plans" | "history" | "savedPlaces";
      id: string;
    } | null>(null),
    [expanded, setExpanded] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      void attempt;
      let alive = true;
      void readAdventures(uid)
        .then((v) => {
          if (alive) {
            setData(v);
            setError("");
          }
        })
        .catch(() => {
          if (alive)
            setError(
              "Could not read your adventures. Existing data is unchanged.",
            );
        });
      return () => {
        alive = false;
      };
    }, [uid, attempt]),
  );
  async function exportHistory(id: string) {
    const h = data?.history.find((v) => v.id === id);
    if (!h) return;
    const segments = recordedSegments(h.path);
    if (!segments.length) {
      setError("This hike has no continuous path to export.");
      return;
    }
    setBusy(true);
    try {
      await shareGPX(
        exportGPX({
          version: 1,
          id: h.id,
          name: h.name,
          importedAt: h.endedAt,
          source: "user-gpx",
          verified: false,
          segments,
        }),
      );
    } catch {
      setError("Could not export this hike.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Backdrop>
      <ScrollView contentContainerStyle={[styles.page, page]}>
        <Heading
          title="Your walking adventures"
          subtitle="Saved routes and measured hikes, private to this account on this device."
        />
        <Notice message={error} />
        {Boolean(error) && (
          <Button
            label="Retry adventures"
            onPress={() => setAttempt((v) => v + 1)}
          />
        )}
        <Button
          label="Plan another destination"
          onPress={() => router.push("/trek-plan")}
        />
        {remove && (
          <Card>
            <Text style={styles.copy}>
              Remove this saved item from this account on this device? Other
              saved trips are kept.
            </Text>
            <Button
              label="Remove saved item"
              variant="danger"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                const chosen = remove;
                void changeAdventures(uid, (v) => ({
                  ...v,
                  [chosen.kind]: v[chosen.kind].filter(
                    (p) => p.id !== chosen.id,
                  ),
                }))
                  .then(async (next) => {
                    if (chosen.kind === "plans")
                      await clearNavigationDraft(uid, chosen.id);
                    setData(next);
                    setRemove(null);
                  })
                  .catch(() => setError("Could not remove the saved item."))
                  .finally(() => setBusy(false));
              }}
            />
            <Button
              label="Keep saved item"
              variant="quiet"
              onPress={() => setRemove(null)}
            />
          </Card>
        )}
        <SectionTitle title="Saved walking plans" />
        {data?.plans.map((plan) => (
          <Card key={plan.id}>
            <Text style={styles.title}>{plan.name}</Text>
            <Text style={styles.copy}>
              {plan.date} · {plan.time} NPT ·{" "}
              {(plan.route.distanceM / 1000).toFixed(2)} km ·{" "}
              {routeDuration(plan.route.durationS)} provider estimate
            </Text>
            <Button
              label="Open route & start"
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: "/navigate",
                  params: { plan: plan.id },
                })
              }
            />
            <Button
              label="Remove walking plan"
              variant="quiet"
              onPress={() => setRemove({ kind: "plans", id: plan.id })}
            />
          </Card>
        ))}
        {data && !data.plans.length && (
          <Text style={styles.copy}>
            No walking plans yet. Search a place to build your first route.
          </Text>
        )}
        <SectionTitle title="Hike history" />
        {data?.history.map((h) => (
          <Card key={h.id}>
            <Text style={styles.title}>{h.name}</Text>
            <Text style={styles.copy}>
              {new Date(h.endedAt).toLocaleDateString()} ·{" "}
              {(h.distanceM / 1000).toFixed(2)} km measured ·{" "}
              {routeDuration(h.activeSeconds)}
              {h.highestM === null
                ? ""
                : ` · highest GPS altitude ${Math.round(h.highestM)} m`}
            </Text>
            <Text style={styles.copy}>
              Start {new Date(h.startedAt).toLocaleString()}
              {"\n"}Finish {new Date(h.endedAt).toLocaleString()}
              {"\n"}
              {h.path.length
                ? `${h.path.length} local path points`
                : "Totals saved without raw GPS history"}
            </Text>
            <Button
              label={
                expanded === h.id ? "Hide route details" : "View route details"
              }
              variant="outline"
              onPress={() => setExpanded((v) => (v === h.id ? null : h.id))}
            />
            {expanded === h.id && (
              <>
                <Text style={styles.copy}>
                  Planned route: {h.plan.origin.name} →{" "}
                  {h.plan.destination.name}. GPS elevation gain is unavailable.
                </Text>
                <View
                  style={{ height: 260, overflow: "hidden", borderRadius: 20 }}
                >
                  <NepalMap
                    region={{
                      latitude:
                        (h.plan.route.snappedStart.latitude +
                          h.plan.route.snappedEnd.latitude) /
                        2,
                      longitude:
                        (h.plan.route.snappedStart.longitude +
                          h.plan.route.snappedEnd.longitude) /
                        2,
                      latitudeDelta: Math.max(
                        0.02,
                        Math.abs(
                          h.plan.route.snappedStart.latitude -
                            h.plan.route.snappedEnd.latitude,
                        ) * 1.5,
                      ),
                      longitudeDelta: Math.max(
                        0.02,
                        Math.abs(
                          h.plan.route.snappedStart.longitude -
                            h.plan.route.snappedEnd.longitude,
                        ) * 1.5,
                      ),
                    }}
                    regionNonce={0}
                    selectedId={null}
                    onSelectTrek={() => undefined}
                    myCoords={null}
                    walkingRoutes={[
                      { id: h.plan.route.id, geometry: h.plan.route.geometry },
                    ]}
                    walkingRouteId={h.plan.route.id}
                    endpoints={{
                      start: h.plan.route.snappedStart,
                      end: h.plan.route.snappedEnd,
                    }}
                  />
                </View>
                {recordedSegments(h.path).length > 0 && (
                  <Button
                    label="Export recorded GPX"
                    variant="outline"
                    disabled={busy}
                    onPress={() => void exportHistory(h.id)}
                  />
                )}
              </>
            )}
            <Button
              label="Remove saved hike"
              variant="quiet"
              onPress={() => setRemove({ kind: "history", id: h.id })}
            />
          </Card>
        ))}
        {data && !data.history.length && (
          <Text style={styles.copy}>
            Saved navigation sessions will appear here after you finish a hike.
          </Text>
        )}
        <SectionTitle title="Saved places" />
        {data?.savedPlaces.map((p) => (
          <Button
            key={p.id}
            label={p.fullName}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/trek-plan",
                params: { destination: JSON.stringify(p) },
              })
            }
          />
        ))}
        {!!data?.recent.length && (
          <>
            <SectionTitle title="Recent searches" />
            {data.recent.map((p) => (
              <Button
                key={p.id}
                label={p.fullName}
                variant="quiet"
                onPress={() =>
                  router.push({
                    pathname: "/trek-plan",
                    params: { destination: JSON.stringify(p) },
                  })
                }
              />
            ))}
            <Button
              label="Clear recent searches"
              variant="outline"
              busy={busy}
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void changeAdventures(uid, (v) => ({ ...v, recent: [] }))
                  .then(setData)
                  .catch(() => setError("Could not clear recent searches."))
                  .finally(() => setBusy(false));
              }}
            />
          </>
        )}
        <Button
          label="Privacy & clear local data"
          variant="quiet"
          onPress={() => router.push("/privacy")}
        />
      </ScrollView>
    </Backdrop>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: space.lg, gap: space.md },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: space.sm,
  },
});
