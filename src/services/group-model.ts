import type { AlertEvent, AlertKind, GroupMember, TrekGroup } from '@/types/navo';

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const ALERT_COPY: Record<AlertKind, { label: string; hint: string; headline: string }> = {
  sos: {
    label: 'Emergency',
    headline: 'EMERGENCY SIGNAL',
    hint: 'Plays a loud siren on every device in the group and shares your last known position.',
  },
  'off-route': {
    label: 'Off route',
    headline: 'SOMEONE LEFT THE TRAIL',
    hint: 'Raised when a member drifts away from the planned corridor.',
  },
  weather: {
    label: 'Weather',
    headline: 'WEATHER WARNING',
    hint: 'Shared with the whole group so everyone can shelter early.',
  },
  'check-in': {
    label: 'Check-in',
    headline: 'CHECK-IN MISSED',
    hint: 'A member did not confirm they are safe on time.',
  },
};

export function describeAlert(kind: AlertKind) {
  return ALERT_COPY[kind];
}

export function alertHeadline(alert: AlertEvent) {
  return describeAlert(alert.kind).headline;
}

export function isAlertActive(alert: AlertEvent) {
  return alert.resolvedAt === null;
}

export function acknowledgeAlert(alert: AlertEvent, memberId: string): AlertEvent {
  if (alert.acknowledgedBy.includes(memberId)) return alert;
  return { ...alert, acknowledgedBy: [...alert.acknowledgedBy, memberId] };
}

export function resolveAlert(alert: AlertEvent, at = new Date().toISOString()): AlertEvent {
  return { ...alert, resolvedAt: alert.resolvedAt ?? at };
}

export function validateGroupName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Give your group a name of at least 2 characters.';
  if (trimmed.length > 40) return 'Keep the group name under 40 characters.';
  return '';
}

export function validateMemberName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Enter the member’s name.';
  if (trimmed.length > 60) return 'That name is too long.';
  return '';
}

export function activeMembers(group: TrekGroup) {
  return group.members.filter(member => member.status === 'active');
}

export function pendingInvites(group: TrekGroup) {
  return group.members.filter(member => member.status === 'invited');
}

export function ownerOf(group: TrekGroup) {
  return group.members.find(member => member.id === group.ownerId) ?? null;
}

export function isLeader(group: TrekGroup, memberId: string) {
  const member = group.members.find(candidate => candidate.id === memberId);
  return Boolean(member && member.role === 'leader');
}

export function createGroup(input: {
  name: string;
  trekId: string;
  startDate: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
}): TrekGroup {
  const now = new Date().toISOString();
  const leader: GroupMember = {
    id: input.ownerId,
    name: input.ownerName.trim() || 'You',
    email: input.ownerEmail,
    role: 'leader',
    status: 'active',
    joinedAt: now,
  };
  return {
    id: newId('grp'),
    name: input.name.trim(),
    trekId: input.trekId,
    startDate: input.startDate,
    ownerId: input.ownerId,
    members: [leader],
    createdAt: now,
  };
}

export function acceptInvite(group: TrekGroup, memberId: string): TrekGroup {
  return {
    ...group,
    members: group.members.map(member => member.id === memberId
      ? { ...member, status: 'active' as const, joinedAt: new Date().toISOString() }
      : member),
  };
}

export function inviteMember(group: TrekGroup, input: { name: string; email: string }): { group?: TrekGroup; error?: string } {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const nameError = validateMemberName(name);
  if (nameError) return { error: nameError };
  const taken = group.members.some(member => (member.email ?? '').toLowerCase() === email);
  if (taken) return { error: `${name} is already in this group.` };
  const member: GroupMember = {
    id: newId('mbr'),
    name,
    email,
    role: 'member',
    status: 'invited',
    joinedAt: new Date().toISOString(),
  };
  return { group: { ...group, members: [...group.members, member] } };
}

export function removeMember(group: TrekGroup, memberId: string): { group?: TrekGroup; error?: string } {
  if (memberId === group.ownerId) return { error: 'The group creator can’t be removed.' };
  const next = group.members.filter(member => member.id !== memberId);
  if (next.length === group.members.length) return { error: 'That member is no longer in this group.' };
  return { group: { ...group, members: next } };
}

export function toggleLeader(group: TrekGroup, memberId: string): { group?: TrekGroup; error?: string } {
  if (memberId === group.ownerId) return { error: 'The creator is always a leader.' };
  const target = group.members.find(member => member.id === memberId);
  if (!target) return { error: 'That member is no longer in this group.' };
  const leaders = group.members.filter(member => member.role === 'leader').length;
  if (target.role === 'leader' && leaders <= 1) return { error: 'A group needs at least one leader.' };
  return {
    group: {
      ...group,
      members: group.members.map(member => member.id === memberId
        ? { ...member, role: member.role === 'leader' ? 'member' as const : 'leader' as const }
        : member),
    },
  };
}
