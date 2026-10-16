import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const errorsSource = ts.transpileModule(await readFile(new URL('../src/services/server-errors.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const errorsURL = `data:text/javascript;base64,${Buffer.from(errorsSource).toString('base64')}`;
const originalSource = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const addressSource = ts.transpileModule(await readFile(new URL('../src/services/backend-address.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const addressURL = `data:text/javascript;base64,${Buffer.from(addressSource).toString('base64')}`;
const source = originalSource.replace("'../services/server-errors'", JSON.stringify(errorsURL)).replace("import { firebaseAuth } from './firebase';", "const firebaseAuth = { currentUser: { getIdToken: async () => 'chat-test-token' } };").replace("import { networkEnvironment } from './network-environment';", "const networkEnvironment = () => ({ platform: 'web', development: false });").replace("'../services/backend-address'", JSON.stringify(addressURL));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const oldBase = process.env.EXPO_PUBLIC_API_BASE_URL;
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://test.local:8000';
const { requestAPI, requestChatAPI } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
if (oldBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = oldBase;
async function withFetch(fetch, work) { const original = globalThis.fetch; globalThis.fetch = fetch; try { await work(); } finally { globalThis.fetch = original; } }

test('native network failures produce clean copy without exposing Swift internals', async () => {
  await withFetch(async () => { throw Error('fetch failed: UnexpectedException ExpoModulesCorePromise.swift:56'); }, async () => {
    await assert.rejects(requestAPI(async () => 'test-token', '/chat', {}), { message: 'Could not connect to Navo. Check your connection and try again.' });
  });
});
test('token refresh failures have an actionable message', async () => {
  await assert.rejects(requestAPI(async () => { throw Error('private-token-detail'); }, '/chat', {}), { message: 'Could not refresh your sign-in. Check your connection and try again.' });
});
test('server errors and malformed JSON do not become raw parsing exceptions', async () => {
  await withFetch(async () => new Response(JSON.stringify({ detail: 'Server Firebase credentials are unavailable.' }), { status: 503 }), async () => {
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'Navo’s online service is temporarily unavailable. Retry shortly. Your saved trips and route overview remain available.' });
  });
  await withFetch(async () => new Response('<html>proxy error</html>', { status: 502 }), async () => {
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'Navo’s online service is temporarily unavailable. Retry shortly. Your saved trips and route overview remain available.' });
  });
  await withFetch(async () => new Response('null', { status: 500 }), async () => {
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'Navo’s online service is temporarily unavailable. Retry shortly. Your saved trips and route overview remain available.' });
  });
});
test('working requests preserve authenticated route and payload', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'http://test.local:8000/chat'); assert.equal(options.headers.Authorization, 'Bearer user-token'); assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), { messages: [] });
    return new Response(JSON.stringify({ reply: 'Hello' }));
  }, async () => assert.deepEqual(await requestAPI(async () => 'user-token', '/chat', { messages: [] }), { reply: 'Hello' }));
});


test('chat sends a Firebase bearer token with optional metadata', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'http://test.local:8000/chat');
    assert.equal(options.headers.Authorization, 'Bearer chat-test-token');
    assert.deepEqual(JSON.parse(options.body), { messages: [{ role: 'user', content: 'Hi' }], email: 'trekker@example.com' });
    return new Response(JSON.stringify({ reply: 'Hello' }));
  }, async () => assert.deepEqual(await requestChatAPI([{ role: 'user', content: 'Hi' }], 'trekker@example.com'), { reply: 'Hello' }));
});
test('a chat-only endpoint works while shared services are unconfigured', async () => {
  const previousMain = process.env.EXPO_PUBLIC_API_BASE_URL, previousChat = process.env.EXPO_PUBLIC_CHAT_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = ''; process.env.EXPO_PUBLIC_CHAT_BASE_URL = 'http://chat.local:8004';
  let chat;
  try { chat = await import(`data:text/javascript;base64,${Buffer.from(compiled + '\n// isolated chat endpoint').toString('base64')}`); }
  finally { if(previousMain===undefined)delete process.env.EXPO_PUBLIC_API_BASE_URL;else process.env.EXPO_PUBLIC_API_BASE_URL=previousMain;if(previousChat===undefined)delete process.env.EXPO_PUBLIC_CHAT_BASE_URL;else process.env.EXPO_PUBLIC_CHAT_BASE_URL=previousChat; }
  await withFetch(async (url,options)=>{assert.equal(url,'http://chat.local:8004/chat');assert.equal(options.headers.Authorization,'Bearer chat-test-token');return new Response(JSON.stringify({reply:'A grounded route reply'}));},async()=>assert.deepEqual(await chat.requestChatAPI([{role:'user',content:'How long?'}],null),{reply:'A grounded route reply'}));
});
test('signed-in chat normalizes empty email metadata to null',async()=>{
 await withFetch(async(url,options)=>{assert.equal(JSON.parse(options.body).email,null);return new Response(JSON.stringify({reply:'Hello'}));},async()=>assert.deepEqual(await requestChatAPI([{role:'user',content:'Hi'}],''),{reply:'Hello'}));
});
test('malformed optional email metadata never blocks a route question',async()=>{
 await withFetch(async(url,options)=>{assert.equal(JSON.parse(options.body).email,null);return new Response(JSON.stringify({reply:'Hello'}));},async()=>assert.deepEqual(await requestChatAPI([{role:'user',content:'Hi'}],'No email shared'),{reply:'Hello'}));
});

test('expired sessions and request limits offer specific recovery without retrying mutations', async () => {
 for (const [status, pattern] of [[401,/Sign in again/], [429,/request limit/]]) {
  let calls = 0;
  await withFetch(async () => { calls++; return new Response('<html>proxy response</html>', {status}); }, async () => {
   await assert.rejects(requestAPI(async () => 'token', '/groups', {}), pattern);
   assert.equal(calls, 1);
  });
 }
});

test('an empty successful AI response is an actionable failure, not an empty assistant bubble', async () => {
 for (const result of [null, {}, {reply:''}, {reply:'   '}, {reply:42}]) {
  await withFetch(async () => new Response(JSON.stringify(result)), async () => {
   await assert.rejects(requestChatAPI([{role:'user', content:'Where can I hike?'}], null), /did not return an answer/);
  });
 }
});
