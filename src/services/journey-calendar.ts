/** Date-only calendar arithmetic uses UTC so DST and the device timezone cannot move a day. */
function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export function monthCells(month: string): (string | null)[] {
  const first = parseDay(`${month}-01`);
  if (!first) return [];
  const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: Math.ceil((offset + last.getUTCDate()) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= last.getUTCDate() ? `${month}-${String(day).padStart(2, '0')}` : null;
  });
}
export function moveMonth(month: string, offset: number) {
  const date = parseDay(`${month}-01`);
  if (!date || !Number.isInteger(offset)) return month;
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 7) : month;
}
export function addCalendarDays(value: string, days: number) {
  const date = parseDay(value);
  if (!date || !Number.isInteger(days)) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 10) : value;
}
