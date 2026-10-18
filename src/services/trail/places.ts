import { isCoordinate, type Coordinate } from '../places/types';
import { distanceToRoute } from '../route-distance';
export type TrailPlace = Coordinate & { id: string; name: string; kind: 'Rest option' | 'Water point' | 'Toilet' | 'Viewpoint' | 'Mapped caution'; detail: string; source: string; offsetM: number };
export function decodeTrailPlaces(value: unknown, route: Coordinate[]): TrailPlace[] {
  if (value && typeof (value as {remark?:unknown}).remark === 'string') throw Error('The map provider returned an incomplete result. Retry later.');
  if (!value || !Array.isArray((value as {elements?: unknown}).elements)) throw Error('Trail information is incomplete.');
  const result: TrailPlace[] = [];
  for (const item of (value as {elements: {id?: number; type?: string; lat?: number; lon?: number; center?: {lat:number;lon:number}; tags?: Record<string,string>}[]}).elements.slice(0, 1000)) {
    if (!item || !['node','way','relation'].includes(item.type ?? '') || !Number.isSafeInteger(item.id)) continue;
    const point = { latitude: item.lat ?? item.center?.lat, longitude: item.lon ?? item.center?.lon };
    if (!isCoordinate(point)) continue;
    const tags = item.tags ?? {};
    if (tags.access === 'private' || tags.access === 'no') continue;
    const offsetM = distanceToRoute(point, route);
    if (offsetM === null || offsetM > 300) continue;
    const kind: TrailPlace['kind'] | null = tags.hazard ? 'Mapped caution' : tags.amenity === 'drinking_water' ? 'Water point' : tags.amenity === 'toilets' ? 'Toilet' : tags.tourism === 'viewpoint' ? 'Viewpoint' : ['shelter','bench'].includes(tags.amenity) || tags.tourism === 'picnic_site' ? 'Rest option' : null;
    if (!kind) continue;
    result.push({ ...point, id: `${item.type}:${item.id}`, name: String(tags['name:en'] || tags.name || kind).slice(0,120), kind, offsetM,
      detail: kind === 'Mapped caution' ? `Mapped ${String(tags.hazard).replace(/_/g,' ').slice(0,100)}; current conditions unverified.` : kind === 'Water point' ? 'Mapped water point; availability and water quality are unverified.' : 'Mapped nearby; access, opening and suitability must be checked on site.',
      source: `https://www.openstreetmap.org/${item.type}/${item.id}` });
  }
  return result.sort((a,b)=>a.offsetM-b.offsetM).slice(0,40);
}
let retryAfter = 0;
const endpoint = process.env.EXPO_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const cache = new Map<string, {at:number; places:TrailPlace[]}>();
export async function fetchTrailPlaces(route: Coordinate[], signal?: AbortSignal) {
  if (route.length < 2 || route.length > 30000 || !route.every(isCoordinate)) throw Error('Choose a walking route first.');
  const lat = route.map(p=>p.latitude), lon = route.map(p=>p.longitude);
  const south=Math.min(...lat)-.003, north=Math.max(...lat)+.003, west=Math.min(...lon)-.003, east=Math.max(...lon)+.003;
  if (north-south > .4 || east-west > .4) throw Error('Choose a shorter daily stage to find nearby facilities.');
  const box = [south,west,north,east].map(v=>v.toFixed(5)).join(',');
  const cached = cache.get(box);
  if (cached && Date.now()-cached.at < 600000) return cached.places.filter(p=>(distanceToRoute(p,route)??Infinity)<=300);
  if(Date.now()<retryAfter) throw Error('Trail information is busy. Wait 30 seconds before trying again. Your route remains available.');
  if(!/^https:\/\//i.test(endpoint)) throw Error('Trail information requires a secure provider connection.');
  const query = `[out:json][timeout:15];(nwr[amenity~"^(shelter|bench|drinking_water|toilets)$"](${box});nwr[tourism~"^(viewpoint|picnic_site)$"](${box});nwr[hazard](${box}););out center 1000;`;
  const controller=new AbortController(); const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort); if(signal?.aborted) controller.abort();
  const timer=setTimeout(abort,20000);
  try {
    const response=await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}).toString(),signal:controller.signal});
    if(!response.ok) {
      if(response.status===406||response.status===429) retryAfter=Date.now()+30000;
      throw Error('The trail information provider is unavailable. Wait 30 seconds and retry. Your route remains available.');
    }
    const places=decodeTrailPlaces(await response.json(),route); cache.set(box,{at:Date.now(),places});
    if(cache.size>10)cache.delete(cache.keys().next().value!);
    return places;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
