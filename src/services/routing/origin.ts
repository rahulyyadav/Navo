import { coordinatePlace, isCoordinate, type Place } from '../places/types';
type Fix = { latitude: number; longitude: number; accuracy: number | null; timestamp?: number };
/** Resolve an explicit start first; never fabricate or silently reuse a failed fix. */
export async function resolveWalkingOrigin(origin: Place | null, locate: () => Promise<Fix | null>, signal: AbortSignal): Promise<Place> {
  if (origin) return origin;
  const fix = await locate();
  if (signal.aborted) throw new Error('Route request cancelled.');
  if (!fix || !isCoordinate(fix) || fix.accuracy === null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 100 || (fix.timestamp !== undefined && (!Number.isFinite(fix.timestamp) || Date.now() - fix.timestamp > 60000 || fix.timestamp > Date.now() + 10000))) {
    throw new Error('Your location could not be found accurately. Allow precise location, try outdoors, or choose a starting place using Search another start.');
  }
  return coordinatePlace(fix, 'Current location');
}
