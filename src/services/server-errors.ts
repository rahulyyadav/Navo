/** Public recovery messages; never include proxy HTML, credentials or stack traces. */
export function serverErrorMessage(status: number, detail?: unknown): string {
  if (status === 401) return 'Your session expired. Sign in again; your saved trips stay on this device.';
  if (status === 429) return 'Navo has reached its request limit. Wait a while before retrying; your saved routes remain available.';
  if (status >= 500) return 'Navo’s online service is temporarily unavailable. Retry shortly. Your saved trips and route overview remain available.';
  if (typeof detail === 'string' && detail.trim() && detail.length <= 400) return detail;
  return 'The server rejected this request. Check your inputs and try again.';
}
