import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = ts.transpileModule(await readFile(new URL('../src/services/profile-details.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { profileDetails } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('details trim whitespace and preserve a formatted contact without touching other profile fields', () => {
  assert.deepEqual(profileDetails({ name: '  Trail User ', contactName: ' Trusted Contact ', phone: ' +977 9800000000 ', email: 'ignored@example.com', goals: ['ignored'] }), { fullName: 'Trail User', emergencyContact: { name: 'Trusted Contact', phone: '+977 9800000000' } });
});
test('both empty contact fields explicitly remove the contact', () => {
  assert.deepEqual(profileDetails({ name: 'Trail User', contactName: ' ', phone: ' ' }), { fullName: 'Trail User', emergencyContact: null });
});
test('partial contacts cannot silently remove or corrupt a saved contact', () => {
  assert.throws(() => profileDetails({ name: 'Trail User', contactName: '', phone: '+9779800000000' }), /name/);
  assert.throws(() => profileDetails({ name: 'Trail User', contactName: 'Contact', phone: '' }), /phone/);
  for (const phone of ['123', '-------', '++9779800000000', '1234567890123456', 'tel:+9779800000000']) assert.throws(() => profileDetails({ name: 'Trail User', contactName: 'Contact', phone }), /phone/);
});
test('names are bounded before any profile update', () => {
  for (const name of ['', ' A ', 'x'.repeat(61)]) assert.throws(() => profileDetails({ name, contactName: '', phone: '' }), /name/);
  assert.throws(() => profileDetails({ name: 'Trail User', contactName: 'x'.repeat(61), phone: '+9779800000000' }), /contact name/);
});
