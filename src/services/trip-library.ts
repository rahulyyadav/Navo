export type Expense = { id: string; label: string; paisa: number };
export type PersonalTrip = { id: string; name: string; date: string; time: string; people: number; meeting: string; origin: string; walkingHours: number; approachMinutes: number | null; returnNotes: string; stayNotes: string; budgetPaisa: number; expenses: Expense[]; updatedAt: string };
export type HikeRecord = { id: string; name: string; finishedAt: string; distanceM: number; activeSeconds: number; samples: number };
export type TripLibrary = { version: 1; savedTrekIds: string[]; trips: PersonalTrip[]; activities: HikeRecord[] };
export const emptyLibrary = (): TripLibrary => ({ version: 1, savedTrekIds: [], trips: [], activities: [] });
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const number = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const money = (v: unknown) => number(v, 0, 10000000000) && Number.isSafeInteger(v);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const iso = (v: unknown) => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
export function decodeLibrary(value: unknown): TripLibrary {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.savedTrekIds) || value.savedTrekIds.length > 200 || !value.savedTrekIds.every(v => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v)) || !Array.isArray(value.trips) || value.trips.length > 100 || !Array.isArray(value.activities) || value.activities.length > 200) throw new Error('Saved trip data could not be read. It has been kept unchanged.');
  for (const trip of value.trips) {
    if (!record(trip) || !text(trip.id, 80) || !text(trip.name, 60) || !text(trip.date, 10) || !text(trip.time, 5) || !number(trip.people, 1, 50) || !Number.isInteger(trip.people) || !text(trip.meeting, 200) || !text(trip.origin, 200) || !number(trip.walkingHours, 0.01, 16) || !(trip.approachMinutes === null || number(trip.approachMinutes, 0, 600)) || !text(trip.returnNotes, 1000) || !text(trip.stayNotes, 1000) || !money(trip.budgetPaisa) || !iso(trip.updatedAt) || !Array.isArray(trip.expenses) || trip.expenses.length > 100 || !trip.expenses.every(e => record(e) && text(e.id, 80) && text(e.label, 100) && money(e.paisa))) throw new Error('Saved trip data could not be read. It has been kept unchanged.');
  }
  for (const item of value.activities) if (!record(item) || !text(item.id, 80) || !text(item.name, 60) || !iso(item.finishedAt) || !number(item.distanceM, 0, 1000000) || !number(item.activeSeconds, 0, 604800) || !number(item.samples, 0, 1000000)) throw new Error('Saved activity data could not be read. It has been kept unchanged.');
  return value as TripLibrary;
}
export function parseNPR(value: string): number | null {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fractional = ''] = value.trim().split('.');
  const paisa = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  return paisa <= 10000000000 ? paisa : null;
}
export function tripBudget(trip: PersonalTrip) {
  const spent = trip.expenses.reduce((sum, expense) => sum + expense.paisa, 0);
  return { spent, remaining: trip.budgetPaisa - spent, perPerson: Math.ceil(spent / trip.people) };
}
export function npr(paisa: number) { return 'NPR ' + (paisa / 100).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
