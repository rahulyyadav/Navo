import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/** Match development dotenv precedence without importing server secrets into Expo. */
export function developmentAPI(root, environment = process.env) {
  const values = {};
  for (const file of ['.env', '.env.development', '.env.local', '.env.development.local']) {
    const path = resolve(root, file);
    if (existsSync(path)) Object.assign(values, parseEnv(readFileSync(path, 'utf8')));
  }
  const base = (environment.EXPO_PUBLIC_API_BASE_URL ?? values.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
  if (!base) throw new Error('Set EXPO_PUBLIC_API_BASE_URL in .env.local before starting Navo (local development: http://localhost:8114).');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid EXPO_PUBLIC_API_BASE_URL configuration.');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (local && (url.protocol !== 'http:' || !['','/'].includes(url.pathname))) throw new Error('Local development requires an HTTP API origin without a path.');
  return { local, port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), base };
}
