import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Text } from "@/components/Typography";
import { Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { useCloud } from "@/context/CloudContext";
import { useNavo } from "@/context/NavoContext";
import { requestId } from "@/lib/api";
import type { RoutePlan } from "@/services/routing/types";
import { plannedDuration } from "@/services/routing/walking";
import { colors } from "@/theme/tokens";
export function RouteCrew({ plan }: { plan: RoutePlan }) {
  const cloud = useCloud(),
    { isSignedIn } = useNavo();
  const [people, setPeople] = useState("2"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const id = useRef(requestId()),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function create() {
    if (lock.current || !cloud.ready) return;
    const hours = plannedDuration(plan.route, plan.pace) / 3600;
    if (!/^\d+$/.test(people) || Number(people) < 1 || Number(people) > 50) {
      setError("Choose 1 to 50 people, including yourself.");
      return;
    }
    if (hours <= 0 || hours > 16) {
      setError("Choose a walking stage under 16 hours for a day-hike group.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await cloud.api<{ id: string }>("/groups", {
        name: `${plan.name} crew`.slice(0, 60),
        trekId: "custom-hike",
        startDate: plan.date,
        requestId: id.current,
        outing: {
          destination: plan.destination.name.slice(0, 60),
          meetingPoint: plan.origin.fullName.slice(0, 200),
          startTime: plan.time,
          expectedPeople: Number(people),
          walkingHours: Math.max(0.01, Math.round(hours * 100) / 100),
        },
      });
      if (alive.current)
        router.push({ pathname: "/group/[id]", params: { id: result.id } });
    } catch {
      if (alive.current)
        setError(
          "Could not create your group. Check your account connection and retry.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Card>
      <SectionTitle title="Bring your crew" />
      <Text
        style={{
          color: colors.muted,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 16,
        }}
      >
        Share this destination, meeting place and departure time with your
        group. Members join only after accepting an invitation or an approved
        request.
      </Text>
      <Field
        label="Expected people, including you"
        value={people}
        onChangeText={setPeople}
        keyboardType="number-pad"
        maxLength={2}
        editable={!busy}
      />
      <Notice message={error} />
      {!isSignedIn ? (
        <Button
          label="Sign in to invite your crew"
          variant="outline"
          onPress={() => router.push("/login")}
        />
      ) : (
        <>
          <Notice
            tone="info"
            message={
              cloud.ready
                ? ""
                : "Shared groups are unavailable on this connection. You can still save and follow your personal plan."
            }
          />
          <Button
            label="Create group & invite people"
            variant="outline"
            busy={busy}
            disabled={busy || !cloud.ready}
            onPress={() => void create()}
          />
        </>
      )}
    </Card>
  );
}
