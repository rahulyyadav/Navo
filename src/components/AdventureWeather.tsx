import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { Text } from "@/components/Typography";
import { Button, Card, Notice, SectionTitle } from "@/components/ui";
import { fetchHourly, type HourlyForecast } from "@/services/weather/hourly";
import type { Coordinate } from "@/services/places/types";
import { colors, space } from "@/theme/tokens";
export function AdventureWeather({
  origin,
  destination,
  date,
  time,
  durationS,
  onForecast,
}: {
  origin: Coordinate;
  destination: Coordinate;
  date: string;
  time: string;
  durationS: number;
  onForecast?: (value: HourlyForecast) => void;
}) {
  const [value, setValue] = useState<{
      start: HourlyForecast;
      end: HourlyForecast;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function load() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const [start, end] = await Promise.all([
        fetchHourly(origin, date, controller.signal),
        fetchHourly(destination, date, controller.signal),
      ]);
      if (!controller.signal.aborted) {
        setValue({ start, end });
        onForecast?.(end);
      }
    } catch (f) {
      if (!controller.signal.aborted)
        setError(f instanceof Error ? f.message : "Could not fetch weather.");
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const finish = new Date(
    Date.parse(`${date}T${time}:00+05:45`) + durationS * 1000,
  );
  const afterSunset = value
    ? finish.getTime() > Date.parse(`${value.end.sunset}:00+05:45`)
    : false;
  const beforeSunrise = value
    ? Date.parse(`${date}T${time}:00+05:45`) <
      Date.parse(`${value.start.sunrise}:00+05:45`)
    : false;
  const hours =
    value?.end.hours.filter(
      (h) =>
        h.time >= `${date}T${time.slice(0, 2)}:00` &&
        Date.parse(`${h.time}:00+05:45`) <= finish.getTime(),
    ) ?? [];
  return (
    <Card>
      <SectionTitle title="Weather for your walk" />
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
        Check your start and destination for {date}. Coordinates go to
        Open-Meteo when you tap below. All times are Nepal time.
      </Text>
      <View style={{ marginTop: space.md }}>
        <Button
          label={value ? "Refresh hourly weather" : "Check hourly weather"}
          variant="outline"
          busy={busy}
          disabled={busy}
          onPress={() => void load()}
        />
      </View>
      <Notice message={error} />
      {value && (
        <>
          <Text style={{ color: colors.ink, fontSize: 16, marginTop: 16 }}>
            Sunrise {value.start.sunrise.slice(11)} · destination sunset{" "}
            {value.end.sunset.slice(11)} NPT
          </Text>
          <Text
            style={{ color: colors.muted, fontSize: 14, marginVertical: 8 }}
          >
            Fetched {new Date(value.end.fetchedAt).toLocaleString()}. Point
            forecasts can differ from mountain conditions.
          </Text>
          {beforeSunrise && (
            <Notice
              tone="warning"
              message="Your planned start is before sunrise. Consider a daylight departure or review night-walking preparation with your crew."
            />
          )}
          {afterSunset && (
            <Notice
              tone="warning"
              message="Estimated arrival is after sunset. Consider starting earlier or shortening this stage."
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {hours.map((h) => (
                <View
                  key={h.time}
                  style={{ minWidth: 120, paddingVertical: 12 }}
                >
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>
                    {h.time.slice(11)} NPT
                  </Text>
                  <Text style={{ color: colors.ink, marginTop: 8 }}>
                    {h.temperature.toFixed(1)}°C
                  </Text>
                  <Text style={{ color: colors.muted, lineHeight: 22 }}>
                    Rain {h.rainChance}%{"\n"}Wind {h.wind} km/h{"\n"}Humidity{" "}
                    {h.humidity}%{"\n"}Visibility{" "}
                    {(h.visibility / 1000).toFixed(1)} km
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          {hours.some((h) => h.rainChance >= 60) && (
            <Notice
              tone="warning"
              message="Rain is likely in part of your walking window. Review shelter, surface conditions and whether to postpone."
            />
          )}
          {hours.some((h) => h.code >= 95) && (
            <Notice
              tone="warning"
              message="The forecast includes thunderstorm conditions. Review official warnings and reconsider exposed terrain."
            />
          )}
        </>
      )}
      <Button
        label="Open-Meteo · CC BY 4.0"
        variant="quiet"
        onPress={() =>
          void Linking.openURL("https://open-meteo.com/").catch(() =>
            setError("Could not open the weather source."),
          )
        }
      />
    </Card>
  );
}
