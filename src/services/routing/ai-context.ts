import type { RoutePlan } from "./types";
import { plannedDuration } from "./walking";
export type TrekChatContext = {
  destination: string;
  origin: string;
  provider: string;
  distanceM: number;
  durationS: number;
  ascentM: number | null;
  date: string;
  startTime: string;
  remainingM: number | null;
  eta: string | null;
  weatherAvailable: boolean;
  sunset: string | null;
  weather?: {
    source: "Open-Meteo";
    date: string;
    fetchedAt: string;
    sunset: string;
    sunrise: string;
    temperatureMin: number;
    temperatureMax: number;
    rainChanceMax: number;
    windMax: number;
    scope: "destination whole-day";
  };
};
export function trekChatContext(
  plan: RoutePlan,
  remainingM: number | null = null,
  eta: string | null = null,
): TrekChatContext {
  const forecast = plan.weather?.date === plan.date ? plan.weather : null;
  const weather = forecast
    ? {
        source: "Open-Meteo" as const,
        date: forecast.date,
        fetchedAt: forecast.fetchedAt,
        sunset: forecast.sunset,
        sunrise: forecast.sunrise,
        temperatureMin: Math.min(...forecast.hours.map((h) => h.temperature)),
        temperatureMax: Math.max(...forecast.hours.map((h) => h.temperature)),
        rainChanceMax: Math.max(...forecast.hours.map((h) => h.rainChance)),
        windMax: Math.max(...forecast.hours.map((h) => h.wind)),
        scope: "destination whole-day" as const,
      }
    : undefined;
  return {
    destination: plan.destination.name.slice(0, 200),
    origin: plan.origin.name.slice(0, 200),
    provider: plan.route.provider,
    distanceM: plan.route.distanceM,
    durationS: plannedDuration(plan.route, plan.pace),
    ascentM: plan.route.ascentM,
    date: plan.date,
    startTime: plan.time,
    remainingM,
    eta,
    weatherAvailable: !!weather,
    sunset: weather?.sunset ?? null,
    ...(weather ? { weather } : {}),
  };
}
