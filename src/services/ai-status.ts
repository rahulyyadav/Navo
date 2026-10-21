import { resolveBackendAddress, validateBackendAddress } from './backend-address';

export type AiStatus = 'checking' | 'online' | 'model-missing' | 'storage-unavailable' | 'unreachable' | 'unconfigured';
export type AiTone = 'ok' | 'warn' | 'bad';
export type AiStatusCopy = { label: string; title: string; detail: string; hint: string; tone: AiTone };

/** Classify a `/health` probe. `base` empty means the build has no AI address at all. */
export function classifyAiHealth(base: string, health: { ok: boolean; aiConfigured?: unknown } | null): AiStatus {
  if (!base.trim()) return 'unconfigured';
  if (!health?.ok) return 'unreachable';
  return health.aiConfigured === true ? 'online' : 'model-missing';
}

/** `detail` is safe for any user; `hint` names the fix and is only shown in development builds. */
export function aiStatusCopy(status: AiStatus): AiStatusCopy {
  switch (status) {
    case 'online':
      return { label: 'Service ready', title: 'Navo AI is ready to connect', detail: 'The model is configured and account storage is reachable. Send a question to request an answer.', hint: '', tone: 'ok' };
    case 'storage-unavailable':
      return { label: 'Account sync unavailable', title: 'The AI service needs its account connection', detail: 'The model is configured, but account storage readiness could not be confirmed. Your question is kept for retry.', hint: 'Check /ready, Firebase Admin credentials, project access and Firestore setup on the backend.', tone: 'bad' };
    case 'model-missing':
      return {
        label: 'Model key missing',
        title: 'The AI service answered, but has no model key',
        detail: 'Navo’s AI service is running but cannot call a model yet, so it cannot answer. Your message stays in the input.',
        hint: 'Set NEBIUS_API_KEY and a Nemotron model ID in backend/.env, then restart the backend.',
        tone: 'warn',
      };
    case 'unreachable':
      return {
        label: 'AI offline',
        title: 'Navo AI cannot reach its service',
        detail: 'The connection check did not finish. Check your connection or retry while the service wakes up. Your message stays in the input.',
        hint: 'Start the backend that EXPO_PUBLIC_CHAT_BASE_URL points to, then tap Retry.',
        tone: 'bad',
      };
    case 'unconfigured':
      return {
        label: 'Not configured',
        title: 'This build has no AI service address',
        detail: 'Chat needs an AI service address before it can send anything.',
        hint: 'Set EXPO_PUBLIC_CHAT_BASE_URL or EXPO_PUBLIC_API_BASE_URL in .env.local, then restart Expo.',
        tone: 'bad',
      };
    default:
      return { label: 'Checking…', title: 'Checking the AI connection', detail: '', hint: '', tone: 'ok' };
  }
}

export async function probeAiStatus(base: string, timeoutMs = 6000, environment?: { platform: string; development: boolean; expoHost?: string }): Promise<AiStatus> {
  if (!base.trim()) return classifyAiHealth('', null);
  let trimmed: string;
  try {
    trimmed = environment ? resolveBackendAddress(base, environment.platform, environment.development, environment.expoHost) : validateBackendAddress(base);
  } catch { return 'unconfigured'; }
  const controller = new AbortController();
  let modelConfigured = false;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${trimmed}/health`, { signal: controller.signal });
    if (!response.ok) return classifyAiHealth(trimmed, { ok: false });
    const body = (await response.json().catch(() => null)) as { aiConfigured?: unknown } | null;
    const configured = classifyAiHealth(trimmed, { ok: true, aiConfigured: body?.aiConfigured });
    if (configured !== 'online') return configured;
    modelConfigured = true;
    const ready = await fetch(`${trimmed}/ready`, { signal: controller.signal });
    const readiness = await ready.json().catch(() => null) as {ready?:unknown} | null;
    return ready.ok && readiness?.ready === true ? 'online' : 'storage-unavailable';
  } catch {
    return modelConfigured ? 'storage-unavailable' : classifyAiHealth(trimmed, null);
  } finally {
    clearTimeout(timer);
  }
}
