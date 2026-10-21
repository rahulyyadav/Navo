import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const code = ts.transpileModule(await readFile(new URL('../src/services/backend-address.ts', import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {resolveBackendAddress, backendRequestTimeout, validateBackendAddress} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('phone development resolves laptop loopback only to the private Expo host',()=>{
 assert.equal(resolveBackendAddress('http://localhost:8114','ios',true,'192.168.1.5:8113'),'http://192.168.1.5:8114');
 assert.equal(resolveBackendAddress('https://navo.example.com','ios',true,'192.168.1.5:8113'),'https://navo.example.com');
 assert.equal(resolveBackendAddress('http://localhost:8114','web',true),'http://localhost:8114');
 for(const host of [undefined,'example.exp.direct:443','localhost:8113']) assert.throws(()=>resolveBackendAddress('http://localhost:8114','ios',true,host),/laptop-only/);
 assert.throws(()=>resolveBackendAddress('http://localhost:8114','android',false,'192.168.1.5:8113'),/laptop-only/);
});

test('both browser and native reject malformed or credential-bearing bases without echoing them',()=>{
 for (const base of ['not-a-url', 'ftp://private-marker.test', 'https://private-marker:password@example.test', 'https://example.test?token=private-marker', 'https://example.test#private-marker', 'https://example.test?', 'https:example.test', 'https://example.test/path with spaces']) {
  for (const platform of ['web','ios']) assert.throws(()=>resolveBackendAddress(base,platform,true),error=>/address is invalid/.test(error.message)&&!error.message.includes('private-marker')&&!error.message.includes('password'));
 }
 assert.throws(()=>validateBackendAddress('  '),/EXPO_PUBLIC_API_BASE_URL/);
 assert.equal(validateBackendAddress('  https://api.example.test/v1///  '),'https://api.example.test/v1');
});

test('preview startup has a bounded wakeup window while local failures stay responsive',()=>{
 assert.equal(backendRequestTimeout('/session','https://navo-api.onrender.com'),120000);
 assert.equal(backendRequestTimeout('/chat','https://navo-api.onrender.com'),120000);
 assert.equal(backendRequestTimeout('/session','http://localhost:8114'),20000);
 assert.equal(backendRequestTimeout('/chat','https://navo.example.com'),75000);
 assert.equal(backendRequestTimeout('/plans','https://navo-api.onrender.com'),210000);
});
