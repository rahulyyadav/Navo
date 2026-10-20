import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile(new URL('../src/services/ai-status.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {classifyAiHealth,aiStatusCopy,probeAiStatus}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('health classification separates a missing address, a dead service and a missing model key',()=>{
 assert.equal(classifyAiHealth('',null),'unconfigured');
 assert.equal(classifyAiHealth('   ',{ok:true,aiConfigured:true}),'unconfigured');
 assert.equal(classifyAiHealth('http://localhost:8114',null),'unreachable');
 assert.equal(classifyAiHealth('http://localhost:8114',{ok:false}),'unreachable');
 assert.equal(classifyAiHealth('http://localhost:8114',{ok:true}),'model-missing');
 assert.equal(classifyAiHealth('http://localhost:8114',{ok:true,aiConfigured:false}),'model-missing');
 assert.equal(classifyAiHealth('http://localhost:8114',{ok:true,aiConfigured:true}),'online');
});

test('every status has user copy, and only broken ones carry a remediation hint',()=>{
 for(const status of ['checking','online','model-missing','storage-unavailable','unreachable','unconfigured']){
  const copy=aiStatusCopy(status);
  assert.ok(copy.label&&copy.title,`${status} needs a label and title`);
  assert.ok(['ok','warn','bad'].includes(copy.tone),`${status} needs a tone`);
 }
 assert.equal(aiStatusCopy('online').hint,'');
 assert.ok(aiStatusCopy('model-missing').hint.length>0);
 assert.ok(aiStatusCopy('unconfigured').hint.length>0);
 assert.match(aiStatusCopy('unreachable').detail,/connection.*service wakes/i);
 assert.ok(aiStatusCopy('unreachable').hint.length>0);
});

test('probe reads aiConfigured from /health and never throws on failure',async()=>{
 const original=globalThis.fetch;
 try{
  const requested=[];
  globalThis.fetch=async url=>{requested.push(url);return{ok:true,json:async()=>url.endsWith('/ready')?({ready:true}):({status:'ok',aiConfigured:true})};};
  assert.equal(await probeAiStatus('http://x.test/'),'online');
  assert.deepEqual(requested,['http://x.test/health','http://x.test/ready']);
  globalThis.fetch=async url=>({ok:!url.endsWith('/ready'),json:async()=>url.endsWith('/ready')?({ready:false}):({aiConfigured:true})});
  assert.equal(await probeAiStatus('http://x.test'),'storage-unavailable');
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'ok',aiConfigured:false})});
  assert.equal(await probeAiStatus('http://x.test'),'model-missing');
  globalThis.fetch=async()=>({ok:true,json:async()=>{throw new Error('not json');}});
  assert.equal(await probeAiStatus('http://x.test'),'model-missing');
  globalThis.fetch=async()=>({ok:false,json:async()=>({})});
  assert.equal(await probeAiStatus('http://x.test'),'unreachable');
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  assert.equal(await probeAiStatus('http://x.test'),'unreachable');
 }finally{globalThis.fetch=original;}
});

test('probe gives up on a service that never answers instead of hanging',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{
   signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));
  });
  assert.equal(await probeAiStatus('http://x.test',60),'unreachable');
 }finally{globalThis.fetch=original;}
});

test('an unconfigured build is reported without touching the network',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=()=>{throw new Error('probe must not call the network');};
  assert.equal(await probeAiStatus(''),'unconfigured');
  assert.equal(await probeAiStatus('   '),'unconfigured');
 }finally{globalThis.fetch=original;}
});

test('model configuration cannot claim readiness when the account probe stalls',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=(url,{signal})=>url.endsWith('/health')?Promise.resolve({ok:true,json:async()=>({aiConfigured:true})}):new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout'))));
  assert.equal(await probeAiStatus('http://x.test',60),'storage-unavailable');
 } finally {globalThis.fetch=original;}
});
