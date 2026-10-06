import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
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
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'Server Firebase credentials are unavailable.' });
  });
  await withFetch(async () => new Response('<html>proxy error</html>', { status: 502 }), async () => {
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'Navo received an unexpected server reply. Please try again.' });
  });
  await withFetch(async () => new Response('null', { status: 500 }), async () => {
    await assert.rejects(requestAPI(async () => 'token', '/chat', {}), { message: 'The server rejected this request. Check your inputs and try again.' });
  });
});
test('working requests preserve authenticated route and payload', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'http://test.local:8000/chat'); assert.equal(options.headers.Authorization, 'Bearer user-token'); assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), { messages: [] });
    return new Response(JSON.stringify({ reply: 'Hello' }));
  }, async () => assert.deepEqual(await requestAPI(async () => 'user-token', '/chat', { messages: [] }), { reply: 'Hello' }));
});


test('chat sends loaded email metadata without a Firebase bearer token', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'http://test.local:8000/chat');
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { messages: [{ role: 'user', content: 'Hi' }], email: 'trekker@example.com' });
    return new Response(JSON.stringify({ reply: 'Hello' }));
  }, async () => assert.deepEqual(await requestChatAPI([{ role: 'user', content: 'Hi' }], 'trekker@example.com'), { reply: 'Hello' }));
});
