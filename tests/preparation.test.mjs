import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const domainURL = url(compile(await readFile(new URL('../src/services/preparation.ts', import.meta.url), 'utf8')));
const { normalizePreparation, decidePreparation, preparationShare } = await import(domainURL);
const syncSource = compile(await readFile(new URL('../src/services/preparationSync.ts', import.meta.url), 'utf8')).replace("'./preparation'", JSON.stringify(domainURL));
const { createPreparationSync } = await import(url(syncSource));
const wait = () => new Promise(resolve => setImmediate(resolve));

test('not-prepared differs from unreviewed; undo restores either state without duplicates', () => {
  const original = normalizePreparation({ checked: ['water', 'water'] });
  assert.deepEqual(original.reviewed, ['water']);
  const notYet = decidePreparation(original, 'water', false);
  assert.deepEqual(notYet.checked, []); assert.deepEqual(notYet.reviewed, ['water']);
  assert.deepEqual(decidePreparation(notYet, 'water', true), original);
  assert.deepEqual(decidePreparation(notYet, 'water', null).reviewed, []);
  assert.equal(decidePreparation(original, 'unknown', true), original);
});
test('sharing names prepared and not-yet items rather than claiming unchecked items are complete', () => {
  const plan = decidePreparation(decidePreparation(normalizePreparation(null), 'water', true), 'kit', false);
  const message = preparationShare('ABC', plan);
  assert.match(message, /1\/10 prepared/); assert.match(message, /Prepared:\n✓ Drinking water/); assert.match(message, /Not prepared yet:\n○ Headlamp/); assert.match(message, /8 items still to review/);
});
test('failed database writes leave a durable outbox and retry saves the same decisions', async () => {
  let stored, state, online = false, remote;
  const controller = createPreparationSync({ read: async () => null, write: async value => { stored = value; }, fetch: async () => null, save: async plan => { if (!online) throw Error('offline'); remote = plan; } }, value => { state = value; });
  await controller.load();
  controller.change(decidePreparation(state.plan, 'water', false)); await wait();
  assert.equal(state.status, 'pending'); assert.equal(stored.pending, true); assert.deepEqual(stored.plan.reviewed, ['water']);
  online = true; await controller.retry();
  assert.deepEqual(remote.reviewed, ['water']); assert.equal(stored.pending, false); assert.equal(state.status, 'saved');
});
test('rapid decisions are serialized and an old response cannot clear a newer pending choice', async () => {
  let stored, state, release; const saved = [];
  const controller = createPreparationSync({ read: async () => null, write: async value => { stored = value; }, fetch: async () => null, save: async plan => { saved.push(plan); if (saved.length === 1) await new Promise(resolve => { release = resolve; }); } }, value => { state = value; });
  await controller.load();
  controller.change(decidePreparation(state.plan, 'water', true)); await wait();
  controller.change(decidePreparation(state.plan, 'kit', false)); await wait();
  assert.deepEqual(stored.plan.reviewed, ['water', 'kit']); assert.equal(stored.pending, true);
  release(); await controller.retry();
  assert.equal(saved.length, 2); assert.deepEqual(saved[1].reviewed, ['water', 'kit']); assert.deepEqual(stored.plan, saved[1]); assert.equal(stored.pending, false);
});
test('legacy local preparations migrate to account storage and pending data wins over remote', async () => {
  let state, remote; let reads = 0;
  const controller = createPreparationSync({ read: async () => ({ checked: ['water'], date: '', notes: 'legacy' }), write: async () => {}, fetch: async () => { reads++; return null; }, save: async value => { remote = value; } }, value => { state = value; });
  await controller.load(); assert.equal(reads, 0); assert.deepEqual(remote.checked, ['water']); assert.deepEqual(remote.reviewed, ['water']); assert.equal(state.status, 'saved');
});
test('retrying a failed account read reads again instead of overwriting the account with an empty checklist', async () => {
  let state, fetches = 0, writes = 0;
  const controller = createPreparationSync({ read: async () => null, write: async () => {}, fetch: async () => { if (++fetches === 1) throw Error('offline'); return { checked: ['water'], reviewed: ['water'] }; }, save: async () => { writes++; } }, value => { state = value; });
  await controller.load();
  assert.equal(state.loaded, false);
  controller.change(decidePreparation(state.plan, 'kit', true));
  await wait();
  assert.equal(writes, 0);
  await controller.retry();
  assert.equal(writes, 0); assert.deepEqual(state.plan.checked, ['water']); assert.equal(state.status, 'saved');
});
