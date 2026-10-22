import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}
const navigation = compile('../src/services/trekking/navigation.ts');
const distance = compile('../src/services/route-distance.ts');
const { maneuverFractions } = compile('../src/services/routing/progress.ts', { '../trekking/navigation': navigation, '../route-distance': distance });
const { basemapOptions } = compile('../src/services/map-providers.ts');

const route = (distanceM, steps) => ({ distanceM, instructions: steps.map(distanceM2 => ({ distanceM: distanceM2 })) });

test('maneuver ticks sit where the maneuvers actually fall along the walk', () => {
  const fractions = maneuverFractions(route(4000, [1000, 500, 2500]));
  assert.deepEqual(fractions, [0.25, 0.375, 1]);
  // Instruction legs can overshoot the reported total; the strip must not leave the track.
  assert.deepEqual(maneuverFractions(route(1000, [900, 400])).at(-1), 1);
});

test('a long route keeps its shape while thinning to a readable number of ticks', () => {
  const fractions = maneuverFractions(route(10000, Array.from({ length: 200 }, () => 50)), 12);
  assert.equal(fractions.length, 12);
  assert.ok(fractions.every((value, index) => index === 0 || value >= fractions[index - 1]), 'ticks must stay in walking order');
  assert.ok(fractions[0] <= 0.1, 'the first tick still marks the near end');
  assert.ok(fractions.at(-1) >= 0.9, 'the last tick still marks the far end');
});

test('a route with no measurable legs gets no ticks rather than a fake progress bar', () => {
  assert.deepEqual(maneuverFractions(route(0, [100, 100])), []);
  assert.deepEqual(maneuverFractions(route(2000, [])), []);
});

test('satellite only appears in the layer control when a credited https template exists', () => {
  assert.deepEqual(basemapOptions('', '').map(option => option.id), ['terrain', 'streets']);
  assert.deepEqual(basemapOptions('https://tiles.example/{z}/{x}/{y}.png', '').map(option => option.id), ['terrain', 'streets']);
  assert.deepEqual(basemapOptions('', 'Imagery © example').map(option => option.id), ['terrain', 'streets']);
  assert.deepEqual(basemapOptions('http://tiles.example/{z}/{x}/{y}.png', '© example').map(option => option.id), ['terrain', 'streets']);
  assert.deepEqual(basemapOptions('javascript:fetch(1)/{z}/{x}/{y}.png', '© example').map(option => option.id), ['terrain', 'streets']);
  assert.deepEqual(basemapOptions('https://user:pass@tiles.example/{z}/{x}/{y}.png', '© example').map(option => option.id), ['terrain', 'streets']);
  const withSatellite = basemapOptions('https://tiles.example/{z}/{x}/{y}.png', 'Imagery © example');
  assert.deepEqual(withSatellite.map(option => option.id), ['terrain', 'streets', 'satellite']);
  assert.ok(withSatellite.every(option => option.label && option.caption));
});
