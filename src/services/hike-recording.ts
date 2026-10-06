export type TrackFix = { latitude: number; longitude: number; accuracy: number; timestamp: number };
export type TrackProgress = { distanceM: number; samples: number; last: TrackFix | null };
export const emptyTrack = (): TrackProgress => ({ distanceM: 0, samples: 0, last: null });
export function recordFix(track: TrackProgress, fix: TrackFix, now = Date.now()): TrackProgress {
  if (![fix.latitude, fix.longitude, fix.accuracy, fix.timestamp].every(Number.isFinite) || Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180 || fix.accuracy < 0 || fix.accuracy > 50 || now - fix.timestamp > 30000 || fix.timestamp > now + 1000) return track;
  if (!track.last) return { ...track, samples: track.samples + 1, last: fix };
  const seconds = (fix.timestamp - track.last.timestamp) / 1000;
  if (seconds <= 0) return track;
  if (seconds > 60) return { ...track, samples: track.samples + 1, last: fix }; // Never bridge lost GPS or paused segments.
  const radians = Math.PI / 180;
  const deltaLat = (fix.latitude - track.last.latitude) * radians;
  const deltaLon = (fix.longitude - track.last.longitude) * radians;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(track.last.latitude * radians) * Math.cos(fix.latitude * radians) * Math.sin(deltaLon / 2) ** 2;
  const metres = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  if (metres / seconds > 4) return { ...track, last: null }; // Implausible walking speed; restart the segment.
  if (metres < Math.max(8, fix.accuracy, track.last.accuracy)) return track;
  return { distanceM: track.distanceM + metres, samples: track.samples + 1, last: fix };
}
export function activeTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(v => String(v).padStart(2, '0')).join(':');
}
