import { useEffect, useMemo, useState } from 'react';
import { useCloud } from '@/context/CloudContext';
import { apiBase } from '@/lib/api';
import { readJSON, writeJSON } from '@/lib/storage';
import { emptyPreparation, preparationFromStorage } from '@/services/preparation';
import { createPreparationSync, type PreparationState } from '@/services/preparationSync';

export function usePreparation(userId: string, trekId: string) {
  const { api } = useCloud();
  const [deviceOnly, setDeviceOnly] = useState(!apiBase);
  const [state, setState] = useState<PreparationState>({ plan: emptyPreparation, loaded: false, status: 'loading', error: '' });
  const controller = useMemo(() => {
    const key = `${deviceOnly ? 'device-preparation' : 'preparation'}:${userId}:${trekId}`;
    let active = false;
    const sync = createPreparationSync({ read: async () => { const saved = await readJSON(key); if (saved || !deviceOnly) return saved; const previous = preparationFromStorage(await readJSON(`preparation:${userId}:${trekId}`)); return previous ? { plan: previous, pending: false } : null; }, write: value => writeJSON(key, value), fetch: () => deviceOnly ? Promise.resolve(null) : api(`/preparations/${trekId}`, undefined, 'GET'), save: plan => deviceOnly ? Promise.resolve(null) : api(`/preparations/${trekId}`, plan, 'PUT') }, value => { if (active) setState(value); });
    return { sync, start: () => { active = true; void sync.load(); }, stop: () => { active = false; } };
  }, [api, userId, trekId, deviceOnly]);
  useEffect(() => { controller.start(); return controller.stop; }, [controller]);
  return { ...state, deviceOnly, onUseDevice: () => setDeviceOnly(true), change: controller.sync.change, retry: controller.sync.retry };
}
