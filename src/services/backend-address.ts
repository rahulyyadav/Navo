/** Validate before sending a bearer token; never echo an invalid URL or its secrets. */
export function validateBackendAddress(base: string) {
  const address = base.trim().replace(/\/+$/, '');
  if (!address) throw new Error('Navo’s server address is missing. Set EXPO_PUBLIC_API_BASE_URL (or EXPO_PUBLIC_CHAT_BASE_URL for chat) in .env.local, then reload the app or restart Expo.');
  try {
    const url = new URL(address);
    if (!/^https?:\/\//i.test(address) || /[\s\\?#]/.test(address) || !['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    return address;
  } catch {
    throw new Error('Navo’s server address is invalid. Configure an HTTP or HTTPS API base URL without credentials, a query or a fragment in .env.local, then reload the app or restart Expo.');
  }
}

/** Resolve development loopback on a phone without changing a production URL. */
export function resolveBackendAddress(base: string, platform: string, development: boolean, expoHost?: string) {
  base = validateBackendAddress(base);
  if (platform === 'web') return base;
  const url = new URL(base);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return base;
  if (development && expoHost) {
    const host = expoHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    // Expo tunnel hosts do not forward the separate backend port.
    if (/^(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host)) {
      url.hostname = host; return url.toString().replace(/\/$/, '');
    }
  }
  throw new Error('This phone build points to a laptop-only server address. Use Navo on the same Wi-Fi with its development server, or configure a reachable HTTPS backend and rebuild the app.');
}

/** Free preview hosts may need about a minute to wake before serving JSON. */
export function backendRequestTimeout(path: string, base: string) {
  if (path.startsWith('/plans')) return 210000;
  let preview = false;
  try { preview = new URL(base).hostname.endsWith('.onrender.com'); } catch { /* URL validation supplies the useful error separately. */ }
  return preview ? 120000 : path === '/chat' ? 75000 : 20000;
}
