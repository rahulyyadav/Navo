import { nepalToday, validHikeDate } from "../day-hike";
import { isCoordinate, type Coordinate } from "../places/types";
export type HourWeather = {
  time: string;
  temperature: number;
  rainChance: number;
  wind: number;
  humidity: number;
  visibility: number;
  code: number;
};
export type HourlyForecast = {
  date: string;
  hours: HourWeather[];
  sunrise: string;
  sunset: string;
  fetchedAt: string;
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function decodeHourly(value: unknown, date: string): HourlyForecast {
  if (
    !object(value) ||
    value.timezone !== "Asia/Kathmandu" ||
    !object(value.hourly) ||
    !object(value.daily)
  )
    throw new Error("The hourly forecast is incomplete.");
  const h = value.hourly,
    d = value.daily;
  const times = h.time,
    variables = [
      "temperature_2m",
      "precipitation_probability",
      "wind_speed_10m",
      "relative_humidity_2m",
      "visibility",
      "weather_code",
    ];
  if (
    !Array.isArray(times) ||
    times.length !== 24 ||
    variables.some(
      (k) => !Array.isArray(h[k]) || (h[k] as unknown[]).length !== 24,
    )
  )
    throw new Error("The hourly forecast is incomplete.");
  const hours = times.map((time, i) => {
    if (time !== `${date}T${String(i).padStart(2, "0")}:00`)
      throw new Error("The forecast time could not be verified.");
    const v = variables.map((k) => (h[k] as unknown[])[i]);
    if (!v.every((n) => typeof n === "number" && Number.isFinite(n)))
      throw new Error("The forecast has missing values.");
    const [temperature, rainChance, wind, humidity, visibility, code] =
      v as number[];
    if (
      temperature < -100 ||
      temperature > 65 ||
      rainChance < 0 ||
      rainChance > 100 ||
      wind < 0 ||
      humidity < 0 ||
      humidity > 100 ||
      visibility < 0 ||
      !Number.isInteger(code) ||
      code < 0 ||
      code > 99
    )
      throw new Error("The forecast has invalid values.");
    return { time, temperature, rainChance, wind, humidity, visibility, code };
  });
  const sunrise = Array.isArray(d.sunrise) ? d.sunrise[0] : null,
    sunset = Array.isArray(d.sunset) ? d.sunset[0] : null;
  if (
    !Array.isArray(d.time) ||
    d.time[0] !== date ||
    typeof sunrise !== "string" ||
    typeof sunset !== "string" ||
    ![sunrise, sunset].every((t) =>
      new RegExp(`^${date}T([01]\\d|2[0-3]):[0-5]\\d$`).test(t),
    )
  )
    throw new Error("Sunrise or sunset could not be verified.");
  return { date, hours, sunrise, sunset, fetchedAt: new Date().toISOString() };
}
export async function fetchHourly(
  point: Coordinate,
  date: string,
  signal?: AbortSignal,
) {
  if (
    !isCoordinate(point) ||
    !validHikeDate(date) ||
    (Date.parse(date) - Date.parse(nepalToday())) / 86400000 > 15
  )
    throw new Error(
      "Hourly forecasts are available from today through the next 15 days.",
    );
  const params = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    start_date: date,
    end_date: date,
    timezone: "Asia/Kathmandu",
    hourly:
      "temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m,visibility,weather_code",
    daily: "sunrise,sunset",
  });
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: controller.signal,
    });
    if (!r.ok)
      throw new Error(
        "Weather is unavailable. Check official warnings and retry.",
      );
    return decodeHourly(await r.json(), date);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      error instanceof Error &&
      !["AbortError", "TypeError", "SyntaxError"].includes(error.name)
        ? error.message
        : "Weather request failed or timed out. Please retry.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
