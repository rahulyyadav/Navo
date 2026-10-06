// Generates the production map document with labelled test controls, outside app routes.
const ts=require('typescript'); const fs=require('fs'); const path=require('path');
const cache=new Map();
function load(file) {
  file=path.resolve(file); if(cache.has(file)) return cache.get(file);
  if(/\.(jpg|png)$/.test(file)) return file;
  const result={exports:{}}; cache.set(file,result.exports);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',js)(name=>load(name.startsWith('@/') ? path.join('src',name.slice(2)+'.ts') : path.resolve(path.dirname(file),name+(path.extname(name)?'':'.ts'))),result,result.exports);
  return result.exports;
}
const {mapDocument,scriptJSON}=load('src/components/maps/document.ts');
const {treks,NEPAL_REGION,regionForTrek}=load('src/data/treks.ts');
const props={region:NEPAL_REGION,regionNonce:0,selectedId:null,myCoords:null};
const options=treks.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
const controls=`<aside style="position:absolute;bottom:34px;left:12px;z-index:1100;background:#19293a;color:white;padding:10px;border-radius:12px;font:13px system-ui"><label>Component test · approximate waypoints <select aria-label="Select test trek" id="test-route"><option value="">All Nepal</option>${options}</select></label></aside><script>const routes=${scriptJSON(treks.map(t=>({id:t.id,region:regionForTrek(t)})))};let testNonce=0;document.getElementById('test-route').addEventListener('change',event=>{const route=routes.find(r=>r.id===event.target.value);window.updateNavoMap({...${scriptJSON(props)},region:route?route.region:${scriptJSON(NEPAL_REGION)},selectedId:route?route.id:null,regionNonce:++testNonce})});</script>`;
fs.mkdirSync('output/map-check',{recursive:true}); fs.writeFileSync('output/map-check/index.html',mapDocument(props).replace('</body>',controls+'</body>')); console.log('Generated output/map-check/index.html from the current production map document.');
