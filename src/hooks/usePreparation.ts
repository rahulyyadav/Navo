import { useEffect, useMemo, useState } from 'react';
import { useCloud } from '@/context/CloudContext';
import { readJSON, writeJSON } from '@/lib/storage';
import { emptyPreparation } from '@/services/preparation';
import { createPreparationSync, type PreparationState } from '@/services/preparationSync';

export function usePreparation(userId: string, trekId: string) {
  const { api } = useCloud();
  const [state, setState] = useState<PreparationState>({ plan: emptyPreparation, loaded: false, status: 'loading', error: '' });
  const controller = useMemo(() => {
    const key = `preparation:${userId}:${trekId}`;
    return createPreparationSync({ read: () => readJSON(key), write: value => writeJSON(key, value), fetch: () => api(`/preparations/${trekId}`, undefined, 'GET'), save: plan => api(`/preparations/${trekId}`, plan, 'PUT') }, setState);
  }, [api, userId, trekId]);
  useEffect(() => { void controller.load(); }, [controller]);
  return { ...state, change: controller.change, retry: controller.retry };
}
