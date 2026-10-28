import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function load(path, imports) {
  const code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { if (name in imports) return imports[name]; throw new Error(name); }, Date, Set, Map });
  return exports;
}
const places = await load('../src/services/places/types.ts', {});
const types = await load('../src/services/journeys/types.ts', { '../places/types': places });
const copy = value => JSON.parse(JSON.stringify(value));
const source = { id: 's', title: 'Route reference', url: 'https://example.com/route', checkedAt: '2026-10-24T00:00:00Z' };
const point = name => ({ id: name, name, latitude: 28.2, longitude: 83.9, coordinatesApproximate: true });
const leg = id => ({ id, start: point('Pokhara'), end: point('Kande'), options: ['bus', 'taxi'].map(mode => ({ id: mode, mode, label: mode, minutes: null, note: 'Confirm the transfer locally.', sourceIds: ['s'], verification: 'unconfirmed', requiresUserDecision: true })), selected: 'bus', geometry: [], geometryKind: 'schematic' });
const fixture = () => ({ version: 1, id: 'b'.repeat(24), template: { version: 1, id: 'a'.repeat(24), destination: point('Mardi Himal'), title: 'Mardi route', legs: [leg('first'), leg('second')], sources: [source], researchedAt: source.checkedAt, expiresAt: '2026-10-31T00:00:00Z', provenance: 'researched' }, preferences: { origin: point('Pokhara'), startDate: '2026-10-29', finishDate: '', budget: '', currency: 'NPR' }, approach: [], approachSources: [], selections: {}, completed: 0, phase: 'draft', createdAt: source.checkedAt, updatedAt: source.checkedAt });

test('stage selections remain independent and cannot change completed or closed options', () => {
  const j = fixture();
  const next = types.chooseTravel(j, 'first', 'taxi');
  assert.equal(next.selections.first, 'taxi');
  assert.equal(next.selections.second, undefined);
  assert.equal(j.selections.first, undefined);
  assert.throws(() => types.chooseTravel({ ...next, completed: 1 }, 'first', 'bus'));
  next.template.legs[1].options[1].verification = 'closed-confirmed';
  assert.throws(() => types.chooseTravel(next, 'second', 'taxi'));
});

test('unknown durations and malformed names are explicit; totals never sum partial estimates', () => {
  const j = fixture(); j.template.legs[0].options[0].minutes = 60;
  assert.equal(types.journeySummary(j).minutes, null);
  assert.equal(types.journeySummary(j).unknownDurations, 1);
  assert.equal(types.durationLabel(null), 'Approx. time unavailable');
  assert.equal(types.checkpointLabel(point('Pokhara is the practical public departure hub for reaching the trailhead.')), 'Checkpoint needs review');
  assert.equal(types.checkpointLabel(point('Budhanilkantha')), 'Budhanilkantha');
});

test('combined movement range includes sourced stage ranges and excludes unknown stages', () => {
  const j = fixture();
  j.template.legs[0].options[0].durationRange = { minimum: 120, maximum: 180, sourceIds: ['s'] };
  j.template.legs[1].options[0].minutes = 60;
  assert.equal(types.journeySummary(j).estimatedRange.minimum, 180);
  assert.equal(types.journeySummary(j).estimatedRange.maximum, 240);
  assert.equal(types.journeySummary(j).unknownDurations, 0);
  assert.match(types.optionDurationLabel(j.template.legs[0].options[0]), /2h–3h/);
  j.template.legs[1].options[0].minutes = null;
  assert.equal(types.journeySummary(j).estimatedRange, null);
});

test('edit waits for cloud persistence, restores selections on reopening, and retains old choice after failed save', async () => {
  const j = fixture(), data = new Map();
  let remote = { version: 1, activeId: j.id, journeys: [j] }, fail = false, release, wait = false;
  data.set('navo:journeys:v1:test', JSON.stringify(remote));
  const store = await load('../src/lib/journey-store.ts', {
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async k => data.get(k) ?? null, setItem: async (k, v) => data.set(k, v) } },
    '@/services/journeys/types': types,
    '@/lib/api': { requestJourneyAPI: async (path, body, method) => {
      if (method === 'GET') return copy(remote);
      if (path.endsWith(j.id)) {
        if (fail) throw new Error('Offline');
        if (wait) await new Promise(resolve => { release = resolve; });
        remote.journeys = [copy(body)];
      }
      return copy(remote);
    } },
  });
  wait = true;
  const pending = store.editJourney('test', j.id, value => types.chooseTravel(value, 'first', 'taxi'));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(release);
  assert.equal(JSON.parse(data.get('navo:journeys:v1:test')).journeys[0].selections.first, undefined);
  release(); await pending; wait = false;
  assert.equal((await store.readJourneys('test')).journeys[0].selections.first, 'taxi');
  fail = true;
  await assert.rejects(store.editJourney('test', j.id, value => types.chooseTravel(value, 'first', 'bus')), /Offline/);
  assert.equal(JSON.parse(data.get('navo:journeys:v1:test')).journeys[0].selections.first, 'taxi');
});

const sheet = await load('../src/components/journeys/StageTravelSheet.tsx', {
  react: { useState: v => [v, () => {}] }, 'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View', StyleSheet: { create: v => v, absoluteFill: {} } },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 34 }) },
  '@/components/Typography': { Text: 'Text' }, '@/components/NepalMap': { NepalMap: 'Map' },
  '@/context/ThemeContext': { useTheme: () => ({ palette: {} }) }, '@/components/ui': { useReducedMotion: () => true },
  '@/services/journeys/types': types, './JourneyMotion': { JourneyButton: 'Button' }, './HomeMotion': { HomePressable: 'Pressable' }, './journey-styles': { useJourneyStyles: () => ({}) },
});
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
test('stage sheet opens, dismisses, selects an option, and exposes saving/error state without false success', () => {
  let dismissed = 0, choice;
  const props = { leg: leg('first'), chosen: leg('first').options[0], index: 0, total: 2, sources: [source], completed: false, busy: false, error: '', saved: '', accepted: false, onClose: () => dismissed++, onChoose: id => { choice = id; }, onAccept() {}, onOpenSource() {} };
  const tree = sheet.StageTravelSheet(props), all = nodes(tree);
  assert.equal(tree.props.visible, true);
  assert.equal(all.find(n => n.props?.accessibilityLabel === 'Select bus').props['aria-checked'], true);
  tree.props.onRequestClose(); assert.equal(dismissed, 1);
  all.find(n => n.props?.label === 'Close').props.onPress(); assert.equal(dismissed, 2);
  all.find(n => n.props?.accessibilityLabel === 'Select taxi').props.onPress(); assert.equal(choice, 'taxi');
  assert.equal(all.some(n => n.type === 'Map'), false, 'schematic points must not appear as route geometry');
  const busy = nodes(sheet.StageTravelSheet({ ...props, busy: true }));
  assert.ok(busy.filter(n => n.props?.accessibilityRole === 'radio').every(n => n.props.disabled));
  const failed = JSON.stringify(sheet.StageTravelSheet({ ...props, error: 'Offline' }));
  assert.match(failed, /check the saved choice before retrying/);
  assert.doesNotMatch(failed, /Saved to your account/);
});


test('agent issues must reference an actual stage; legacy plans do not invent agent completion', () => {
  const template = fixture().template;
  assert.equal(types.decodeItinerary(copy(template)).agentReview, undefined);
  template.agentReview = [{ agent: 'Thompson', summary: 'Access not confirmed.', sourceIds: ['s'], legIds: ['second'] }];
  assert.equal(types.decodeItinerary(copy(template)).agentReview[0].legIds[0], 'second');
  template.agentReview[0].legIds = ['missing'];
  assert.throws(() => types.decodeItinerary(copy(template)), /unavailable stage/);
});

test('descriptive checkpoint names cannot be acknowledged into a startable route', () => {
  const j = fixture();
  j.template.legs[0].start.name = 'Pokhara is the practical public departure hub for reaching the trailhead.';
  j.template.readiness = 'ready';
  j.acceptedUnverified = ['first:bus', 'second:bus'];
  j.reviewAcknowledged = true;
  assert.equal(types.journeyReview(j).invalidIdentity, true);
  assert.equal(types.journeyReview(j).canStart, false);
});


test('long checkpoint labels are isolated from headings and complete text is available on demand', () => {
  const stage = leg('long'); stage.end.name = 'Pokhara is the practical public departure hub for reaching the Mardi Himal trailhead.';
  const all = nodes(sheet.StageTravelSheet({ leg: stage, chosen: stage.options[0], index: 1, total: 4, sources: [], provenance: 'researched', completed: false, busy: false, error: '', saved: '', accepted: false, onClose() {}, onChoose() {}, onAccept() {}, onOpenSource() {} }));
  assert.ok(all.some(n => n.props?.children === 'Checkpoint needs review'));
  assert.ok(all.some(n => n.props?.label === 'Read original checkpoint text'));
  assert.equal(all.some(n => n.type === 'Map'), false);
});

test('budget chooses sourced affordable fares and never chooses a closed option', () => {
  const first = leg('priced');
  first.options[0].costNprPerPerson = { minimum: 500, maximum: 700, sourceIds: ['s'] };
  first.options[1].costNprPerPerson = { minimum: 200, maximum: 300, sourceIds: ['s'] };
  first.options[1].verification = 'closed-confirmed';
  const plan = types.budgetSelections([first, leg('unknown')], '1000');
  assert.equal(plan.selections.priced, 'bus');
  assert.equal(plan.knownMaximum, 700);
  assert.equal(plan.unknown, 1);
  assert.equal(types.budgetSelections([first], '400').unknown, 1);
  assert.equal(Object.keys(types.budgetSelections([first], '').selections).length, 0);
});

const durationReferences = await load('../src/services/journeys/duration-references.ts', {});
test('duration references match exact direction and mode without changing access status', () => {
  const journey = fixture();
  journey.template.destination.id = 'mardi-himal';
  journey.template.legs[0].start.name = 'Forest Camp (Kokar)';
  journey.template.legs[0].end.name = 'Low Camp';
  journey.template.legs[0].options[0].mode = 'walk';
  const result = durationReferences.addDurationReferences(journey);
  assert.equal(result.template.legs[0].options[0].durationRange.maximum, 180);
  assert.equal(result.template.legs[0].options[0].verification, 'unconfirmed');
  assert.equal(result.template.legs[0].options[1].durationRange, undefined);
  assert.equal(result.template.sources.length, 2);
  assert.equal(durationReferences.addDurationReferences(result), result);
  const reversed = fixture();
  reversed.template.destination.id = 'mardi-himal';
  reversed.template.legs[0].start.name = 'Low Camp';
  reversed.template.legs[0].end.name = 'Forest Camp';
  assert.equal(durationReferences.addDurationReferences(reversed), reversed);
});
