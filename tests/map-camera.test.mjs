import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
let source = await readFile(new URL('../src/components/maps/document.ts', import.meta.url),'utf8');
source = source.replace(/import \{ treks, type MapRegion \}[^;]+;/, `type MapRegion = {latitude:number;longitude:number;latitudeDelta:number;longitudeDelta:number};const treks=[{id:'route',name:'Overview',route:[{latitude:28,longitude:84,elevation:100,name:'start'},{latitude:28.01,longitude:84,elevation:200,name:'end'}]}];`).replace(/import \{ colorForTrek \}[^;]+;/, `const colorForTrek=()=> '#E4FF89';`);
const {outputText} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {mapDocument, scriptJSON} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
function harness(){
  const camera = []; const pan=[];
  const layer = ()=>({addTo(){return this},on(){return this},bindPopup(){return this},bindTooltip(){return this},clearLayers(){},setPosition(){}});
  const map={zoomControl:layer(),fitBounds:(...args)=>camera.push(args),panTo:(...args)=>pan.push(args),removeLayer(){},invalidateSize(){}};
  const context={L:{map:()=>map,tileLayer:layer,control:{layers:layer},layerGroup:layer,circleMarker:layer,circle:layer,polyline:layer},document:{getElementById:()=>({style:{},textContent:''}),createElement:()=>({textContent:''})},window:{addEventListener(){}},parent:{postMessage(){}},setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}}};
  const props={region:{latitude:28,longitude:84,latitudeDelta:.2,longitudeDelta:.2},regionNonce:0,selectedId:'route',myCoords:null,onSelectTrek(){}};
  const html=mapDocument(props); const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
  vm.runInNewContext(script,context);return {context,camera,pan,props};
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
