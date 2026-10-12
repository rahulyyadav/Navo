/** Resolve development loopback on a phone without changing a production URL. */
export function resolveBackendAddress(base: string, platform: string, development: boolean, expoHost?: string) {
  if (!base || platform === 'web') return base;
  let url: URL;
  try { url = new URL(base); } catch { throw new Error('Navo’s server address is invalid. Update the app configuration.'); }
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
