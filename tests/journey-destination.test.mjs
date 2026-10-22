import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/journeys/catalogue.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const catalogue = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('canonical trek aliases resolve to the intended endpoint meaning', () => {
  const abc = catalogue.matchingDestinations('Annapurna').map(item => item.id);
  assert.deepEqual(abc, ['annapurna-base-camp']);
  assert.equal(catalogue.matchingDestinations('ABC')[0].destinationMeaning, 'Annapurna Base Camp endpoint');
  assert.equal(catalogue.matchingDestinations('Mardi Himal Trek')[0].destinationMeaning, 'Mardi Himal Base Camp endpoint');
});

test('catalogue coordinates use the real trek endpoint rather than an approximate mid-route pin', () => {
  const abc = catalogue.cataloguePoint(catalogue.matchingDestinations('ABC')[0]);
  const mardi = catalogue.cataloguePoint(catalogue.matchingDestinations('Mardi')[0]);
  assert.deepEqual([abc.latitude, abc.longitude], [28.674, 83.877]);
  assert.deepEqual([mardi.latitude, mardi.longitude], [28.539, 83.933]);
  assert.equal(abc.provider, 'catalogue');
});

test('place-name matching does not treat a region as a destination name', () => {
  assert.equal(catalogue.queryMatchesPlaceName('Annapurna', { name: 'Poon Hill' }), false);
  assert.equal(catalogue.queryMatchesPlaceName('Mardi Himal', { name: 'Mardi Himal Trek' }), true);
});
