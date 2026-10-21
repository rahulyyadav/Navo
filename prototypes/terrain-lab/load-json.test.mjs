import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON } from './load-json.mjs';
test('unavailable and malformed fixtures reject instead of becoming successful data', async()=>{
 await assert.rejects(loadJSON('local',{fetcher:async()=>({ok:false})}));
 await assert.rejects(loadJSON('local',{fetcher:async()=>({ok:true,json:async()=>{throw Error('invalid')}})}));
 assert.deepEqual(await loadJSON('local',{fetcher:async()=>({ok:true,json:async()=>({samples:[]})})}),{samples:[]});
});
test('slow local fixture is aborted at deadline',async()=>{
 await assert.rejects(loadJSON('local',{timeoutMs:10,fetcher:(_, {signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}),/aborted/);
});
