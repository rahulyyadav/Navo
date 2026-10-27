import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { developmentAPI } from '../scripts/dev-config.mjs';
test('development launcher uses local override and actual API port, not chat or port 8000',()=>{
 const root=mkdtempSync(join(tmpdir(),'navo-dev-'));
 try {
 writeFileSync(join(root,'.env'),'EXPO_PUBLIC_API_BASE_URL=http://localhost:8000');
 writeFileSync(join(root,'.env.local'),'EXPO_PUBLIC_API_BASE_URL=http://localhost:8114\nEXPO_PUBLIC_CHAT_BASE_URL=https://chat.example.com');
 assert.equal(developmentAPI(root,{}).port,8114);
 assert.equal(developmentAPI(root,{EXPO_PUBLIC_API_BASE_URL:'https://api.example.com'}).local,false);
 assert.throws(()=>developmentAPI(root,{EXPO_PUBLIC_API_BASE_URL:''}),/Set EXPO_PUBLIC/);
 }finally{rmSync(root,{recursive:true});}
});
