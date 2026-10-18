/** Validate the fields rendered by the offline screen before trusting device storage. */
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string';
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const coordinate = (value: unknown) => object(value) && number(value.latitude) && Math.abs(value.latitude) <= 90 && number(value.longitude) && Math.abs(value.longitude) <= 180;
export function validOfflinePack(value: unknown, trekId: string): boolean {
  if (!object(value) || value.version !== 1 || value.trekId !== trekId || !text(value.trekName) || !text(value.savedAt) || !Number.isFinite(Date.parse(value.savedAt as string))) return false;
  if (!Array.isArray(value.waypoints) || value.waypoints.length > 10000 || !value.waypoints.every(p => object(p) && coordinate(p) && text(p.name) && number(p.elevation))) return false;
  if (!Array.isArray(value.members) || value.members.length > 1000 || !value.members.every(m => object(m) && text(m.id) && text(m.name) && (!m.lastLocation || (coordinate(m.lastLocation) && object(m.lastLocation) && text(m.lastLocation.capturedAt))))) return false;
  if (value.contact != null && (!object(value.contact) || !text(value.contact.name) || !text(value.contact.phone))) return false;
  if (value.outing != null && (!object(value.outing) || !text(value.outing.meetingPoint) || !text(value.outing.startTime) || !number(value.outing.walkingHours) || !number(value.outing.expectedPeople))) return false;
  if (value.preparation != null && (!object(value.preparation) || !Array.isArray(value.preparation.checked) || !value.preparation.checked.every(text))) return false;
  if (value.plan != null) {
    if (!object(value.plan)) return false;
    const itinerary = value.plan.itinerary;
    if (itinerary != null && (!object(itinerary) || !Array.isArray(itinerary.days) || itinerary.days.length > 365 || !itinerary.days.every(day => object(day) && number(day.day) && text(day.start) && text(day.end) && text(day.notes)))) return false;
  }
  return value.startDate == null || text(value.startDate);
}

/** A freshness reminder, never a claim about current trail conditions. */
export function snapshotFreshness(savedAt: string, now = Date.now()) {
  const saved = Date.parse(savedAt);
  if (!Number.isFinite(saved) || saved > now + 5 * 60 * 1000) return 'Save time could not be verified. Update this snapshot before departure.';
  const days = Math.floor((now - saved) / 86400000);
  return days >= 1 ? `This snapshot is ${days} day${days === 1 ? '' : 's'} old. Refresh the roster and preparation before departure.` : 'Saved within the last 24 hours. This is a snapshot, not live information.';
}
