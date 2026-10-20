import { useCallback, useEffect, useState } from 'react';
import { chatBase } from '@/lib/api';
import { probeAiStatus, type AiStatus } from '@/services/ai-status';

export function useAiStatus() {
  const [attempt, setAttempt] = useState(0);
  const [probe, setProbe] = useState<{ key: string; status: AiStatus } | null>(null);
  const key = `${chatBase}#${attempt}`;
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!chatBase) return;
    let active = true;
    void probeAiStatus(chatBase).then(status => { if (active) setProbe({ key, status }); });
    return () => { active = false; };
  }, [key]);
  // An untried key is still checking, so the banner never fires on stale results.
  const status: AiStatus = !chatBase ? 'unconfigured' : probe?.key === key ? probe.status : 'checking';
  return { status, retry };
}
