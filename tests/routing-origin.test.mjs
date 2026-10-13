import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile = value => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(value, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const types = compile(await readFile(new URL('../src/services/places/types.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../src/services/routing/origin.ts', import.meta.url), 'utf8')).replace("'../places/types'", JSON.stringify(types));
const { resolveWalkingOrigin } = await import(compile(source));
const signal = () => new AbortController().signal;
test('selected trailhead does not request private GPS', async () => {
 const origin = { latitude: 27.6, longitude: 85.4, name: 'Trailhead' };
 assert.equal(await resolveWalkingOrigin(origin, () => { throw Error('Unexpected GPS'); }, signal()), origin);
});
test('missing start uses a fresh accurate location', async () => {
 const value = await resolveWalkingOrigin(null, async () => ({ latitude: 27.6, longitude: 85.4, accuracy: 15, timestamp: Date.now() }), signal());
 assert.equal(value.name, 'Current location'); assert.equal(value.latitude, 27.6);
});
test('denied, inaccurate and stale GPS never become a route start', async () => {
 for (const fix of [null, {latitude:27.6,longitude:85.4,accuracy:500}, {latitude:27.6,longitude:85.4,accuracy:10,timestamp:Date.now()-120000}]) {
  await assert.rejects(resolveWalkingOrigin(null, async()=>fix, signal()), /location could not be found accurately/);
 }
});
test('cancelled location request cannot start routing', async () => {
 const controller = new AbortController(); controller.abort();
 await assert.rejects(resolveWalkingOrigin(null, async()=>({latitude:27.6,longitude:85.4,accuracy:10}), controller.signal), /cancelled/);
});
