import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/services/firebase-diagnostics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const load = development => import(`data:text/javascript;base64,${Buffer.from(`const __DEV__=${development};\n${compiled}`).toString('base64')}`);
test('diagnostics retain only allowlisted error codes, never provider messages or tokens', async()=>{
 const { safeFirebaseCode, traceFirebaseListener } = await load(true);
 assert.equal(safeFirebaseCode({code:'permission-denied',message:'private'}),'permission-denied');
 assert.equal(safeFirebaseCode({code:'private-token'}),'unclassified');
 const original=console.info, events=[]; console.info=(...args)=>events.push(args);
 let stopped=0;
 try { const trace=traceFirebaseListener('profile');trace.next();trace.error({code:'unavailable',message:'secret'});trace.stop(()=>stopped++); }
 finally {console.info=original;}
 assert.equal(stopped,1);
 assert.deepEqual(events.map(e=>JSON.parse(e[1]).event),['subscribe','snapshot','listener-error','unsubscribe']);
 assert.ok(!JSON.stringify(events).includes('secret'));
});
test('release mode emits no diagnostics and preserves unsubscribe exceptions',async()=>{
 const { traceFirebaseListener }=await load(false);
 const original=console.info;let calls=0;console.info=()=>calls++;
 try {const trace=traceFirebaseListener('groups');trace.next();trace.error({code:'unavailable'});assert.throws(()=>trace.stop(()=>{throw Error('failure')}),/failure/);}
 finally{console.info=original;}
 assert.equal(calls,0);
});
