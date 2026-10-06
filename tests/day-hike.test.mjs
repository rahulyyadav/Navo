import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('../src/services/day-hike.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { directionsURL, finishTime, nepalToday, validHikeDate, fetchDayWeather, validateHikeDetails, validateWalkHours } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
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

test('planning validation explains missing and invalid fields before submission', () => {
 assert.match(validateHikeDetails('A', 'Gate', '2099-10-03', '06:00', '4'), /name/);
 assert.match(validateHikeDetails('Hike', 'Gate', '2099-02-30', '06:00', '4'), /date/);
 assert.match(validateHikeDetails('Hike', 'Gate', '2099-10-03', '26:00', '4'), /time/);
 assert.match(validateHikeDetails('Hike', 'Gate', '2099-10-03', '06:00', '2.5'), /people/);
 assert.equal(validateHikeDetails('Hike', 'Gate', '2099-10-03', '06:00', '4'), null);
 assert.ok(validateWalkHours('Infinity')); assert.ok(validateWalkHours('0'));
 assert.equal(validateWalkHours('4.5'), null);
});
test('forecast rejects wrong dates and impossible values', async t => {
 const date = nepalToday();
 const result = { timezone: 'Asia/Kathmandu', daily: { time: [date], temperature_2m_min: [10], temperature_2m_max: [20], precipitation_probability_max: [101], precipitation_sum: [0], wind_speed_10m_max: [5], sunset: [date + 'T18:00'] } };
 t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => result }));
 await assert.rejects(fetchDayWeather(27,85,date), /could not be verified/);
 result.daily.precipitation_probability_max = [20]; result.daily.time = ['2000-01-01'];
 await assert.rejects(fetchDayWeather(27,85,date), /could not be verified/);
 result.daily.time = [date];
 assert.equal((await fetchDayWeather(27,85,date)).rainChance,20);
});
