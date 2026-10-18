import type { Trek } from '../data/treks';
const normalized=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function discoverTreks(treks:Trek[],query:string,region='All regions',difficulty='Any difficulty') {
  const words=normalized(query.trim()).split(/\s+/).filter(Boolean);
  return treks.filter(trek=>(region==='All regions'||trek.region===region)&&(difficulty==='Any difficulty'||trek.difficulty===difficulty)&&words.every(word=>normalized(`${trek.name} ${trek.region} ${trek.summary} ${trek.route.map(p=>p.name).join(' ')}`).includes(word)));
}

/** Catalog coordinates are a starting suggestion; the routing provider must validate them. */
export function destinationForTrek(trek:Trek):import('./places/types').Place|null {
  const end=trek.route.at(-1);
  if(!end||!Number.isFinite(end.latitude)||Math.abs(end.latitude)>90||!Number.isFinite(end.longitude)||Math.abs(end.longitude)>180)return null;
  return {id:`catalog:${trek.id}`,name:`${trek.name} · ${end.name}`,fullName:`${trek.name} · ${end.name} · approximate planning point`,latitude:end.latitude,longitude:end.longitude,type:'destination',provider:'coordinates'};
}
