import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function compile(path,deps={}){const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',source)(name=>deps[name],module,module.exports);return module.exports;}
const types=compile('../src/services/places/types.ts');
const distance=compile('../src/services/route-distance.ts');
const {decodeTrailPlaces,fetchTrailPlaceSnapshot}=compile('../src/services/trail/places.ts',{'../places/types':types,'../route-distance':distance});
const route=[{latitude:27.7,longitude:85.3},{latitude:27.71,longitude:85.3}];
test('trail facilities are near the actual route and private facilities are excluded',()=>{
 const points=decodeTrailPlaces({elements:[
  {id:1,type:'node',lat:27.705,lon:85.3,tags:{amenity:'shelter',name:'Shelter'}},
  {id:2,type:'node',lat:27.705,lon:85.3,tags:{amenity:'shelter',access:'private'}},
  {id:3,type:'node',lat:28,lon:85.3,tags:{amenity:'shelter'}},
  {id:4,type:'node',lat:27.705,lon:85.3,tags:{hazard:'landslide'}},
  {id:5,type:'node',lat:27.705,lon:85.3,tags:{amenity:'drinking_water'}}
 ]},route);
 assert.equal(points.length,3);assert.equal(points[0].kind,'Rest option');
 assert.match(points.find(p=>p.kind==='Mapped caution').detail,/unverified/);
 assert.match(points.find(p=>p.kind==='Water point').detail,/quality.*unverified/);
 assert.ok(points.every(p=>p.source.startsWith('https://www.openstreetmap.org/node/')));
});
test('missing map data does not invent facilities or imply safety',()=>{
 assert.throws(()=>decodeTrailPlaces({},route));assert.throws(()=>decodeTrailPlaces({elements:[],remark:'runtime error: Query timed out'},route));assert.deepEqual(decodeTrailPlaces({elements:[]},route),[]);
});
test('cached stops retain their fetch date during an outage and never cross routes or override cancellation',async()=>{
 const original=globalThis.fetch;
 let calls=0;
 try {
  globalThis.fetch=async url=>{calls++;assert.match(String(url),/interpreter\?data=/);return {ok:true,json:async()=>({elements:[{id:1,type:'node',lat:27.705,lon:85.3,tags:{amenity:'bench'}}]})};};
  const first=await fetchTrailPlaceSnapshot(route);
  assert.equal(first.stale,false);assert.equal(first.places.length,1);
  assert.equal((await fetchTrailPlaceSnapshot(route)).fetchedAt,first.fetchedAt);assert.equal(calls,1);
  await fetchTrailPlaceSnapshot([...route].reverse());assert.equal(calls,2);
  globalThis.fetch=async()=>{throw new TypeError('network unavailable');};
  const fallback=await fetchTrailPlaceSnapshot(route,undefined,true);
  assert.equal(fallback.stale,true);assert.equal(fallback.fetchedAt,first.fetchedAt);
  const controller=new AbortController();controller.abort();
  await assert.rejects(fetchTrailPlaceSnapshot(route,controller.signal),/cancelled/);
 } finally {globalThis.fetch=original;}
});
const navigation=compile('../src/services/trekking/navigation.ts');
const {hikingReferences,nepalHikingPlaces}=compile('../src/services/places/hiking-references.ts',{'../trekking/navigation':navigation});
test('Nepal hiking aliases prioritize landmarks instead of municipalities and hotels',()=>{
 assert.equal(hikingReferences('shivapuri trekking')[0].type,'peak');
 assert.equal(hikingReferences('dhap dham')[0].name,'Dhap Dam');
 assert.equal(hikingReferences('budhaniklatha')[0].name,'Budhanilkantha Temple');
 assert.equal(hikingReferences('poon hill')[0].type,'peak');
 assert.ok(hikingReferences('Pokhara hikes').length>=4);
 assert.ok(hikingReferences('Kathmandu valley trekking').length>=6);
 assert.ok(nepalHikingPlaces.every(p=>types.isCoordinate(p)&&p.source.startsWith('https://www.openstreetmap.org/')));
});
