import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = ts.transpileModule(await readFile(new URL('../src/theme/palettes.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { palettes, validThemeMode, resolveTheme } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('system appearance follows the OS and explicit choices override it', () => {
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  for (const system of ['light', null, undefined]) assert.equal(resolveTheme('system', system), 'light');
  assert.equal(resolveTheme('light', 'dark'), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
});
test('invalid persisted preferences cannot become a theme', () => {
  for (const value of ['light', 'dark', 'system']) assert.equal(validThemeMode(value), true);
  for (const value of ['', 'auto', 'DARK', null, {}, 0]) assert.equal(validThemeMode(value), false);
});
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((a,b) => b-a); return (values[0] + .05) / (values[1] + .05); }
test('essential text and primary actions meet WCAG AA contrast in each theme', () => {
  for (const [name, t] of Object.entries(palettes)) {
    for (const background of [t.background, t.surface, t.elevated]) {
      for (const foreground of [t.ink, t.secondaryText, t.muted]) assert.ok(contrast(foreground, background) >= 4.5, `${name}: ${foreground} on ${background}`);
    }
    assert.ok(contrast(t.onPrimary, t.primary) >= 4.5, `${name} primary action`);
  }
  assert.equal(palettes.dark.background, '#000000');
});
