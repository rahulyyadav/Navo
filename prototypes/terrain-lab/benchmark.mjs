// CPU microbenchmark, not GPU/rendering evidence. Synthetic stations are not trail data.
import { profileSummary, nearestSample } from './model.mjs';
for(const count of [69,20000]) {
 const samples=Array.from({length:count},(_,i)=>({distanceM:i*10,elevationM:1500+i/100}));
 const summary=profileSummary(samples); let sink=0;
 const old=()=>{for(let j=0;j<1000;j++){const s=profileSummary(samples);const target=s.distance*(j%101)/100;sink+=samples.reduce((b,p)=>Math.abs(p.distanceM-target)<Math.abs(b.distanceM-target)?p:b,samples[0]).distanceM;}};
 const next=()=>{for(let j=0;j<1000;j++)sink+=nearestSample(samples,summary.distance*(j%101)/100).distanceM;};
 old();next();
 function measure(fn){const values=[];for(let i=0;i<7;i++){const start=performance.now();fn();values.push(performance.now()-start);}return values.sort((a,b)=>a-b)[3];}
 console.log(JSON.stringify({stations:count,lookups:1000,medianOf:7,beforeMs:measure(old),afterMs:measure(next),sink}));
}
