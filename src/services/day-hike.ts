export type DayHike = { id: string; name: string; trailhead: string; latitude?: number; longitude?: number; hours: number; detail: string; source: string };
// Planning starts, not verified trail geometry. Confirm the exact entrance locally.
export const dayHikes: DayHike[] = [
  { id: 'phulchowki', name: 'Phulchowki', trailhead: 'Godawari Botanical Garden, Lalitpur, Nepal', latitude: 27.591, longitude: 85.378, hours: 6, detail: 'Start around Godawari. Confirm the permitted forest route, return plan and access before leaving.', source: 'https://ntb.gov.np/zh-cn/hiking' },
  { id: 'shivapuri', name: 'Shivapuri', trailhead: 'Shivapuri National Park entrance, Budhanilkantha, Nepal', latitude: 27.795, longitude: 85.387, hours: 7, detail: 'Approach via Budhanilkantha. Check entry, guide requirements and gate closing time with the park.', source: 'https://ntb.gov.np/shivapuri-nagarjun-national-park' },
  { id: 'custom', name: 'Choose another hike', trailhead: '', hours: 4, detail: 'Use a confirmed meeting point or park entrance. A place name alone is not a verified hiking route.', source: 'https://ntb.gov.np/zh-cn/hiking' },
];
export function nepalToday(now = new Date()) {
  return new Date(now.getTime() + 345 * 60000).toISOString().slice(0, 10);
}
export function validHikeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value >= nepalToday();
}
export function directionsURL(destination: string, origin: string, mode: 'driving' | 'transit') {
  const query = new URLSearchParams({ api: '1', destination, travelmode: mode });
  if (origin.trim()) query.set('origin', origin.trim());
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
export function finishTime(date: string, start: string, hikingHours: number, approachMinutes: number) {
  if (!validHikeDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !Number.isFinite(hikingHours) || !Number.isFinite(approachMinutes)) return null;
  const time = new Date(`${date}T${start}:00+05:45`).getTime() + (hikingHours * 60 + approachMinutes) * 60000;
  return new Date(time + 345 * 60000).toISOString().slice(0, 16).replace('T', ' ');
}
export type DayWeather = { min: number; max: number; rainChance: number; rainMm: number; wind: number; sunset: string; fetchedAt: string };
export async function fetchDayWeather(latitude: number, longitude: number, date: string): Promise<DayWeather> {
  const days = (Date.parse(date) - Date.parse(nepalToday())) / 86400000;
  if (!validHikeDate(date) || days > 15) throw new Error('Forecasts are available for today and the next 15 days. Check again closer to departure.');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Enter valid trailhead coordinates to check its forecast.');
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), start_date: date, end_date: date, timezone: 'Asia/Kathmandu', daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunset' });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
    if (!response.ok) throw new Error('Forecast service is unavailable. Check DHM and try again.');
    const result = await response.json(); const d = result.daily;
    const values = [d?.temperature_2m_min?.[0], d?.temperature_2m_max?.[0], d?.precipitation_probability_max?.[0], d?.precipitation_sum?.[0], d?.wind_speed_10m_max?.[0]];
    if (!values.every(v => typeof v === 'number' && Number.isFinite(v)) || typeof d?.sunset?.[0] !== 'string') throw new Error('The forecast is incomplete. Check official warnings before leaving.');
    return { min: values[0], max: values[1], rainChance: values[2], rainMm: values[3], wind: values[4], sunset: d.sunset[0], fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Forecast request timed out. Please retry when connected.');
    throw error;
  } finally { clearTimeout(timer); }
}
