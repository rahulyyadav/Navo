import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/offline-pack.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { validOfflinePack, snapshotFreshness } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const pack=()=>({version:1,trekId:'mardi',trekName:'Mardi Himal',savedAt:'2026-10-17T00:00:00Z',waypoints:[{name:'Start',latitude:28,longitude:84,elevation:1000}],members:[],contact:null,plan:null,preparation:null});
test('offline snapshot accepts existing optional fields but rejects wrong trek or version',()=>{
 assert.ok(validOfflinePack(pack(),'mardi'));assert.equal(validOfflinePack(pack(),'everest'),false);
 assert.equal(validOfflinePack({...pack(),version:2},'mardi'),false);
});
test('corrupt nested data cannot reach offline render methods',()=>{
 for(const change of [{waypoints:[null]},{waypoints:[{name:'Bad',latitude:91,longitude:84,elevation:1}]},{members:[{id:'1',name:'A',lastLocation:{latitude:null,longitude:84}}]},{preparation:{checked:42}},{contact:{name:[]}},{plan:{itinerary:{days:[null]}}},{savedAt:'invalid'}]) assert.equal(validOfflinePack({...pack(),...change},'mardi'),false);
});
test('snapshot freshness distinguishes recent, stale and impossible save times',()=>{
 const now=Date.parse('2026-10-17T12:00:00Z');
 assert.match(snapshotFreshness('2026-10-17T00:00:00Z',now),/24 hours/);
 assert.match(snapshotFreshness('2026-10-15T00:00:00Z',now),/2 days old/);
 assert.match(snapshotFreshness('2026-10-18T00:00:00Z',now),/could not be verified/);
 assert.match(snapshotFreshness('broken',now),/could not be verified/);
});
