import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
const read = path => existsSync(path) ? parseEnv(readFileSync(path,'utf8')) : {};
const env = { ...read('.env'), ...read('.env.local'), ...process.env };
const issues=[];
for (const key of ['EXPO_PUBLIC_FIREBASE_API_KEY','EXPO_PUBLIC_FIREBASE_PROJECT_ID','EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN','EXPO_PUBLIC_FIREBASE_APP_ID','EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID']) {
  if (!env[key]?.trim()) issues.push(`${key} is missing.`);
}
for (const key of ['EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_PRIVACY_URL']) {
  try { const url=new URL(env[key]); if(url.protocol!=='https:' || /^(localhost|127\.|192\.168\.|10\.)/.test(url.hostname)) throw new Error(); }
  catch { issues.push(`${key} must be a public HTTPS URL.`); }
}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL??'')) issues.push('EXPO_PUBLIC_SUPPORT_EMAIL is missing or invalid.');
if(env.EXPO_PUBLIC_ENABLE_DEMO==='true') issues.push('Disable EXPO_PUBLIC_ENABLE_DEMO for production.');
for(const key of Object.keys(env)) if(key.startsWith('EXPO_PUBLIC_') && /(PRIVATE_KEY|SECRET|NEBIUS_API_KEY|SERVICE_ACCOUNT)/.test(key)) issues.push(`${key} must not be bundled into the app.`);
if(issues.length) { console.error('Production configuration is incomplete:\n'+issues.map(x=>' - '+x).join('\n')); process.exitCode=1; }
else console.log('Public release configuration checks passed. This does not verify service connectivity, store policies or device behavior.');
