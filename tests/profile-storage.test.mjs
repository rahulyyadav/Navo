import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function compile(path,deps={}) {
 const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',source)(name=>deps[name],module,module.exports);return module.exports;
}
const policy=compile('../src/services/onboarding-state.ts');
function device(records=new Map()) {
 const store={readJSON:async key=>records.has(key)?JSON.parse(records.get(key)):null,writeJSON:async(key,value)=>records.set(key,JSON.stringify(value)),dropRaw:async key=>records.delete(key)};
 return compile('../src/services/profile.ts',{'@/lib/storage':store,'./onboarding-state':policy});
}
test('onboarding survives a fresh device-store reader, sign-out cache reload and another account cleanup',async()=>{
 const records=new Map(),first=device(records);
 const answers={...first.emptyOnboarding,completed:true,fullName:'Test Hiker',level:'day-hiker',goals:['nature'],completedAt:'2026-10-20T08:00:00Z'};
 await first.saveOnboarding('account-a',answers);
 await first.saveOnboarding('account-b',{...answers,fullName:'Second Hiker'});
 const reloaded=device(records);
 assert.deepEqual(await reloaded.loadOnboarding('account-a'),answers);
 await reloaded.clearUserData('account-b');
 assert.equal((await device(records).loadOnboarding('account-a')).completed,true);
 assert.equal((await reloaded.loadOnboarding('account-b')).completed,false);
});
test('invalid answer shapes and profiles belonging to another account cannot restore completion',async()=>{
 const records=new Map([['onboarding:a',JSON.stringify({completed:true,fullName:42})],['profile:a',JSON.stringify({id:'b',fullName:'Other account'})]]);
 const store=device(records);
 assert.equal((await store.loadOnboarding('a')).completed,false);
 assert.equal(await store.loadProfile('a'),null);
});
