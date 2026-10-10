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
    if (d?.time?.[0] !== date || result.timezone !== 'Asia/Kathmandu' || !new RegExp('^' + date + 'T([01]\\d|2[0-3]):[0-5]\\d$').test(d.sunset[0]) || values[0] > values[1] || values[2] < 0 || values[2] > 100 || values[3] < 0 || values[4] < 0) throw new Error('The forecast date or values could not be verified. Please retry or check DHM.');
    return { min: values[0], max: values[1], rainChance: values[2], rainMm: values[3], wind: values[4], sunset: d.sunset[0], fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Forecast request timed out. Please retry when connected.');
    throw error;
  } finally { clearTimeout(timer); }
}

export function validateHikeDetails(name: string, place: string, date: string, time: string, people: string): string | null {
  if (name.trim().length < 2 || name.trim().length > 60) return 'Use a hike name between 2 and 60 characters.';
  if (place.trim().length < 2 || place.trim().length > 200) return 'Add a confirmed meeting place between 2 and 200 characters.';
  if (!validHikeDate(date)) return 'Choose today or a future date in YYYY-MM-DD format.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Enter departure time as HH:MM in Nepal time.';
  if (!/^\d+$/.test(people) || Number(people) < 1 || Number(people) > 50) return 'Choose between 1 and 50 people, including yourself.';
  return null;
}
export function validateWalkHours(hours: string): string | null {
  return !hours.trim() || !Number.isFinite(Number(hours)) || Number(hours) <= 0 || Number(hours) > 16
    ? 'Allow more than 0 and up to 16 hours for walking, breaks and return to the trailhead.' : null;
}

export function nepalDateTime(now = new Date()) {
  const nepal = new Date(now.getTime() + 345 * 60000).toISOString();
  return { date: nepal.slice(0, 10), time: nepal.slice(11, 16) };
}
/** Suggest a departure 15 minutes ahead, including Nepal midnight rollover. */
export function suggestedDeparture(now = new Date()) {
  return nepalDateTime(new Date(now.getTime() + 15 * 60000));
}
