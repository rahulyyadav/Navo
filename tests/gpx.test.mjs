import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = (path, dependencies = {}) => {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; new Function('require','module','exports',source)(name => dependencies[name] ?? require(name), module, module.exports); return module.exports;
};
const utf8 = compile('../src/services/utf8.ts');
const navigation = compile('../src/services/trekking/navigation.ts');
const { parseGPX, exportGPX, routeStats, decodeRoutes } = compile('../src/services/routes/gpx.ts', { '../trekking/navigation': navigation, '../utf8': utf8 });
const point = (lat, lon, ele = '') => `<trkpt lat="${lat}" lon="${lon}">${ele}</trkpt>`;
const xml = segments => `<gpx version="1.1"><trk><name>Hill &amp; forest</name>${segments.map(s => `<trkseg>${s}</trkseg>`).join('')}</trk></gpx>`;
test('GPX preserves disconnected segments without inventing connecting distance', () => {
  const route = parseGPX(xml([point(27,85)+point(27.001,85),point(28,85)+point(28.001,85)]),'test');
  assert.equal(route.segments.length,2); assert.equal(route.verified,false);
  assert.ok(routeStats(route).metres < 230); assert.equal(routeStats(route).ascent,null);
  assert.deepEqual(parseGPX(exportGPX(route),'test',route.importedAt),route);
  assert.deepEqual(decodeRoutes(JSON.stringify([route])),[route]);
});
test('GPX rejects malformed, unsafe, missing and invalid geometry', () => {
  for(const text of ['<gpx>', '<!DOCTYPE gpx [<!ENTITY x "bad">]><gpx/>', '<gpx><wpt lat="27" lon="85"/></gpx>', xml([point(91,85)+point(27,85)]), xml([point('',85)+point(27,85)]), xml([point(27,85)])]) assert.throws(()=>parseGPX(text,'test'));
  assert.throws(()=>parseGPX(' '.repeat(2000001),'test'));
});
test('route points and namespace prefixes work; missing elevation is never zero', () => {
  const route = parseGPX('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:rte><g:name>Walk</g:name><g:rtept lat="27" lon="85"><g:ele>100</g:ele></g:rtept><g:rtept lat="27.001" lon="85"><g:ele>120</g:ele></g:rtept></g:rte></g:gpx>','r');
  assert.equal(route.name,'Walk'); assert.equal(routeStats(route).ascent,20);
  route.segments[0][0].elevation=null; assert.equal(routeStats(route).ascent,null);
});
test('corrupt persisted routes are not accepted', () => {
  assert.deepEqual(decodeRoutes(null),[]);
  assert.throws(()=>decodeRoutes('{')); assert.throws(()=>decodeRoutes('[{}]'));
  const route=parseGPX(xml([point(27,85)+point(27.001,85)]),'a'); route.verified=true;
  assert.throws(()=>decodeRoutes(JSON.stringify([route])));
});
test('route storage serializes writes and preserves existing routes on failure', async () => {
  const values = new Map(); let fail = false;
  const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k,v) => { if(fail) throw new Error('disk full'); values.set(k,v); }, removeItem: async k => values.delete(k) };
  const service = compile('../src/lib/route-store.ts', { '@react-native-async-storage/async-storage': storage, '@/services/routes/gpx': { decodeRoutes }, '@/services/utf8': utf8 });
  const route=parseGPX(xml([point(27,85)+point(27.001,85)]),'a');
  await Promise.all([service.updateRoutes('one',v=>[...v,route]), service.updateRoutes('one',v=>[...v,{...route,id:'b'}])]);
  assert.equal((await service.readRoutes('one')).length,2); assert.deepEqual(await service.readRoutes('two'),[]);
  fail=true; await assert.rejects(service.updateRoutes('one',()=>[])); assert.equal((await service.readRoutes('one')).length,2);
  values.set('navo:imported-routes:two','corrupt'); await assert.rejects(service.updateRoutes('two',()=>[])); assert.equal(values.get('navo:imported-routes:two'),'corrupt');
  await service.clearRoutes('two'); assert.deepEqual(await service.readRoutes('two'),[]);
});
test('GPX navigation uses one continuous segment and labels its timing assumption',()=>{
 const places=compile('../src/services/places/types.ts');
 const {planGPXSegment}=compile('../src/services/routes/gpx-plan.ts',{'./gpx':{routeStats},'../places/types':places});
 const route=parseGPX(xml([point(27,85)+point(27.001,85),point(28,85)+point(28.001,85)]),'g');
 const plan=planGPXSegment(route,0,'plan','2026-10-10','07:00');
 assert.equal(plan.route.provider,'user-gpx');assert.equal(plan.route.geometry.length,2);assert.equal(plan.route.durationBasis,'4kmh-assumption');assert.equal(plan.route.ascentM,null);assert.deepEqual(plan.route.instructions,[]);assert.ok(plan.route.distanceM<120);
 const gap=parseGPX(xml([point(27,85)+point(27.1,85)]),'gap');assert.throws(()=>planGPXSegment(gap,0,'p','2026-10-10','07:00'),/500 m/);
});
test('GPX keeps real recorded timestamps through export and reimport',()=>{
 const route=parseGPX(xml([point(27,85,'<time>2026-10-10T01:00:00Z</time>')+point(27.001,85,'<time>2026-10-10T01:02:00Z</time>')]),'timed');
 assert.equal(route.segments[0][0].timestamp,Date.parse('2026-10-10T01:00:00Z'));assert.deepEqual(parseGPX(exportGPX(route),'timed',route.importedAt),route);
});
test('native-independent byte limits count Nepali names and Unicode correctly',()=>{
 assert.equal(utf8.utf8Bytes('NAVO'),4);assert.equal(utf8.utf8Bytes('नेपाल'),15);assert.equal(utf8.utf8Bytes('🏔'),4);
});
test('web GPX picker cancellation settles and cleans up instead of leaving import loading',async()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;let input;const focus=new Map();
 globalThis.window={addEventListener:(k,v)=>focus.set(k,v),removeEventListener:k=>focus.delete(k)};
 globalThis.document={body:{appendChild(){}},createElement:()=>{input={style:{},files:[],listeners:new Map(),addEventListener(k,v){this.listeners.set(k,v);},remove(){this.removed=true;},click(){}};return input;}};
 try{
  const files=compile('../src/lib/gpx-files.ts',{'expo-document-picker':{},'expo-file-system':{},'expo-sharing':{},'react-native':{Platform:{OS:'web'}},'@/services/routes/gpx':{MAX_GPX_BYTES:2000000}});
  const cancelled=files.pickGPX();input.listeners.get('cancel')();assert.equal(await cancelled,null);assert.equal(input.removed,true);assert.equal(focus.size,0);
  const selected=files.pickGPX();input.files=[{name:'route.gpx',size:100,text:async()=>'<gpx/>'}];input.onchange();assert.equal(await selected,'<gpx/>');assert.equal(input.removed,true);
  const invalid=files.pickGPX();input.files=[{name:'notes.txt',size:100,text:async()=>''}];input.onchange();await assert.rejects(invalid,/ending in .gpx/);
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});

const {elevationProfile}=compile('../src/services/routes/elevation-profile.ts',{'../trekking/navigation':navigation});
const library=compile('../src/services/routes/library.ts',{'./gpx':{routeStats}});
test('elevation profile keeps segment gaps disconnected and refuses missing heights',()=>{
 const route=parseGPX(xml([point(27,85,'<ele>100</ele>')+point(27.001,85,'<ele>120</ele>'),point(28,85,'<ele>130</ele>')+point(28.001,85,'<ele>140</ele>')]),'profile');
 const profile=elevationProfile(route);assert.equal(profile.segments.length,2);assert.equal(profile.lowM,100);assert.equal(profile.highM,140);assert.ok(profile.distanceM<230);
 assert.equal(profile.segments[0].at(-1).distanceM,profile.segments[1][0].distanceM);
 route.segments[0][0].elevation=null;assert.equal(elevationProfile(route),null);
});
test('large elevation profiles are bounded without losing route endpoints',()=>{
 const route={segments:[Array.from({length:20000},(_,i)=>({latitude:27+i*.000001,longitude:85,elevation:100+i%20}))]};
 const profile=elevationProfile(route);assert.ok(profile.sampled);assert.ok(profile.segments.flat().length<=401);assert.equal(profile.segments[0][0].distanceM,0);assert.equal(profile.segments[0].at(-1).distanceM,profile.distanceM);
 assert.equal(elevationProfile({segments:[[{latitude:27,longitude:85,elevation:100},{latitude:27,longitude:85,elevation:100}]]}),null);
});
test('saved GPX search and length ordering do not mutate the private library',()=>{
 const short=parseGPX(xml([point(27,85)+point(27.001,85)]),'short','2026-10-16T00:00:00Z');short.name='Shivapuri Forest';
 const long=parseGPX(xml([point(27,85)+point(27.01,85)]),'long','2026-10-17T00:00:00Z');long.name='Dhap Dam';
 const index=library.indexRouteLibrary([short,long]);
 assert.deepEqual(library.searchRouteLibrary(index,'  FOREST shiva ','recent').map(e=>e.route.id),['short']);
 assert.deepEqual(library.searchRouteLibrary(index,'','longest').map(e=>e.route.id),['long','short']);
 assert.deepEqual(library.searchRouteLibrary(index,'','recent').map(e=>e.route.id),['long','short']);
 assert.deepEqual(index.map(e=>e.route.id),['short','long']);assert.equal(library.searchRouteLibrary(index,'everest','recent').length,0);
});
