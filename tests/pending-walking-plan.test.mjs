import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const store = new Map();
function compile(path, dependencies) {
 const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module = {exports:{}}; new Function('require','module','exports',source)(name=>dependencies[name],module,module.exports); return module.exports;
}
const storage = {getItem:async k=>store.get(k)??null,setItem:async(k,v)=>store.set(k,v),removeItem:async k=>store.delete(k)};
const api = compile('../src/lib/pending-walking-plan.ts', {'@react-native-async-storage/async-storage':storage,'./adventure-store':{decodeAdventures:raw=>{const v=JSON.parse(raw);if(!v.plans[0]?.id)throw Error('invalid');return v;}}});
test('explicit sign-in draft survives remount, is account-bound, then removed',async()=>{
 await api.stageWalkingPlan({id:'route-test'});
 assert.equal((await api.pendingWalkingPlan('alice')).id,'route-test');
 assert.equal(await api.pendingWalkingPlan('bob'),null);
 assert.equal((await api.pendingWalkingPlan('alice')).id,'route-test');
 await api.clearPendingWalkingPlan(); assert.equal(await api.pendingWalkingPlan('alice'),null);
});
test('expired or malformed guest drafts are discarded',async()=>{
 for(const raw of ['bad',JSON.stringify({plan:{id:'x'},expires:Date.now()-1}),JSON.stringify({plan:{},expires:Date.now()+10000})]){
  store.set('navo:pending-walking-signin',raw);assert.equal(await api.pendingWalkingPlan('alice'),null);assert.equal(store.size,0);
 }
});
