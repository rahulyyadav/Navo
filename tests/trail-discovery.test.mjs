import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile(new URL('../src/services/trail-discovery.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {discoverTreks,destinationForTrek}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const rows=[{id:'mardi',name:'Mardi Himal',region:'Annapurna',difficulty:'Moderate',summary:'Ridge walk',route:[{name:'High Camp'}]},{id:'everest',name:'Everest Base Camp',region:'Khumbu',difficulty:'Strenuous',summary:'High mountains',route:[{name:'Namche Bazaar'}]}];
test('discovery searches stops and combines region/difficulty without changing the catalog',()=>{
 assert.deepEqual(discoverTreks(rows,'  high CAMP ','Annapurna','Moderate').map(r=>r.id),['mardi']);
 assert.deepEqual(discoverTreks(rows,'namche').map(r=>r.id),['everest']);
 assert.equal(discoverTreks(rows,'','Khumbu','Moderate').length,0);
 assert.equal(discoverTreks(rows,'phulchowki').length,0);
 assert.deepEqual(rows.map(r=>r.id),['mardi','everest']);
});

test('catalog navigation hands an explicitly approximate destination to the real planner',()=>{
 const trek={...rows[0],route:[{name:'Base Camp',latitude:28,longitude:84,elevation:4500}]};
 const place=destinationForTrek(trek);assert.equal(place.provider,'coordinates');assert.equal(place.latitude,28);assert.match(place.fullName,/approximate planning point/);
 assert.equal(destinationForTrek({...trek,route:[]}),null);
 assert.equal(destinationForTrek({...trek,route:[{latitude:91,longitude:84}]}),null);
});
