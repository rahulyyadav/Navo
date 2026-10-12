import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = ts.transpileModule(await readFile(new URL('../src/services/hike-inspiration.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { inspirationDates } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('weekend prompts stay in daylight and never schedule a date in the past', () => {
  for (const now of [new Date(2026, 9, 10, 8, 30), new Date(2026, 9, 10, 9), new Date(2026, 9, 11, 23)]) {
    const dates = inspirationDates(now);
    assert.equal(dates.length, 4);
    for (const [index, date] of dates.entries()) {
      assert.ok(date > now); assert.equal(date.getDay(), 6); assert.equal(date.getHours(), 9);
      if (index) assert.equal((date - dates[index - 1]) / 3600000, 168);
    }
  }
});
