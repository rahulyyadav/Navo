import type { Coordinate } from "../places/types";
export type RecordedPoint = Coordinate & {
  timestamp: number;
  elevation: number | null;
  segment?: number;
};
/** Pause/lost-signal boundaries are retained, never exported as invented connecting walks. */
export function recordedSegments(path: RecordedPoint[]) {
  const segments: RecordedPoint[][] = [];
  for (const p of path) {
    const last = segments[segments.length - 1];
    if (
      !last ||
      (last[last.length - 1].segment ?? 0) !== (p.segment ?? 0) ||
      p.timestamp - last[last.length - 1].timestamp > 60000
    )
      segments.push([p]);
    else last.push(p);
  }
  return segments.filter((s) => s.length >= 2);
}
