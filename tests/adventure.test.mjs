import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function compile(path,dependencies={}) { const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; const module={exports:{}};new Function('require','module','exports',source)(name=>dependencies[name]??require(name),module,module.exports);return module.exports; }
const utf8=compile('../src/services/utf8.ts');
const navigation=compile('../src/services/trekking/navigation.ts');
const types=compile('../src/services/places/types.ts');
const places=compile('../src/services/places/search.ts',{'../trekking/navigation':navigation,'./types':types});
const walking=compile('../src/services/routing/walking.ts',{'../trekking/navigation':navigation,'../places/types':types});
const distance=compile('../src/services/route-distance.ts');
const progress=compile('../src/services/routing/progress.ts',{'../trekking/navigation':navigation,'../route-distance':distance});
const hourly=compile('../src/services/weather/hourly.ts',{'../day-hike':{nepalToday:()=> '2026-10-10',validHikeDate:v=>v==='2026-10-10'},'../places/types':types});
const response=JSON.parse(readFileSync(new URL('./fixtures/kathmandu-walking.json',import.meta.url),'utf8'));
const endpoints=[{latitude:27.7048,longitude:85.3136},{latitude:27.7145,longitude:85.3206}];
const routes=walking.decodeWalkingRoutes(response,endpoints);
test('real provider fixtures decode Kathmandu autocomplete and two actual walking alternatives',()=>{
 const p=places.decodePlaces(JSON.parse(readFileSync(new URL('./fixtures/kathmandu-places.json',import.meta.url),'utf8')),endpoints[0]); assert.ok(p.some(v=>v.name==='Kathmandu'));assert.ok(p.every(types.isCoordinate));assert.ok(p.every(v=>Number.isFinite(v.distanceM)));
 assert.equal(routes.length,2);assert.equal(routes[0].distanceM,1493.9);assert.equal(routes[0].durationS,1195.2);assert.equal(routes[0].ascentM,null);assert.ok(routes[0].instructions.length>0);assert.ok(routes[0].geometry.length>50);
});
test('routing rejects nonexistent connections, missing geometry and distant network snapping',()=>{
 assert.throws(()=>walking.decodeWalkingRoutes({code:'NoRoute'},endpoints),/No walkable/);
 const bad=structuredClone(response);bad.routes[0].geometry.coordinates[0]=[999,999];assert.throws(()=>walking.decodeWalkingRoutes(bad,endpoints));
 assert.throws(()=>walking.decodeWalkingRoutes(response,[{latitude:28,longitude:85},endpoints[1]]),/200 m/);
 const incomplete=structuredClone(response);incomplete.routes[0].duration=null;assert.throws(()=>walking.decodeWalkingRoutes(incomplete,endpoints));
});
test('navigation uses real geometry and suppresses stale, inaccurate and off-line ETA',()=>{
 const route=routes[0],p=route.geometry[20],fix={...p,accuracy:5,altitude:null,altitudeAccuracy:null,heading:null,speed:null,timestamp:1000};
 const value=progress.navigationProgress(route,fix,true);assert.equal(value.matched,true);assert.ok(value.remainingM>0&&value.remainingM<route.distanceM);assert.ok(value.next?.text);
 assert.equal(progress.navigationProgress(route,fix,false),null);assert.equal(progress.navigationProgress(route,{...fix,accuracy:100},true),null);
 const away=progress.navigationProgress(route,{...fix,latitude:fix.latitude+.01},true);assert.equal(away.matched,false);assert.equal(away.remainingM,null);
});
test('off-route detection needs accurate sustained deviation and resets on stale or recovered GPS',()=>{
 const fix={accuracy:10};assert.deepEqual(progress.sustainedDeviation(fix,90,true,1000,null),{since:1000,offRoute:false});
 assert.equal(progress.sustainedDeviation(fix,90,true,31000,1000).offRoute,true);
 assert.equal(progress.sustainedDeviation(fix,20,true,31000,1000).since,null);assert.equal(progress.sustainedDeviation(fix,90,false,31000,1000).offRoute,false);
 assert.equal(progress.sustainedDeviation({accuracy:90},200,true,31000,1000).offRoute,false);
});
const forecast=()=>({timezone:'Asia/Kathmandu',daily:{time:['2026-10-10'],sunrise:['2026-10-10T06:00'],sunset:['2026-10-10T17:45']},hourly:{time:Array.from({length:24},(_,i)=>`2026-10-10T${String(i).padStart(2,'0')}:00`),...Object.fromEntries([['temperature_2m',18],['precipitation_probability',30],['wind_speed_10m',12],['relative_humidity_2m',65],['visibility',12000],['weather_code',3]].map(([k,v])=>[k,Array(24).fill(v)]))}});
test('hourly weather rejects wrong times, null values and impossible percentages',()=>{
 assert.equal(hourly.decodeHourly(forecast(),'2026-10-10').hours.length,24);
 const bad=forecast();bad.hourly.precipitation_probability[3]=101;assert.throws(()=>hourly.decodeHourly(bad,'2026-10-10'));
 const missing=forecast();missing.hourly.visibility[0]=null;assert.throws(()=>hourly.decodeHourly(missing,'2026-10-10'));
 const wrong=forecast();wrong.timezone='UTC';assert.throws(()=>hourly.decodeHourly(wrong,'2026-10-10'));
});
test('saved plans and completed hikes isolate accounts, serialize writes and retain data after failed saves',async()=>{
 const values=new Map();let fail=false;const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{if(fail)throw new Error('disk full');values.set(k,v);},removeItem:async k=>values.delete(k)};
 const service=compile('../src/lib/adventure-store.ts',{'@react-native-async-storage/async-storage':storage,'@/services/places/types':types,'@/services/utf8':utf8});
 const plan={version:1,id:'plan',name:'Kathmandu walk',origin:types.coordinatePlace(endpoints[0]),destination:types.coordinatePlace(endpoints[1]),stops:[],date:'2026-10-10',time:'07:00',pace:'normal',route:routes[0],savedAt:'2026-10-10T00:00:00Z'};
 await Promise.all([service.changeAdventures('a',v=>({...v,plans:[plan]})),service.rememberPlace('a',plan.destination)]);
 assert.equal((await service.readAdventures('a')).plans.length,1);assert.equal((await service.readAdventures('a')).recent.length,1);assert.equal((await service.readAdventures('b')).plans.length,0);
 fail=true;await assert.rejects(service.changeAdventures('a',v=>({...v,plans:[]})));assert.equal((await service.readAdventures('a')).plans.length,1);
 values.set('navo:adventures:b','broken');await assert.rejects(service.changeAdventures('b',v=>v));assert.equal(values.get('navo:adventures:b'),'broken');await service.clearAdventures('b');assert.equal((await service.readAdventures('b')).history.length,0);
});
test('recorded path export preserves pauses and missing GPS rather than drawing shortcuts',()=>{
 const {recordedSegments}=compile('../src/services/routing/recorded-path.ts');
 const p=(timestamp,segment=0)=>({latitude:27,longitude:85,timestamp,segment,elevation:null});
 const segments=recordedSegments([p(0),p(10000),p(20000,1),p(30000,1),p(120000,1),p(130000,1)]);
 assert.equal(segments.length,3);assert.deepEqual(segments.map(s=>s.length),[2,2,2]);assert.deepEqual(recordedSegments([p(0)]),[]);
});
test('navigation checkpoints serialize with cleanup and restore only to their owning plan',async()=>{
 const values=new Map();const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v),removeItem:async k=>values.delete(k),getAllKeys:async()=>[...values.keys()],multiRemove:async keys=>keys.forEach(k=>values.delete(k))};
 const adventures=compile('../src/lib/adventure-store.ts',{'@react-native-async-storage/async-storage':storage,'@/services/places/types':types,'@/services/utf8':utf8});
 const draft=compile('../src/lib/navigation-draft.ts',{'@react-native-async-storage/async-storage':storage,'./adventure-store':adventures,'@/services/utf8':utf8});
 const plan={version:1,id:'p',name:'Walk',origin:types.coordinatePlace(endpoints[0]),destination:types.coordinatePlace(endpoints[1]),stops:[],date:'2026-10-10',time:'07:00',pace:'normal',route:routes[0],savedAt:'2026-10-10T00:00:00Z'};
 const value={version:1,pathEnabled:false,samples:1,history:{id:'s',name:'Walk',startedAt:plan.savedAt,endedAt:plan.savedAt,distanceM:12,activeSeconds:30,highestM:null,path:[],plan}};
 await draft.saveNavigationDraft('a','p',value);assert.equal((await draft.readNavigationDraft('a','p')).history.distanceM,12);assert.equal(await draft.readNavigationDraft('b','p'),null);
 await Promise.all([draft.saveNavigationDraft('a','p',value),draft.clearNavigationDraft('a','p')]);assert.equal(await draft.readNavigationDraft('a','p'),null);
 values.set('navo:nav-draft:a:other',JSON.stringify(value));await assert.rejects(draft.readNavigationDraft('a','other'));
});
test('AI route context sends weather only when an actual matching forecast is available and excludes raw GPS',()=>{
 const {trekChatContext}=compile('../src/services/routing/ai-context.ts',{'./walking':walking});
 const plan={route:routes[0],destination:types.coordinatePlace(endpoints[1],'Kathmandu'),origin:types.coordinatePlace(endpoints[0],'Trailhead'),pace:'normal',date:'2026-10-10',time:'07:00'};
 const missing=trekChatContext(plan,500,'07:10');assert.equal(missing.weatherAvailable,false);assert.equal(missing.sunset,null);assert.equal(missing.remainingM,500);assert.equal('latitude' in missing,false);assert.equal('geometry' in missing,false);
 const weather=hourly.decodeHourly(forecast(),'2026-10-10');const included=trekChatContext({...plan,weather});assert.equal(included.weatherAvailable,true);assert.equal(included.weather.rainChanceMax,30);assert.equal(included.sunset,'2026-10-10T17:45');assert.equal(trekChatContext({...plan,date:'2026-10-11',weather}).weatherAvailable,false);
});
