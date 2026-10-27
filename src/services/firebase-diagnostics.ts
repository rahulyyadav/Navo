/** Development-only lifecycle evidence. Never pass account IDs, paths or payloads. */
let sequence = 0;
const codes = new Set(['cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded', 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated']);
export function safeFirebaseCode(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : '';
  return typeof code === 'string' && codes.has(code) ? code : 'unclassified';
}
export function traceFirebaseListener(scope: 'profile' | 'groups' | 'notifications' | 'group-feed') {
  const id = ++sequence;
  const enabled = typeof __DEV__ !== 'undefined' && __DEV__;
  const emit = (event: string, code = '') => {
    if (enabled) console.info('[Navo Firebase lifecycle]', JSON.stringify({ scope, id, event, ...(code ? { code } : {}) }));
  };
  emit('subscribe');
  return {
    next: () => emit('snapshot'),
    error: (error: unknown) => emit('listener-error', safeFirebaseCode(error)),
    stop: (unsubscribe: () => void) => { emit('unsubscribe'); unsubscribe(); },
  };
}
