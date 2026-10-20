import {existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const read=path=>existsSync(path)?parseEnv(readFileSync(path,'utf8')):{};
const env={...read('.env'),...read('.env.local'),...process.env};
let failed=false;
async function check(label,base) {
 if(!base?.trim()){console.error(`${label}: no service address configured.`);failed=true;return;}
 let root;
 try{root=new URL(base.trim());if(!['http:','https:'].includes(root.protocol)||root.username||root.password||root.search||root.hash)throw Error();}
 catch{console.error(`${label}: invalid service address.`);failed=true;return;}
 const address=root.href.replace(/\/$/,'');
 try {
  const health=await fetch(address+'/health',{signal:AbortSignal.timeout(10000)});
  const status=await health.json();
  if(!health.ok||status?.status!=='ok')throw Error();
  console.log(`${label}: process responding; model ${status.aiConfigured===true?'configured':'not configured'}.`);
  const ready=await fetch(address+'/ready',{signal:AbortSignal.timeout(15000)});
  const result=await ready.json();
  if(!ready.ok||result?.ready!==true){console.error(`${label}: account storage is NOT ready. Check server Firebase credentials, project access and Firestore setup.`);failed=true;return;}
  console.log(`${label}: account storage ready. Authenticated user flows still need live verification.`);
  if(status.aiConfigured!==true){console.error(`${label}: AI configuration is incomplete.`);failed=true;}
 }catch{console.error(`${label}: health/readiness check failed or timed out. No credentials or server response bodies were logged.`);failed=true;}
}
const main=env.EXPO_PUBLIC_API_BASE_URL,chat=env.EXPO_PUBLIC_CHAT_BASE_URL||main;
await check('Main backend',main);
if(chat!==main)await check('Chat backend',chat);
process.exitCode=failed?1:0;
