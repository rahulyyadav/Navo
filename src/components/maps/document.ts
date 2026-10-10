import type { Coords } from '@/hooks/useMyLocation';
import { treks, type MapRegion } from '@/data/treks';
import { colorForTrek } from '@/data/map-style';

export type NepalMapProps = {
  region: MapRegion;
  regionNonce: number;
  selectedId: string | null;
  onSelectTrek: (id: string) => void;
  myCoords: Coords | null;
  walkingRoutes?: { id: string; geometry: { latitude: number; longitude: number }[] }[];
  walkingRouteId?: string;
  endpoints?: { start?: { latitude: number; longitude: number }; end: { latitude: number; longitude: number } };
  onSelectCoordinate?: (point: { latitude: number; longitude: number }) => void;
  importedSegments?: { latitude: number; longitude: number }[][];
  interactive?: boolean;
  followUser?: boolean;
  positions?: { id: string; name: string; latitude: number; longitude: number; recordedAt: string; alert?: boolean }[];
};
export const mapPayload = ({ region, regionNonce, selectedId, myCoords, followUser, positions = [], importedSegments = [], walkingRoutes = [], walkingRouteId, endpoints }: NepalMapProps) => ({ region, regionNonce, selectedId, myCoords, followUser, positions, importedSegments, walkingRoutes, walkingRouteId, endpoints });
// Escape script terminators even if future route data comes from a remote source.
export const scriptJSON = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function mapDocument(props: NepalMapProps) {
  const data = treks.map(t => ({ id: t.id, name: t.name, color: colorForTrek(t.id), points: t.route }));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>html,body,#map{height:100%;width:100%;margin:0;background:#19293a;font-family:system-ui}#status{position:absolute;z-index:1000;left:12px;right:12px;top:12px;background:#0d141a;color:white;padding:12px;border-radius:12px;font-size:13px}button{padding:8px;margin-left:8px}.leaflet-control-attribution{font-size:10px!important}.leaflet-popup-content{line-height:1.5}.leaflet-control-layers{font-size:14px}.leaflet-control-zoom a{width:44px!important;height:44px!important;line-height:44px!important}.leaflet-control-layers-toggle{width:44px!important;height:44px!important}.leaflet-control-layers label{padding:6px 0}</style></head><body><div id="map" aria-label="Interactive Nepal map"></div><div id="status" role="status">Loading online map…</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script><script>
const status=document.getElementById('status');
let timeout=setTimeout(()=>{status.style.display='block';status.textContent='Map unavailable. Check your connection and reopen the map.'},15000);
function notify(id){const value=JSON.stringify({type:'select-trek',id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(value);else parent.postMessage(value,'*')}
if(typeof L==='undefined'){clearTimeout(timeout);status.textContent='Map could not load. Check your connection and reopen the map.'}else{
const interactive=${props.interactive !== false};
const map=L.map('map',{zoomControl:interactive,dragging:interactive,scrollWheelZoom:interactive,touchZoom:interactive,doubleClickZoom:interactive,keyboard:interactive,attributionControl:true});
if(interactive)map.zoomControl.setPosition('bottomleft');
const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}).addTo(map);
const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'&copy; OpenStreetMap, SRTM | <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)'});
function loading(){clearTimeout(timeout);status.style.display='block';status.textContent='Loading map tiles…';timeout=setTimeout(()=>{status.style.display='block';status.textContent='Tiles are taking longer than expected. Check your connection or try the other layer.'},15000)}
function loaded(){clearTimeout(timeout);status.style.display='none'}
map.on('baselayerchange',loading);
for(const layer of [osm,topo]){layer.on('tileload',()=>{if(map.hasLayer(layer))loaded()});layer.on('tileerror',()=>{status.style.display='block';status.textContent='Some tiles are unavailable. Try the other map layer or check your connection.'})}
if(interactive)L.control.layers({'Trails & places':osm,'Terrain / contours':topo},null,{collapsed:true}).addTo(map);
const data=${scriptJSON(data)};
map.on('click',event=>{const value=JSON.stringify({type:'select-coordinate',latitude:event.latlng.lat,longitude:event.latlng.lng});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(value);else parent.postMessage(value,'*')});
const markers=L.layerGroup().addTo(map);let position;let lastCamera=null;
window.updateNavoPosition=function(payload){
 if(position)map.removeLayer(position);
 if(payload.myCoords){const p=payload.myCoords;position=L.circle([p.latitude,p.longitude],{radius:Math.max(p.accuracy||10,10),color:'#168de2',fillOpacity:.25}).addTo(map);position.bindTooltip('Your GPS position')}
 if(payload.followUser && payload.myCoords){const p=payload.myCoords;map.panTo([p.latitude,p.longitude],{animate:true,duration:.8});}
};
window.updateNavoMap=function(payload){
 markers.clearLayers();
 for(const route of (payload.walkingRoutes||[])){const selected=route.id===payload.walkingRouteId;const line=route.geometry.map(p=>[p.latitude,p.longitude]);L.polyline(line,{color:'#19293A',weight:selected?8:5,opacity:selected?.85:.4}).addTo(markers);L.polyline(line,{color:selected?'#E4FF89':'#168DE2',weight:selected?4:3,opacity:selected?1:.7}).addTo(markers).bindTooltip(selected?'Selected route':'Alternative route');}
 if(payload.endpoints){const e=payload.endpoints;if(e.start)L.circleMarker([e.start.latitude,e.start.longitude],{radius:8,color:'#9BE89B',fillOpacity:1}).addTo(markers).bindTooltip('Routed start');L.circleMarker([e.end.latitude,e.end.longitude],{radius:8,color:'#FF9D8A',fillOpacity:1}).addTo(markers).bindTooltip(payload.walkingRoutes?.length?'Routed endpoint':'Selected destination');}
 for(const segment of (payload.importedSegments||[])){L.polyline(segment.map(p=>[p.latitude,p.longitude]),{color:'#E4FF89',weight:4}).addTo(markers).bindTooltip('Imported GPX — not verified');}
 for(const trek of ((payload.importedSegments?.length||payload.walkingRoutes?.length||payload.endpoints)?[]:data)){
 const selected=payload.selectedId===trek.id;
 if(selected)L.polyline(trek.points.map(p=>[p.latitude,p.longitude]),{color:trek.color,weight:2,opacity:.55,dashArray:'5 10'}).addTo(markers).bindTooltip('Illustrative waypoint connections — not a navigation track');
 const points=selected?trek.points:[trek.points[trek.points.length-1]];
 for(const point of points){const content=document.createElement('div');content.textContent=trek.name+' · '+point.name+' · approx. '+point.elevation+' m';
 const marker=L.circleMarker([point.latitude,point.longitude],{radius:selected?7:9,color:trek.color,fillColor:trek.color,fillOpacity:.8,weight:2}).addTo(markers).bindPopup(content);
 marker.on('click',()=>notify(trek.id));}
 }
 for(const point of (payload.positions||[])){
  const label=document.createElement('div');label.textContent=point.name+' · last shared '+point.recordedAt+' (not live tracking)';
  L.circleMarker([point.latitude,point.longitude],{radius:10,color:point.alert?'#ff6f61':'#168de2',fillOpacity:.8}).addTo(markers).bindPopup(label);
 }
 const r=payload.region;const camera=JSON.stringify([payload.regionNonce, payload.selectedId,payload.walkingRouteId]);
 if(camera!==lastCamera){lastCamera=camera;map.fitBounds([[r.latitude-r.latitudeDelta/2,r.longitude-r.longitudeDelta/2],[r.latitude+r.latitudeDelta/2,r.longitude+r.longitudeDelta/2]],{padding:[30,30],animate:false});}
 if(Object.prototype.hasOwnProperty.call(payload,'myCoords'))window.updateNavoPosition(payload);
};
window.addEventListener('message',event=>{if(event.source!==parent)return;try{const msg=JSON.parse(event.data);if(msg.type==='navo-update')window.updateNavoMap(msg.payload);else if(msg.type==='navo-position')window.updateNavoPosition(msg.payload)}catch{}});
window.updateNavoMap(${scriptJSON(mapPayload(props))});
window.updateNavoPosition(${scriptJSON({myCoords:props.myCoords,followUser:props.followUser})});
new ResizeObserver(()=>map.invalidateSize()).observe(document.getElementById('map'));
}
</script></body></html>`;
}
