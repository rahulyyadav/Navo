import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = ts.transpileModule(await readFile(new URL('../src/services/journey-calendar.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { monthCells, moveMonth, addCalendarDays } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('calendar weeks start on Monday and include each day once', () => {
  const days = monthCells('2026-10');
  assert.deepEqual(days.slice(0, 4), [null, null, null, '2026-10-01']);
  assert.equal(days.filter(Boolean).length, 31);
  assert.equal(days.length % 7, 0);
  assert.equal(new Set(days.filter(Boolean)).size, 31);
});
test('leap years and short February grids are correct', () => {
  assert.equal(monthCells('2028-02').filter(Boolean).at(-1), '2028-02-29');
  assert.equal(monthCells('2026-02').filter(Boolean).at(-1), '2026-02-28');
  assert.deepEqual(monthCells('2026-13'), []);
});
test('month navigation crosses years without changing a chosen day', () => {
  assert.equal(moveMonth('2026-12', 1), '2027-01');
  assert.equal(moveMonth('2026-01', -1), '2025-12');
  assert.equal(moveMonth('invalid', 1), 'invalid');
});
test('date shortcuts cross DST, month and year boundaries using date-only arithmetic', () => {
  for (const zone of ['Asia/Kathmandu', 'America/New_York', 'Pacific/Honolulu']) {
    const before = process.env.TZ; process.env.TZ = zone;
    try {
      assert.equal(addCalendarDays('2026-03-07', 2), '2026-03-09');
      assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
      assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');
      assert.equal(addCalendarDays('2026-02-30', 1), '2026-02-30');
    } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
  }
});
