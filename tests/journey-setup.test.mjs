import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = (await readFile(new URL('../src/app/journey-setup.tsx', import.meta.url), 'utf8'))
  .replace('function Setup(', 'export function Setup(');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const origin = { id: 'home', name: 'Sabhya Samaj Marg, Lalitpur', latitude: 27.67, longitude: 85.32 };
const destination = { id: 'mardi', name: 'Mardi Himal', latitude: 28.48, longitude: 83.94 };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function screen() {
  const slots = [], pending = [], requests = [], connections = [], saved = [], timers = new Map();
  let cursor = 0, dirty = false, tree, timerId = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(callback, deps) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((v, n) => !Object.is(v, previous.deps[n]))) {
        previous?.cleanup?.();
        slots[i] = { deps };
        pending.push(() => { slots[i].cleanup = callback(); });
      }
    },
  };
  const values = {
    ...hooks,
    useSetupStyles: () => ({}), useTheme: () => ({ palette: { green: 'green' } }),
    useMyLocation: () => ({ state: 'idle' }), useSafeAreaInsets: () => ({}),
    useWindowDimensions: () => ({ height: 800 }), useReducedMotion: () => true,
    nepalToday: () => '2026-10-22', validDate: value => /^\d{4}-\d{2}-\d{2}$/.test(value),
    validPoint: value => Boolean(value?.id), selectedOption: leg => leg.options[0],
    readJourneyDraft: async () => null, saveJourneyDraft: async () => {},
    saveJourney: async (_uid, journey) => { saved.push(journey); }, router: { replace() {} },
    prepareItinerary: (...args) => { const d = deferred(); requests.push({ args, ...d }); return d.promise; },
    itineraryStatus: async () => ({ id: 'a'.repeat(24), status: 'preparing' }),
    connectOrigin: (...args) => { const d = deferred(); connections.push({ args, ...d }); return d.promise; },
    Keyboard: { dismiss() {} }, Platform: { OS: 'ios' },
    FadeInDown: { duration: () => ({ reduceMotion: () => ({}) }) }, ReduceMotion: {},
    journeyDateLabel: value => value,
  };
  const exports = {};
  const stub = new Proxy(values, { get: (obj, key) => key in obj ? obj[key] : key });
  vm.runInNewContext(compiled, {
    exports, require: name => name === 'react/jsx-runtime' ? require(name) : stub,
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  async function settle() {
    for (let i = 0; i < 12; i++) {
      if (dirty || !tree) {
        dirty = false; cursor = 0; tree = exports.Setup({ destination, uid: 'user' });
        pending.splice(0).forEach(fn => fn());
      }
      await Promise.resolve();
    }
  }
  function elements(value) {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(elements);
    return [value, ...elements(value.props?.children)];
  }
  return {
    settle, requests, connections, saved, timers,
    async choose(point) {
      elements(tree).find(el => el.props?.accessibilityState?.expanded !== undefined).props.onPress();
      await settle();
      elements(tree).find(el => el.type === 'DestinationSearch').props.onSelect(point);
      await settle();
    },
    async next() { const button = elements(tree).filter(el => el.type === 'HomePressable' && el.props.onPress).at(-1); assert.equal(Boolean(button.props.disabled), false, 'primary action must be available'); button.props.onPress(); await settle(); },
  };
}

test('starts research in step 1 and reuses it through steps 2 and 3', async () => {
  const ui = screen();
  await ui.settle();
  assert.equal(ui.requests.length, 0);
  await ui.choose(origin);
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].args[1].name, origin.name);
  ui.requests[0].resolve({ id: 'a'.repeat(24), status: 'preparing' });
  await ui.settle();
  await ui.next();
  await ui.next();
  assert.equal(ui.requests.length, 1, 'step changes must not restart research');
  assert.equal([...ui.timers.values()].filter(t => t.delay === 5000).length, 1, 'polling survives step changes');
});

test('prepares the origin connection in the background and ignores an obsolete origin response', async () => {
  const ui = screen();
  await ui.settle();
  await ui.choose(origin);
  const template = { legs: [], readiness: 'ready' };
  ui.requests[0].resolve({ id: 'a'.repeat(24), status: 'ready', template });
  await ui.settle();
  assert.equal(ui.connections.length, 1, 'connect before the final button is pressed');
  assert.equal(ui.connections[0].args[1].name, origin.name);
  await ui.choose({ ...origin, id: 'other', name: 'Another starting point' });
  assert.equal(ui.requests.length, 2);
  ui.connections[0].resolve({ legs: [], sources: [] });
  ui.requests[1].resolve({ id: 'b'.repeat(24), status: 'preparing' });
  await ui.settle();
  assert.equal(ui.connections.length, 1);
  assert.equal([...ui.timers.values()].filter(t => t.delay === 5000).length, 1);
});


for (const readiness of ['ready', 'needs-user-choice', 'blocked']) {
  test(`opens the route as a draft with ${readiness} review status and unaccepted travel warnings`, async () => {
    const ui = screen();
    await ui.settle();
    await ui.choose(origin);
    const option = { id: 'bus', mode: 'bus', requiresUserDecision: true, verification: 'unconfirmed' };
    const leg = { id: 'stage', start: origin, end: destination, options: [option], selected: 'bus' };
    ui.requests[0].resolve({ id: 'a'.repeat(24), status: 'ready', template: { legs: [leg], readiness } });
    await ui.settle();
    ui.connections[0].resolve({ legs: [leg], sources: [] });
    await ui.settle();
    await ui.next();
    await ui.next();
    await ui.next();
    assert.equal(ui.saved.length, 1);
    assert.equal(ui.saved[0].phase, 'draft');
    assert.equal(ui.saved[0].template.readiness, readiness);
    assert.equal(ui.saved[0].acceptedUnverified.length, 0, 'viewing a route must not accept warnings');
    assert.equal(ui.saved[0].preferences.origin.name, origin.name);
  });
}
