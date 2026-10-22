import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
let source = await readFile(new URL('../src/components/maps/document.ts', import.meta.url),'utf8');
source = source.replace(/import \{ outdoorTiles[^;]+;/, "const outdoorTiles='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';const outdoorAttribution='OpenTopoMap';const satelliteTiles='';const satelliteAttribution='';const validTileTemplate=()=>true;");
source = source.replace(/import \{ treks, cumulativeKm, type MapRegion \}[^;]+;/, `type MapRegion = {latitude:number;longitude:number;latitudeDelta:number;longitudeDelta:number};const treks=[{id:'route',name:'Overview',route:[{latitude:28,longitude:84,elevation:100,name:'start'},{latitude:28.01,longitude:84,elevation:200,name:'end'}]}];const cumulativeKm=(route)=>route.map((_,index)=>index*0.5);`).replace(/import \{ colorForTrek \}[^;]+;/, `const colorForTrek=()=> '#E4FF89';`);
const {outputText} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {mapDocument, scriptJSON} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
function harness(overrides){
  const camera = []; const pan=[]; const popups=[]; const tooltips=[];
  const layer = ()=>({addTo(){return this},on(){return this},bindPopup(t){popups.push(t);return this},bindTooltip(t){tooltips.push(t);return this},clearLayers(){},setLatLng(){return this},setRadius(){return this},setPosition(){}});
  const map={on(){},hasLayer(){return true},zoomControl:layer(),fitBounds:(...args)=>camera.push(args),panTo:(...args)=>pan.push(args),removeLayer(){},invalidateSize(){}};
  const context={L:{map:()=>map,tileLayer:layer,control:{layers:layer,scale:layer},layerGroup:layer,circleMarker:layer,circle:layer,polyline:layer},document:{getElementById:()=>({style:{},textContent:''}),createElement:()=>({textContent:''})},window:{addEventListener(){}},parent:{postMessage(){}},setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}}};
  const props={region:{latitude:28,longitude:84,latitudeDelta:.2,longitudeDelta:.2},regionNonce:0,selectedId:'route',myCoords:null,onSelectTrek(){},...overrides};
  const html=mapDocument(props); const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
  vm.runInNewContext(script,context);return {context,camera,pan,popups,tooltips,props};
}
test('GPS redraws preserve the panned map; explicit camera commands and following still work',()=>{
 const {context,camera,pan,props}=harness();
 assert.equal(camera.length,1);
 context.window.updateNavoMap({...props,myCoords:{latitude:28.001,longitude:84,accuracy:5}});
 assert.equal(camera.length,1);
 context.window.updateNavoMap({...props,regionNonce:1});assert.equal(camera.length,2);
 context.window.updateNavoMap({...props,regionNonce:1,followUser:true,myCoords:{latitude:28.002,longitude:84,accuracy:5}});
 assert.equal(camera.length,2);assert.equal(pan.length,1);
});
test('map data cannot close its inline script',()=>assert.equal(scriptJSON('</script><script>bad</script>').includes('</script>'),false));
test('a selected route labels every waypoint with how far it sits along the walk',()=>{
 const {popups,tooltips}=harness();
 assert.deepEqual(popups.map(p=>p.textContent),[
  'Overview · start · approx. 100 m · 0.0 km along the route',
  'Overview · end · approx. 200 m · 0.5 km along the route',
 ]);
 assert.ok(tooltips.includes('start · 0.0 km'),'waypoint tooltip carries distance');
 assert.ok(tooltips.includes('end · 0.5 km'));
 assert.ok(tooltips.includes('Illustrative waypoint connections — not a navigation track'));
});
test('an unselected overview keeps one endpoint marker and still states its distance',()=>{
 const {popups,tooltips}=harness({selectedId:null});
 assert.deepEqual(popups.map(p=>p.textContent),['Overview · end · approx. 200 m · 0.5 km along the route']);
 assert.deepEqual(tooltips,[],'only a selected route gets per-waypoint distance tips');
});
