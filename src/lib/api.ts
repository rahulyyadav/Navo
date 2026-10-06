export const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
export async function requestAPI<T>(getToken: () => Promise<string | null>, path: string, body?: unknown, method = 'POST'): Promise<T> {
  if (!apiBase) throw new Error('Connect the Navo backend: set EXPO_PUBLIC_API_BASE_URL and restart Expo.');
  const token = await getToken().catch(() => { throw new Error('Could not refresh your sign-in. Check your connection and try again.'); });
  if (!token) throw new Error('Your session expired. Sign in again.');
  return requestJSON<T>(path, body, method, token);
}

export function requestChatAPI(messages: { role: 'user' | 'assistant'; content: string }[], email: string | null) {
  return requestJSON<{ reply: string }>('/chat', { messages, email }, 'POST');
}

async function requestJSON<T>(path: string, body: unknown, method: string, token?: string) {
  if (!apiBase) throw new Error('Connect the Navo backend: set EXPO_PUBLIC_API_BASE_URL and reload Expo.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), path.startsWith('/plans') ? 210000 : path === '/chat' ? 75000 : 20000);
  try {
    let response: Response;
    try {
      response = await fetch(apiBase + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw new Error('The request timed out. Check your connection and retry.');
      throw new Error('Could not connect to Navo. Check your connection and try again.');
    }
    let result;
    try { result = await response.json(); }
    catch { throw new Error('Navo received an unexpected server reply. Please try again.'); }
    if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : 'The server rejected this request. Check your inputs and try again.');
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Check your connection and retry.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export function actionError(error: unknown) { return error instanceof Error ? error.message : 'Could not complete the action. Please try again.'; }
export function requestId() { return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
