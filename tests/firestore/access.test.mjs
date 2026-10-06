import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

let env;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run this suite with firebase emulators:exec --only firestore --project demo-navo. Never run rules tests against production.');
  env = await initializeTestEnvironment({ projectId:'demo-navo', firestore: { rules: await readFile(new URL('../../firestore.rules',import.meta.url),'utf8') } });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db,'groups/crew'),{memberIds:['alice'],ownerId:'alice'});
    await setDoc(doc(db,'groups/crew/messages/hello'),{text:'private group text'});
    await setDoc(doc(db,'users/alice'),{displayName:'Alice'});
    await setDoc(doc(db,'users/alice/notifications/invite'),{read:false});
    await setDoc(doc(db,'users/alice/deviceTokens/phone'),{token:'test-only'});
    await setDoc(doc(db,'pushJobs/job'),{status:'pending'});
  });
});
after(async () => { await env?.cleanup(); });
const user = (id, verified=true) => env.authenticatedContext(id,{email_verified:verified}).firestore();

test('only a verified member reads group messages',async()=>{
  await assertSucceeds(getDoc(doc(user('alice'),'groups/crew/messages/hello')));
  await assertFails(getDoc(doc(user('bob'),'groups/crew/messages/hello')));
  await assertFails(getDoc(doc(user('alice',false),'groups/crew/messages/hello')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'groups/crew/messages/hello')));
});
test('membership-filtered group query succeeds; unfiltered discovery fails',async()=>{
  await assertSucceeds(getDocs(query(collection(user('alice'),'groups'),where('memberIds','array-contains','alice'))));
  await assertFails(getDocs(collection(user('bob'),'groups')));
});
test('client cannot add itself or forge messages even when owner',async()=>{
  await assertFails(setDoc(doc(user('bob'),'groups/crew'),{memberIds:['bob']}));
  await assertFails(setDoc(doc(user('alice'),'groups/crew/messages/fake'),{text:'forged'}));
});
test('private profile and inbox belong only to the user',async()=>{
  await assertSucceeds(getDoc(doc(user('alice'),'users/alice/notifications/invite')));
  await assertFails(getDoc(doc(user('bob'),'users/alice')));
  await assertFails(setDoc(doc(user('alice'),'users/alice'),{admin:true}));
});
test('push tokens and server jobs are never readable from clients',async()=>{
  await assertFails(getDoc(doc(user('alice'),'users/alice/deviceTokens/phone')));
  await assertFails(getDoc(doc(user('alice'),'pushJobs/job')));
});
test('join requests are leader-only and invitation digests are server-only', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'groups/invites'), { memberIds: ['alice', 'bob'], ownerId: 'alice' });
    await setDoc(doc(ctx.firestore(), 'groups/invites/joinRequests/guest'), { status: 'pending' });
    await setDoc(doc(ctx.firestore(), 'groups/invites/private/joinLink'), { digest: 'test-digest' });
  });
  await assertSucceeds(getDoc(doc(user('alice'), 'groups/invites/joinRequests/guest')));
  await assertFails(getDoc(doc(user('bob'), 'groups/invites/joinRequests/guest')));
  await assertFails(getDoc(doc(user('guest'), 'groups/invites/joinRequests/guest')));
  await assertFails(getDoc(doc(user('alice'), 'groups/invites/private/joinLink')));
});
test('removal revokes subsequent access',async()=>{
  await env.withSecurityRulesDisabled(ctx=>deleteDoc(doc(ctx.firestore(),'groups/crew')));
  await assertFails(getDoc(doc(user('alice'),'groups/crew/messages/hello')));
});
