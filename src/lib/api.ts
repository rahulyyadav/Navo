export async function withTimeout<T>(task: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([task, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]); }
  finally { if (timer) clearTimeout(timer); }
}
export const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
export async function requestAPI<T>(getToken: () => Promise<string | null>, path: string, body?: unknown, method = 'POST'): Promise<T> {
  if (!apiBase) throw new Error('Connect the Navo backend: set EXPO_PUBLIC_API_BASE_URL and restart Expo.');
  const token = await withTimeout(getToken(), 15000, 'Your session could not reconnect. Check your internet and try again.');
  if (!token) throw new Error('Your session expired. Sign in again.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), path.startsWith('/plans') ? 210000 : 20000);
  try {
    const response = await fetch(apiBase + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'The server rejected this request. Check your inputs and try again.');
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Check your connection and retry.');
    if (error instanceof TypeError) throw new Error('Could not reach Navo. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export function actionError(error: unknown) { return error instanceof Error ? error.message : 'Could not complete the action. Please try again.'; }
export function requestId() { return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
