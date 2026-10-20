import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile(new URL('../src/services/onboarding-state.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {resolveOnboarding,restoreOnboarding,offerInitialOnboarding,validOnboarding}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const empty={completed:false,fullName:'',level:null,goals:[],emergencyContact:null,alertsEnabled:false,completedAt:null};
const done={...empty,completed:true,fullName:'Test Hiker',level:'day-hiker',completedAt:'2026-10-20T06:00:00Z'};
test('local completion survives a stale or malformed cloud draft and the newest completed answers win',()=>{
 assert.deepEqual(resolveOnboarding(done,{...empty,fullName:'Old'}),done);
 assert.deepEqual(resolveOnboarding(done,{completed:false}),done);
 assert.deepEqual(resolveOnboarding(empty,done),done);
 const newer={...done,fullName:'Updated',completedAt:'2026-10-20T07:00:00Z'};
 assert.deepEqual(resolveOnboarding(done,newer),newer);
 assert.deepEqual(resolveOnboarding(newer,done),newer);
 assert.equal(validOnboarding({...done,goals:[{}]}),false);
});
test('a legacy account profile restores completion without discarding preferences',()=>{
 const profile={id:'a',fullName:done.fullName,level:done.level,goals:['nature'],emergencyContact:null,alertsEnabled:false,createdAt:done.completedAt};
 assert.equal(restoreOnboarding(empty,profile).completed,true);
 assert.deepEqual(restoreOnboarding(empty,profile).goals,['nature']);
 assert.deepEqual(restoreOnboarding(done,profile),done);
 assert.deepEqual(restoreOnboarding(empty,{...profile,fullName:42}),empty);
});
test('only a genuinely new account is offered setup; returning login, missing metadata and storage failures do not gate Home',()=>{
 const now=Date.parse('2026-10-20T07:00:00Z'),creationTime=new Date(now-5000).toUTCString();
 assert.equal(offerInitialOnboarding(empty,{creationTime,lastSignInTime:creationTime},true,now),true);
 assert.equal(offerInitialOnboarding(done,{creationTime,lastSignInTime:creationTime},true,now),false);
 assert.equal(offerInitialOnboarding(empty,{creationTime:'2026-09-01',lastSignInTime:creationTime},true,now),false);
 assert.equal(offerInitialOnboarding(empty,{},true,now),false);
 assert.equal(offerInitialOnboarding(empty,{creationTime,lastSignInTime:creationTime},false,now),false);
 assert.equal(offerInitialOnboarding(empty,{creationTime,lastSignInTime:creationTime},true,now+86400000),false);
});
