export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }

type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address, like you@example.com.',
  'auth/missing-email': 'Enter your email address to continue.',
  'auth/missing-password': 'Enter your password to continue.',
  'auth/invalid-credential': 'That email or password isn’t correct. Check both and try again.',
  'auth/wrong-password': 'That email or password isn’t correct. Check both and try again.',
  'auth/user-not-found': 'That email or password isn’t correct. Check both and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact Navo support for help.',
  'auth/email-already-in-use': 'That email already has a Navo account. Log in instead.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'We couldn’t connect. Check your internet connection and try again.',
  'auth/operation-not-allowed': 'That sign-in method is not enabled in Firebase yet.',
  'auth/configuration-not-found': 'Navo’s Firebase Authentication has not been set up yet. Enable Authentication and your sign-in method in the Firebase console, then try again.',
  'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
  'auth/popup-blocked': 'Your browser blocked Google sign-in. Allow popups and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled. You can try again or continue with email.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled. You can try again.',
  'auth/account-exists-with-different-credential': 'That email uses another sign-in method. Log in with the method you used before.',
  oauth_callback_failed: 'We couldn’t finish Google sign-in. Return to Navo and try again.',
  auth_not_configured: 'Sign-in is not available yet. Add your Firebase values to .env and reload.',
  offline: 'You’re offline. Connect to the internet to sign in.',
  profile_missing: 'We couldn’t save that name. Please try again.',
};

export function firebaseErrorCode(error: unknown) {
  const value = (error ?? {}) as AuthFailure;
  return value.code ?? '';
}

export function friendlyAuthError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const value = (error ?? {}) as AuthFailure;
  const code = firebaseErrorCode(error);
  const message = value.message ?? '';

  if (CODE_MESSAGES[message]) return CODE_MESSAGES[message];
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (value.status === 429) return CODE_MESSAGES['auth/too-many-requests'];
  if (/network|fetch|abort|timeout/i.test(message) || value.name === 'AbortError') {
    return CODE_MESSAGES['auth/network-request-failed'];
  }
  return fallback;
}
