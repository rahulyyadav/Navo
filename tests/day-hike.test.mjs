import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('../src/services/day-hike.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { directionsURL, finishTime, nepalToday, validHikeDate, fetchDayWeather } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('Nepal date crosses midnight 5h45 ahead of UTC', () => assert.equal(nepalToday(new Date('2026-10-03T18:30:00Z')), '2026-10-04'));
test('directions encode user text and use the trailhead as destination', () => {
 const url = new URL(directionsURL('Godawari & garden', 'City ? center', 'transit'));
 assert.equal(url.searchParams.get('destination'), 'Godawari & garden');
 assert.equal(url.searchParams.get('origin'), 'City ? center');
 assert.equal(url.searchParams.get('travelmode'), 'transit');
});
test('planning finish includes approach and walk in Nepal time', () => {
 const date = '2099-10-03';
 assert.equal(finishTime(date, '06:00', 6, 60), '2099-10-03 13:00');
 assert.equal(finishTime(date, '23:00', 2, 60), '2099-10-04 02:00');
 assert.equal(finishTime(date, '29:00', 2, 60), null);
 assert.equal(validHikeDate('2099-02-30'), false);
});
test('forecast refuses dates outside horizon without a request', async () => {
 await assert.rejects(fetchDayWeather(27.59, 85.37, '2099-10-03'), /15 days/);
});
test('forecast rejects incomplete provider response', async t => {
 t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ daily: {} }) }));
 await assert.rejects(fetchDayWeather(27.59, 85.37, nepalToday()), /incomplete/);
});
