import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/trekking/navigation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { buildRoute, distance, sampleRoute, matchRoute, acceptFix, shortestAngle, nextCheckpoints, elevationTrend } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const p = (latitude, longitude, elevation = 100, name = 'point') => ({ latitude, longitude, elevation, name });
const route = buildRoute([p(28, 84, 100, 'Start'), p(28.01, 84, 200, 'Pass'), p(28.02, 84, 150, 'Finish')]);
const fix = (latitude = 28, longitude = 84, timestamp = 100000) => ({ latitude, longitude, accuracy: 5, altitude: 100, altitudeAccuracy: 3, heading: null, speed: null, timestamp });
test('route sampling clamps boundaries, preserves elevation and handles duplicate stops', () => {
  assert.equal(sampleRoute(route, -1).progress, 0);
  assert.equal(sampleRoute(route, route.total + 100).elevation, 150);
  assert.ok(Math.abs(sampleRoute(route, route.total / 4).elevation - 150) < 0.01);
  const duplicate = buildRoute([p(28, 84), p(28, 84), p(28.01, 84)]);
  assert.ok(Number.isFinite(sampleRoute(duplicate, 0).slope));
  assert.throws(() => buildRoute([p(28, 84)]));
  assert.throws(() => buildRoute([p(28, 84), p(NaN, 84)]));
});
test('matching allows backtracking and distinguishes off-route GPS', () => {
  const matched = matchRoute(route, fix(28.005, 84));
  assert.ok(matched.confident);
  assert.ok(matched.crossTrack < 1);
  const back = matchRoute(route, fix(28.003, 84), matched.progress);
  assert.ok(back.progress < matched.progress);
  assert.equal(matchRoute(route, fix(28.005, 84.01)).confident, false);
  assert.equal(matchRoute(route, { ...fix(28.005, 84), accuracy: 90 }).confident, false);
});
test('crossing geometry does not claim confident progress on an ambiguous fix', () => {
  const crossing = buildRoute([p(28,84), p(28.01,84.01), p(28,84.01), p(28.01,84)]);
  assert.equal(matchRoute(crossing, fix(28.005,84.005)).confident, false);
});
test('GPS rejects stale, duplicate, poor, invalid and impossible fixes', () => {
  const prior = fix();
  assert.ok(acceptFix(fix(28.00001,84,102000),prior,102000));
  assert.equal(acceptFix(fix(28,84,100000),prior,100000), false);
  assert.equal(acceptFix(fix(28,84,60000),null,100000), false);
  assert.equal(acceptFix(fix(29,84,102000),prior,102000), false);
  assert.equal(acceptFix({ ...fix(), accuracy: null },null,100000), false);
  assert.equal(acceptFix({ ...fix(), latitude: 100 },null,100000), false);
  assert.equal(acceptFix(fix(28,84,110000),null,100000), false);
});
test('checkpoint distances follow supplied geometry and bearings wrap smoothly', () => {
  const next = nextCheckpoints(route, route.total / 4);
  assert.equal(next[0].name, 'Pass');
  assert.ok(Math.abs(next[0].distance - route.total / 4) < 0.01);
  assert.deepEqual(nextCheckpoints(route,route.total), []);
  assert.equal(shortestAngle(359,1),2);
  assert.equal(shortestAngle(1,359),-2);
  assert.ok(distance(p(0,0),p(0,0)) < 0.001);
});
test('elevation noise, uncertain altitude and stationary fixes do not invent a climb', () => {
  assert.equal(elevationTrend([fix(),fix(),fix()]),0);
  const climbing = [0,1,2,3].map(i => ({ ...fix(28+i*.0004,84,100000+i*10000), altitude:100+i*5 }));
  assert.ok(elevationTrend(climbing) > 0);
  assert.equal(elevationTrend(climbing.map(f => ({ ...f, altitudeAccuracy: 60 }))),0);
  assert.equal(elevationTrend(climbing.map(f => ({ ...f, altitude: null }))),0);
});
