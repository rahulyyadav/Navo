import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function load(path,prepare=source=>source){const {outputText}=ts.transpileModule(prepare(await readFile(new URL(path,import.meta.url),'utf8')),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);}
const {buildElevationProfile,xAtDistance,formatAscent}=await load('../src/services/elevation-profile.ts');
// Asset require() calls belong to the bundler, not Node; the profile only reads route geometry.
const {treks,trekStats,cumulativeKm}=await load('../src/data/treks.ts',source=>source.replace(/require\([^)]*\)/g,'null'));

const stops=[{name:'Start',elevation:700},{name:'Village',elevation:1500},{name:'Camp',elevation:4200}];

test('distance drives the horizontal axis so clustered stops do not flatten a climb',()=>{
 const even=buildElevationProfile(stops,[0,0.5,40],600,100);
 const near=buildElevationProfile(stops,[0,39.5,40],600,100);
 // Same stops, opposite distance weighting: the 2.7 km climb must move with the last marker's neighbour.
 assert.ok(even.markers[1].x<20,'a village reached in half a kilometre sits at the far left');
 assert.ok(near.markers[1].x>560,'a village at 39.5 km sits just before the summit');
 assert.equal(even.totalKm,40);
});

test('profiles stay inside the canvas and keep the highest point above the lowest',()=>{
 const g=buildElevationProfile(stops,[0,12,31],320,90);
 for(const m of g.markers){
  assert.ok(m.x>=0&&m.x<=320,`${m.name} x=${m.x} is off canvas`);
  assert.ok(m.y>=0&&m.y<=90,`${m.name} y=${m.y} is off canvas`);
 }
 assert.equal(g.highest.name,'Camp');
 assert.equal(g.lowest.name,'Start');
 assert.equal(g.markers.find(m=>m.name==='Start').y,90-5+0,'the lowest elevation sits on the baseline');
 assert.equal(g.markers.find(m=>m.name==='Camp').y,5,'the summit sits at the top padding');
});

test('a flat route still draws, and bad input returns nothing rather than NaN',()=>{
 const flat=buildElevationProfile([{name:'A',elevation:1000},{name:'B',elevation:1000}],[0,4],200,60);
 assert.equal(flat.max,1000);assert.equal(flat.min,1000);
 assert.ok(!/NaN|Infinity/.test(flat.line),flat.line);
 assert.equal(buildElevationProfile([],[],200,60),null);
 assert.equal(buildElevationProfile(stops,[0,1,2],0,60),null);
 assert.equal(buildElevationProfile([{name:'A',elevation:Number.NaN}],[0],200,60),null);
});

test('without usable distances the stops fall back to even spacing',()=>{
 const g=buildElevationProfile(stops,[0,0,0],600,100);
 assert.equal(g.totalKm,0);
 assert.deepEqual(g.markers.map(m=>m.x),[5,300,595]);
 // A single stop cannot be spread across the canvas; centre it.
 assert.equal(buildElevationProfile([{name:'Only',elevation:800}],[0],600,100).markers[0].x,300);
});

test('live position maps walked kilometres onto the canvas and clamps to the route',()=>{
 const g=buildElevationProfile(stops,[0,12,31],600,100);
 assert.equal(xAtDistance(g,31),595);
 assert.equal(xAtDistance(g,0),5);
 assert.equal(xAtDistance(g,120),595,'overwalked distance clamps to the summit');
 assert.equal(xAtDistance(g,-3),5,'negative distance clamps to the start');
 assert.equal(xAtDistance({ ...g,totalKm:0 },9),300,'a distanceless profile centres the marker');
});

test('ascent copy reads as a change, not a bare number',()=>{
 assert.equal(formatAscent(750),'+750 m');
 assert.equal(formatAscent(-50),'−50 m');
 assert.equal(formatAscent(0),'level');
 assert.equal(formatAscent(1234),'+1,234 m');
});

test('every curated trek plots a profile whose length matches its headline distance',()=>{
 for(const trek of treks){
  const km=cumulativeKm(trek.route);
  assert.equal(km.length,trek.route.length);
  assert.ok(km.every((value,index)=>index===0||value>=km[index-1]),`${trek.id} distances must not go backwards`);
  const stats=trekStats(trek.route);
  assert.equal(km[km.length-1],stats.km,`${trek.id} profile length must equal the advertised km`);
  const g=buildElevationProfile(trek.route,km,600,100);
  assert.ok(g,'every trek route must be plottable');
  assert.equal(g.totalKm,stats.km);
  assert.equal(g.highest.elevation,Math.max(...trek.route.map(p=>p.elevation)));
 }
});
