import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { normalizeEmail, validEmail, friendlyAuthError, firebaseErrorCode } = await loadModule('../src/services/auth-errors.ts');

test('email normalizes before validation and rejects malformed addresses', () => {
  assert.equal(normalizeEmail('  Hiker@EXAMPLE.COM  '), 'hiker@example.com');
  assert.ok(validEmail(normalizeEmail('  Hiker@EXAMPLE.COM  ')));
  for (const value of ['', 'abc', 'a@', 'a@b', 'a b@example.com', 'a@@example.com']) assert.equal(validEmail(value), false);
});

test('errors never disclose arbitrary backend details', () => {
  for (const error of [null, undefined, {}, { message: 'private firebase detail' }]) {
    assert.equal(friendlyAuthError(error), 'Something went wrong. Please try again.');
  }
});

test('Firebase codes map to actionable copy', () => {
  assert.match(friendlyAuthError({ code: 'auth/invalid-credential' }), /email or password/);
  assert.match(friendlyAuthError({ code: 'auth/email-already-in-use' }), /Log in instead/);
  assert.match(friendlyAuthError({ code: 'auth/weak-password' }), /stronger password/);
  assert.match(friendlyAuthError({ code: 'auth/popup-blocked' }), /popups/);
  assert.match(friendlyAuthError({ code: 'auth/unauthorized-domain' }), /not authorized/);
  assert.match(friendlyAuthError({ status: 429 }), /Too many attempts/);
  assert.match(friendlyAuthError(new Error('offline')), /offline/);
  assert.match(friendlyAuthError({ message: '', name: 'AbortError' }), /connection/);
});

test('Firebase error codes are extracted without exposing backend messages', () => {
  assert.equal(firebaseErrorCode({ code: 'auth/too-many-requests' }), 'auth/too-many-requests');
  assert.equal(firebaseErrorCode(null), '');
});

const { shouldCompleteSlide } = await loadModule('../src/services/onboarding-slide.ts');
test('onboarding opens only at the end of its slide track', () => {
  assert.equal(shouldCompleteSlide(0, 0), false);
  assert.equal(shouldCompleteSlide(140, 260), false);
  assert.equal(shouldCompleteSlide(220, 260), false);
  assert.equal(shouldCompleteSlide(250, 260), false);
  assert.equal(shouldCompleteSlide(256, 260), true);
  assert.equal(shouldCompleteSlide(260, 260), true);
});

const {
  acknowledgeAlert,
  activeMembers,
  createGroup,
  inviteMember,
  isAlertActive,
  pendingInvites,
  removeMember,
  resolveAlert,
  toggleLeader,
  validateGroupName,
  validateMemberName,
} = await loadModule('../src/services/group-model.ts');

function seedGroup() {
  return createGroup({
    name: '  Annapurna crew  ',
    trekId: 'annapurna-base-camp',
    startDate: '2026-10-04',
    ownerId: 'user_1',
    ownerName: '  Aasha Gurung ',
    ownerEmail: 'Aasha@Example.com',
  });
}

test('a new group starts with its creator as the only leader', () => {
  const group = seedGroup();
  assert.equal(group.name, 'Annapurna crew');
  assert.equal(group.members.length, 1);
  assert.equal(group.members[0].name, 'Aasha Gurung');
  assert.equal(group.members[0].role, 'leader');
  assert.equal(group.members[0].status, 'active');
  assert.equal(activeMembers(group).length, 1);
  assert.equal(pendingInvites(group).length, 0);
});

test('group and member names are validated before use', () => {
  assert.match(validateGroupName(' a '), /at least 2 characters/);
  assert.match(validateGroupName('x'.repeat(41)), /under 40/);
  assert.equal(validateGroupName('Annapurna crew'), '');
  assert.match(validateMemberName('  '), /Enter the member/);
  assert.match(validateMemberName('y'.repeat(61)), /too long/);
  assert.equal(validateMemberName('Pemba Sherpa'), '');
});

test('invites reject duplicates and unknown people cannot be removed twice', () => {
  const group = seedGroup();
  assert.equal(inviteMember(group, { name: 'Pemba', email: 'aasha@example.com' }).error, 'Pemba is already in this group.');
  const invited = inviteMember(group, { name: 'Pemba Sherpa', email: '  PEMBA@Example.com ' });
  assert.equal(invited.error, undefined);
  assert.equal(pendingInvites(invited.group).length, 1);
  assert.equal(invited.group.members[1].email, 'pemba@example.com');
  assert.equal(removeMember(invited.group, 'user_1').error, 'The group creator can’t be removed.');
  const left = removeMember(invited.group, invited.group.members[1].id);
  assert.equal(left.group.members.length, 1);
  assert.match(removeMember(left.group, invited.group.members[1].id).error, /no longer in this group/);
});

test('leadership can move but the creator stays a leader', () => {
  const group = seedGroup();
  assert.match(toggleLeader(group, 'user_1').error, /always a leader/);
  const invited = inviteMember(group, { name: 'Pemba Sherpa', email: 'pemba@example.com' }).group;
  const promoted = toggleLeader(invited, invited.members[1].id).group;
  assert.equal(promoted.members[1].role, 'leader');
  assert.equal(promoted.members.filter(member => member.role === 'leader').length, 2);
  const demoted = toggleLeader(promoted, promoted.members[1].id).group;
  assert.equal(demoted.members[1].role, 'member');
  assert.match(toggleLeader(demoted, 'ghost').error, /no longer in this group/);
});

test('alerts acknowledge once and resolve once', () => {
  const alert = {
    id: 'alr_1',
    groupId: 'grp_1',
    kind: 'sos',
    message: 'Help',
    latitude: 28.1,
    longitude: 84.2,
    acknowledgedBy: [],
    createdAt: '2026-09-28T08:00:00.000Z',
    resolvedAt: null,
  };
  assert.equal(isAlertActive(alert), true);
  const once = acknowledgeAlert(alert, 'user_1');
  const twice = acknowledgeAlert(once, 'user_1');
  assert.deepEqual(twice.acknowledgedBy, ['user_1']);
  const resolved = resolveAlert(once, '2026-09-28T09:00:00.000Z');
  assert.equal(isAlertActive(resolved), false);
  assert.equal(resolveAlert(resolved, '2026-09-28T10:00:00.000Z').resolvedAt, '2026-09-28T09:00:00.000Z');
});

const { elapsedLabel, formatDate, timeAgo } = await loadModule('../src/services/format.ts');

test('timers and relative dates stay readable', () => {
  assert.equal(elapsedLabel(0), '0:00');
  assert.equal(elapsedLabel(65), '1:05');
  assert.equal(elapsedLabel(-12), '0:00');
  assert.equal(timeAgo(new Date().toISOString()), 'just now');
  assert.equal(timeAgo(new Date(Date.now() - 5 * 60 * 1000).toISOString()), '5 min ago');
  assert.equal(timeAgo(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()), '2 days ago');
  assert.equal(formatDate('not-a-date'), 'not-a-date');
  assert.match(formatDate('2026-10-04T00:00:00.000Z'), /2026/);
});

const { normalizePreparation, validDepartureDate, essentials } = await loadModule('../src/services/preparation.ts');
test('preparation restores only known, unique checklist entries', () => {
  assert.deepEqual(normalizePreparation(null), { date: '', notes: '', checked: [], reviewed: [] });
  assert.deepEqual(normalizePreparation({ checked: ['water', 'water', 'not-an-item', 3], notes: 'x'.repeat(2100) }).checked, ['water']);
  assert.equal(normalizePreparation({ notes: 'x'.repeat(2100) }).notes.length, 2000);
  assert.equal(new Set(essentials.map(item => item.id)).size, essentials.length);
});
test('departure dates reject impossible calendar dates', () => {
  for (const value of ['', '2028-02-29', '2026-10-01']) assert.equal(validDepartureDate(value), true);
  for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', 'tomorrow']) assert.equal(validDepartureDate(value), false);
});
