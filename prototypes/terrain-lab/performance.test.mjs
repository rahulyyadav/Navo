import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestSample, profileSummary, profilePath } from './model.mjs';
test('binary station lookup matches scan including ties and endpoints',()=>{
 const samples=Array.from({length:20000},(_,i)=>({distanceM:i*10,elevationM:1500+i/100}));
 for(const target of [-1,0,5,9,125,190005,300000]) {
  const expected=samples.reduce((best,s)=>Math.abs(s.distanceM-target)<Math.abs(best.distanceM-target)?s:best,samples[0]);
  assert.equal(nearestSample(samples,target),expected);
 }
 assert.equal(nearestSample([],2),null);
 assert.equal(nearestSample(samples,NaN),null);
 assert.ok(profilePath(samples));
 assert.equal(profileSummary([...samples,samples.at(-1)]),null);
});
