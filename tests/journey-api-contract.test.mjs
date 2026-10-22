import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function module(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`);
    return imports[name];
  } });
  return exports;
}
const places = await module('../src/services/places/types.ts');
const types = await module('../src/services/journeys/types.ts', { '../places/types': places });
const catalogue = await module('../src/services/journeys/catalogue.ts');
const wire = value => JSON.parse(JSON.stringify(value));
const origin = { id: 'origin', name: 'Sabhya Samaj Marg, Lalitpur', latitude: 27.67, longitude: 85.32, aliases: ['home'], uiOnly: true };

for (const destination of catalogue.journeyDestinations) {
  test(`${destination.name}: actual catalogue object produces a clean preparation and approach request`, async () => {
    const requests = [];
    const api = await module('../src/services/journeys/api.ts', {
      './types': types,
      '@/lib/api': { requestJourneyAPI: async (path, body) => {
        requests.push({ path, body: wire(body) });
        return path.endsWith('/prepare') ? { id: 'a'.repeat(24), status: 'preparing' } : { legs: [], sources: [] };
      } },
    });
    await api.prepareItinerary({ ...destination, uiOnly: 'card' }, origin, '2026-10-29');
    await api.connectOrigin({ id: 'a'.repeat(24), researchedAt: '2026-10-22' }, origin);
    const sent = requests[0].body;
    assert.equal('aliases' in sent.destination, false);
    assert.equal('uiOnly' in sent.destination, false);
    assert.equal('aliases' in sent.origin, false);
    assert.equal('uiOnly' in sent.origin, false);
    assert.equal('aliases' in requests[1].body.origin, false);
    assert.equal(sent.destination.canonicalId, destination.canonicalId);
    assert.equal(sent.destination.destinationMeaning, destination.destinationMeaning);
    assert.equal(sent.destination.latitude, destination.latitude);
    assert.equal(sent.destination.longitude, destination.longitude);
    assert.equal(sent.origin.name, origin.name);
    assert.equal(sent.startDate, '2026-10-29');
    assert.ok(destination.aliases.length, 'catalogue search aliases must remain intact');
    assert.deepEqual(Object.keys(sent.destination).sort(), Object.keys(wire(types.toJourneyPoint(destination))).sort());
  });
}

test('cached point cleanup preserves known fields without mutating the original', () => {
  const value = { ...catalogue.journeyDestinations[1], providerId: 'mapped-id', coordinatesApproximate: true, futureCardMetadata: { selected: true } };
  const point = types.toJourneyPoint(value);
  assert.equal('aliases' in point, false);
  assert.equal('futureCardMetadata' in point, false);
  assert.equal(point.providerId, value.providerId);
  assert.equal(point.coordinatesApproximate, true);
  assert.ok(value.aliases.length);
});
