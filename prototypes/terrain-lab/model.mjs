const EARTH_M = 6371008.8;
export function distanceM(a, b) {
  const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function readRoute(data) {
  const feature = data?.features?.find(f => f.geometry?.type === 'LineString');
  const points = feature?.geometry?.coordinates;
  if (!Array.isArray(points) || points.length < 2) throw new Error('No route geometry is available.');
  if (points.length > 20000 || points.some(p => !Array.isArray(p) || p.length < 2 || !p.slice(0, 2).every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85)) throw new Error('The demonstration route has invalid coordinates.');
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const gap = distanceM(points[i - 1], points[i]);
    if (gap > 500) throw new Error('A gap in the demonstration route needs review.');
    cumulative.push(cumulative.at(-1) + gap);
  }
  return { feature, points, cumulative, distance: cumulative.at(-1), bounds: points.reduce((b, p) => [[Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])], [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])]], [[180, 90], [-180, -90]]) };
}
export function profileSummary(samples) {
  if (!Array.isArray(samples) || samples.length < 2 || samples.length > 20000) return null;
  if (samples.some((s, i) => !Number.isFinite(s.distanceM) || s.distanceM < 0 || (i > 0 && s.distanceM <= samples[i - 1].distanceM) || !Number.isFinite(s.elevationM))) return null;
  const heights = samples.map(s => s.elevationM);
  return { min: Math.min(...heights), max: Math.max(...heights), distance: samples.at(-1).distanceM, count: samples.length };
}
export function profilePath(samples, width = 300, height = 110) {
  const summary = profileSummary(samples);
  if (!summary || summary.distance <= 0) return null;
  const span = Math.max(1, summary.max - summary.min);
  const points = samples.map(s => [8 + s.distanceM / summary.distance * (width - 16), height - 10 - (s.elevationM - summary.min) / span * (height - 24)]);
  return { line: points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '), area: `M8,${height} ${points.map(p => `L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')} L${width - 8},${height} Z`, ...summary };
}
export function terrariumElevation(r, g, b) { return r * 256 + g + b / 256 - 32768; }
export const DEM_TEMPLATE = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';

// Summary is validated once by the caller. Sorted station lookup avoids scanning
// every height on each slider input, including large imported research profiles.
export function nearestSample(samples, target) {
  if (!samples.length || !Number.isFinite(target)) return null;
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (samples[mid].distanceM < target) lo = mid + 1;
    else hi = mid;
  }
  const before = samples[Math.max(0, lo - 1)], after = samples[lo];
  return Math.abs(before.distanceM - target) <= Math.abs(after.distanceM - target) ? before : after;
}
