import { readJSON, writeJSON } from '@/lib/storage';
import type { AlertEvent, AlertKind, TrekGroup } from '@/types/navo';
import { newId } from './group-model';

const groupsKey = (userId: string) => `groups:${userId}`;
const alertsKey = (groupId: string) => `alerts:${groupId}`;

export async function loadGroups(userId: string): Promise<TrekGroup[]> {
  const groups = await readJSON<TrekGroup[]>(groupsKey(userId));
  return Array.isArray(groups) ? groups : [];
}

export async function saveGroups(userId: string, groups: TrekGroup[]): Promise<void> {
  await writeJSON(groupsKey(userId), groups);
}

export async function loadAlerts(groupId: string): Promise<AlertEvent[]> {
  const alerts = await readJSON<AlertEvent[]>(alertsKey(groupId));
  return Array.isArray(alerts) ? alerts : [];
}

export async function saveAlerts(groupId: string, alerts: AlertEvent[]): Promise<void> {
  await writeJSON(alertsKey(groupId), alerts);
}

export async function raiseAlert(input: {
  groupId: string;
  kind: AlertKind;
  message: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<AlertEvent> {
  const alert: AlertEvent = {
    id: newId('alr'),
    groupId: input.groupId,
    kind: input.kind,
    message: input.message,
    latitude: input.latitude,
    longitude: input.longitude,
    acknowledgedBy: [],
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const existing = await loadAlerts(input.groupId);
  await saveAlerts(input.groupId, [alert, ...existing].slice(0, 50));
  return alert;
}
