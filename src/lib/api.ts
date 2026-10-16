import { serverErrorMessage } from '../services/server-errors';
import { firebaseAuth } from './firebase';
import { networkEnvironment } from './network-environment';
import { resolveBackendAddress, backendRequestTimeout } from '../services/backend-address';
import type { TrekChatContext } from '@/services/routing/ai-context';
export async function withTimeout<T>(task: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([task, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]); }
  finally { if (timer) clearTimeout(timer); }
}
export const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
export const chatBase = (process.env.EXPO_PUBLIC_CHAT_BASE_URL?.trim() || apiBase).replace(/\/$/, '');
export async function requestAPI<T>(getToken: () => Promise<string | null>, path: string, body?: unknown, method = 'POST'): Promise<T> {
  if (!apiBase) throw new Error('Connect the Navo backend: set EXPO_PUBLIC_API_BASE_URL and restart Expo.');
  const token = await withTimeout(getToken().catch(() => { throw new Error('Could not refresh your sign-in. Check your connection and try again.'); }), 15000, 'Your session could not reconnect. Check your internet and try again.');
  if (!token) throw new Error('Your session expired. Sign in again.');
  return requestJSON<T>(path, body, method, token);
}

export async function requestChatAPI(messages: { role: 'user' | 'assistant'; content: string }[], email: string | null, context?: TrekChatContext) {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error('Sign in to use Navo AI. Your route stays available.');
  const token = await withTimeout(user.getIdToken(), 15000, 'Your sign-in could not reconnect. Please retry.');
  const normalized = email?.trim() ?? '';
  const metadataEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
  const result = await requestJSON<{ reply: string; source?: 'nemotron' | 'safety-rule'; model?: string }>('/chat', { messages, email: metadataEmail, ...(context ? { context } : {}) }, 'POST', token, chatBase);
  if (!result || typeof result.reply !== 'string' || !result.reply.trim()) {
    throw new Error('Navo AI did not return an answer. Your question is still available to retry.');
  }
  return result;
}

async function requestJSON<T>(path: string, body: unknown, method: string, token?: string, base = apiBase) {
  if (!base) throw new Error('Navo AI is unavailable on this connection. Please retry later.');
  const environment = networkEnvironment();
  base = resolveBackendAddress(base, environment.platform, environment.development, environment.expoHost);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), backendRequestTimeout(path, base));
  try {
    let response: Response;
    try {
      response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw new Error('The request timed out. Check your connection and retry.');
      throw new Error('Could not connect to Navo. Check your connection and try again.');
    }
    let result;
    try { result = await response.json(); }
    catch { throw new Error(response.ok ? 'Navo received an unexpected server reply. Please try again.' : serverErrorMessage(response.status)); }
    if (!response.ok) throw new Error(serverErrorMessage(response.status, result?.detail));
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Check your connection and retry.');
    if (error instanceof TypeError) throw new Error('Could not reach Navo. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export function actionError(error: unknown) { return error instanceof Error ? error.message : 'Could not complete the action. Please try again.'; }
export function requestId() { return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
