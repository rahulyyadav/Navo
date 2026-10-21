import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readRoute, distanceM, profilePath, profileSummary, terrariumElevation } from './model.mjs';
const fixture = JSON.parse(await readFile(new URL('./data/route.geojson', import.meta.url)));
const profile = JSON.parse(await readFile(new URL('./data/elevation-profile.json', import.meta.url)));
test('public sample retains routing provenance and independently checked length', () => {
  const route = readRoute(fixture);
  assert.equal(route.points.length, 269);
  assert.equal(route.feature.properties.fieldVerified, false);
  assert.equal(route.feature.properties.geometryKind, 'routing-engine');
  assert.ok(Math.abs(route.distance - 6760.06) < 0.02);
  assert.deepEqual(route.points[0], [85.383258, 27.597047]);
});
test('no line or a coordinate/gap defect is rejected rather than rendered as a trail', () => {
  for (const coords of [[], [[85,27]], [[85,27],[NaN,28]], [[85,27],[185,28]], [[85,27],[86,28]]]) {
    assert.throws(() => readRoute({ features: [{ geometry: { type: 'LineString', coordinates: coords } }] }));
  }
});
test('Terrarium decodes the documented offset and fraction', () => {
  assert.equal(terrariumElevation(128,0,0),0);
  assert.equal(terrariumElevation(128,100,128),100.5);
  assert.equal(terrariumElevation(127,255,0),-1);
  assert.equal(distanceM([85,27],[85,27]),0);
});
test('missing elevations never become a zero-height complete profile', () => {
  assert.equal(profileSummary([{distanceM:0,elevationM:null},{distanceM:100,elevationM:2500}]),null);
  assert.equal(profilePath([]),null);
  assert.equal(profileSummary([{distanceM:0,elevationM:2000},{distanceM:0,elevationM:2001}]),null);
});
test('actual DEM sample covers full line and profile drawing never alters height values', () => {
  const before = JSON.stringify(profile);
  const summary = profileSummary(profile.samples), path = profilePath(profile.samples);
  assert.ok(summary.count >= 60);
  assert.ok(Math.abs(summary.distance-readRoute(fixture).distance)<0.02);
  assert.ok(summary.min>1000 && summary.max<4000 && summary.max-summary.min>500);
  assert.ok(path.line.startsWith('M') && !path.line.includes('NaN'));
  assert.equal(profile.verticalAccuracyM,null);
  assert.equal(profile.ascentM,null);
  assert.equal(JSON.stringify(profile),before);
});
