import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const {outputText}=ts.transpileModule(await readFile(new URL('../src/services/trail-reviews.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {decodeReviewFeed,reviewDraftError,findReviews,visibleReviewSummary}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const item={id:'a'.repeat(64),rating:4,text:'Forest path with wet steps.',visitedOn:'2026-10-01',conditions:['wet'],authorName:'Trekker',updatedAt:'2026-10-18T00:00:00Z',status:'published'};
test('shared review feed accepts published content and a private pending own review',()=>{
 assert.equal(decodeReviewFeed({reviews:[item],mine:{...item,status:'pending'},limit:20}).reviews.length,1);
 assert.deepEqual(decodeReviewFeed({reviews:[],mine:null,limit:20}).reviews,[]);
});
test('review decoder rejects malformed or unpublished shared content',()=>{
 for(const change of [{rating:0},{status:'pending'},{conditions:['safe']},{visitedOn:'2026-02-30'},{updatedAt:'bad'}]) assert.throws(()=>decodeReviewFeed({reviews:[{...item,...change}],mine:null,limit:20}));
 assert.throws(()=>decodeReviewFeed({reviews:Array(21).fill(item),mine:null,limit:20}));
});
test('review draft checks date, rating and meaningful text before submission',()=>{
 assert.equal(reviewDraftError(4,item.text,'2026-10-01','2026-10-18'),'');
 for(const args of [[0,item.text,'2026-10-01'],[4,'short','2026-10-01'],[4,item.text,'2026-10-19'],[4,item.text,'2026-02-30']]) assert.ok(reviewDraftError(...args,'2026-10-18'));
});

test('review search and rating summaries exclude private pending feedback',()=>{
 const rows=[item,{...item,id:'b'.repeat(64),text:'Dry and quiet forest.',conditions:['quiet'],rating:5},{...item,status:'pending',rating:1}];
 assert.equal(findReviews(rows,'wet forest','wet').length,1);
 assert.equal(findReviews(rows,'','quiet').length,1);
 assert.equal(findReviews(rows,'snow').length,0);
 assert.deepEqual(visibleReviewSummary(rows),{count:2,average:4.5});
 assert.deepEqual(visibleReviewSummary([]),{count:0,average:null});
 assert.equal(rows.length,3);
});
