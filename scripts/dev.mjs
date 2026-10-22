/** Start the app and its local API together. Reuse an API that is already running. */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

function launch(command, args, label) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  children.add(child);
  child.on('error', error => { console.error(`${label} could not start: ${error.message}`); children.delete(child); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code ?? 1); });
  return child;
}
async function apiState() {
  try {
    const response = await fetch('http://127.0.0.1:8000/health', { signal: AbortSignal.timeout(1200) });
    const value = await response.json();
    return response.ok && value.status === 'ok' && value.readinessPath === '/ready' ? 'ready' : 'occupied';
  } catch (error) {
    // A reachable service with a non-JSON health reply owns the port too.
    return error instanceof SyntaxError ? 'occupied' : 'offline';
  }
}
async function main() {
  const envFile = existsSync(resolve(root, '.env')) ? readFileSync(resolve(root, '.env'), 'utf8') : '';
  const localEnv = Object.fromEntries(envFile.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(EXPO_PUBLIC_(?:API|CHAT)_BASE_URL)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
  const bases = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_CHAT_BASE_URL'].map(key => process.env[key] || localEnv[key]).filter(Boolean);
  const needsLocal = bases.length === 0 || bases.some(base => {
    try { const url = new URL(base); return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && (url.port || '80') === '8000'; }
    catch { return false; }
  });
  if (needsLocal) {
    const state = await apiState();
    if (state === 'occupied') throw new Error('Port 8000 is occupied by another service. Stop it before starting Navo.');
    if (state !== 'ready') {
      const python = process.env.NAVO_PYTHON || resolve(root, process.platform === 'win32' ? 'backend/.venv/Scripts/python.exe' : 'backend/.venv/bin/python');
      if (!process.env.NAVO_PYTHON && !existsSync(python)) throw new Error('Set up backend/.venv using the README first, or set NAVO_PYTHON to your Python executable.');
      launch(python, ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '0.0.0.0', '--port', '8000', '--no-access-log'], 'Navo backend');
      let ready = false;
      for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
        if (await apiState() === 'ready') { ready = true; break; }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (stopping) return;
      if (!ready) throw new Error('The backend did not start. Check the backend output above.');
    }
    console.log('Navo backend connected on port 8000.');
  }
  if (!stopping) launch(process.execPath, [resolve(dirname(require.resolve('expo/package.json')), 'bin/cli'), 'start', ...process.argv.slice(2)], 'Expo');
}
main().catch(error => { console.error(error.message); stop(1); });
