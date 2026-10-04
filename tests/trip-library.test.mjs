import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
async function load(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const exports = {};
  new Function('require', 'exports', outputText)(id => dependencies[id], exports);
  return exports;
}
const model = await load('../src/services/trip-library.ts');
const recording = await load('../src/services/hike-recording.ts');
test('NPR amounts use exact minor units and reject malformed amounts', () => {
  assert.equal(model.parseNPR('0.10'),10);
  assert.equal(model.parseNPR('123.45'),12345);
  for (const amount of ['-1','1e4','Infinity','1.123','100,000','']) assert.equal(model.parseNPR(amount),null);
  assert.deepEqual(model.tripBudget({ budgetPaisa:100, people:3, expenses:[{paisa:101}] }),{spent:101,remaining:-1,perPerson:34});
});
test('invalid persisted data is rejected rather than silently overwritten', () => {
  assert.deepEqual(model.decodeLibrary(model.emptyLibrary()),model.emptyLibrary());
  assert.throws(() => model.decodeLibrary({version:2}),/unchanged/);
  assert.throws(() => model.decodeLibrary({...model.emptyLibrary(),activities:[{id:'a',name:'Walk',finishedAt:new Date().toISOString(),distanceM:Infinity,activeSeconds:5,samples:2}]}),/unchanged/);
});
test('concurrent personal updates retain both changes and isolate accounts', async () => {
  const values = new Map();
  const storage = { getItem:async key => values.get(key) ?? null, setItem:async (key,value) => values.set(key,value), removeItem:async key => values.delete(key) };
  const store = await load('../src/lib/trip-library-store.ts',{'@react-native-async-storage/async-storage':storage,'@/services/trip-library':model});
  await Promise.all(['a','b'].map(id => store.changeLibrary('alice',data => ({...data,savedTrekIds:[...data.savedTrekIds,id]}))));
  assert.deepEqual((await store.readLibrary('alice')).savedTrekIds,['a','b']);
  assert.deepEqual((await store.readLibrary('bob')).savedTrekIds,[]);
  values.set('navo:trip-library:alice','corrupt');
  await assert.rejects(store.changeLibrary('alice',model.emptyLibrary),/unchanged/);
  assert.equal(values.get('navo:trip-library:alice'),'corrupt');
  await store.clearLibrary('alice');
  assert.deepEqual(await store.readLibrary('alice'), model.emptyLibrary());
});
test('storage failure keeps last successful library intact', async () => {
  const storage = { getItem:async () => JSON.stringify(model.emptyLibrary()), setItem:async () => {throw new Error('full');} };
  const store = await load('../src/lib/trip-library-store.ts',{'@react-native-async-storage/async-storage':storage,'@/services/trip-library':model});
  await assert.rejects(store.changeLibrary('alice', data => ({...data,savedTrekIds:['mardi-himal']})),/full/);
  assert.deepEqual((await store.readLibrary('alice')).savedTrekIds,[]);
});
test('GPS recording rejects jitter, stale fixes, vehicle jumps and paused gaps', () => {
  const now = Date.now();
  const fix = {latitude:27,longitude:85,accuracy:5,timestamp:now};
  let progress = recording.recordFix(recording.emptyTrack(),fix,now);
  assert.equal(progress.distanceM,0);
  assert.equal(recording.recordFix(progress,{...fix,accuracy:200},now),progress);
  assert.equal(recording.recordFix(progress,{...fix,timestamp:now-60000},now),progress);
  assert.equal(recording.recordFix(progress,{...fix,latitude:27.00001,timestamp:now+10000},now+10000),progress);
  progress = recording.recordFix(progress,{...fix,latitude:27.0001,timestamp:now+10000},now+10000);
  assert.ok(progress.distanceM > 10 && progress.distanceM < 12);
  const jump = recording.recordFix(progress,{...fix,latitude:28,timestamp:now+20000},now+20000);
  assert.equal(jump.distanceM,progress.distanceM); assert.equal(jump.last,null);
  const gap = recording.recordFix(progress,{...fix,latitude:28,timestamp:now+90000},now+90000);
  assert.equal(gap.distanceM,progress.distanceM);
  assert.equal(recording.activeTime(3661),'01:01:01');
});

test('saved plan search groups Nepal dates without mutating stored order', async () => {
  const {findTrips} = await load('../src/services/trip-search.ts');
  const trips = [{id:'b',name:'Shivapuri',meeting:'Budhanilkantha',origin:'Kathmandu',date:'2026-10-05',time:'07:00'}, {id:'a',name:'Phulchowki',meeting:'Godawari',origin:'Patan',date:'2026-10-01',time:'06:00'}];
  assert.deepEqual(findTrips(trips,'godawari','Past','2026-10-04').map(t=>t.id),['a']);
  assert.deepEqual(findTrips(trips,'','Upcoming','2026-10-04').map(t=>t.id),['b']);
  assert.deepEqual(trips.map(t=>t.id),['b','a']);
});
test('inbox cache bounds age, validates data and isolates accounts', async () => {
  const values = new Map();
  const storage = {getItem:async key=>values.get(key)??null,setItem:async(key,value)=>values.set(key,value),removeItem:async key=>values.delete(key)};
  const inbox = await load('../src/lib/inbox-cache.ts',{'@react-native-async-storage/async-storage':storage});
  const item = {id:'notice-1',groupId:'group1',type:'alert',read:false,groupName:'Weekend hike',message:'Meet at the gate'};
  await inbox.saveInbox('alice',[item]);
  assert.equal((await inbox.readInbox('alice')).items[0].id,'notice-1');
  assert.equal(await inbox.readInbox('bob'),null);
  assert.throws(()=>inbox.decodeInbox(JSON.stringify({version:1,savedAt:'2020-01-01',items:[item]})));
  assert.throws(()=>inbox.decodeInbox(JSON.stringify({version:1,savedAt:new Date().toISOString(),items:[{...item,read:'no'}]})));
  values.set('navo:inbox:expired', JSON.stringify({version:1,savedAt:'2020-01-01',items:[item]}));
  assert.equal(await inbox.readInbox('expired'),null);
  assert.equal(values.has('navo:inbox:expired'),false);
  await inbox.clearInbox('alice');
  assert.equal(await inbox.readInbox('alice'),null);
});
