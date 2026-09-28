export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }

type ClerkErrorEntry = { code?: string; message?: string; longMessage?: string };
type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
  errors?: ClerkErrorEntry[];
};

const CODE_MESSAGES: Record<string, string> = {
  form_param_format_invalid: 'Enter a valid email address, like you@example.com.',
  form_identifier_invalid: 'Enter a valid email address, like you@example.com.',
  form_identifier_not_found: 'We couldn’t find that email. Try again or create an account.',
  form_code_incorrect: 'That code doesn’t look right. Check your email and try again.',
  verification_incorrect: 'That code doesn’t look right. Check your email and try again.',
  verification_expired: 'That code has expired. Send a new one and try again.',
  code_expired: 'That code has expired. Send a new one and try again.',
  form_too_many_attempts: 'Too many attempts. Please wait a moment and try again.',
  rate_limit_exceeded: 'Too many attempts. Please wait a moment and try again.',
  identifier_already_exists: 'That email already has a Navo account. Log in instead.',
  strategy_unavailable: 'Email codes aren’t available on this account right now. Try Google.',
  captcha_invalid: 'We couldn’t confirm you’re human. Try again in a moment.',
  form_captcha_invalid: 'We couldn’t confirm you’re human. Try again in a moment.',
  captcha_unavailable: 'Human verification is unavailable right now. Try Google instead.',
  session_expired: 'Your session expired. Please sign in again.',
  oauth_access_denied: 'Google sign-in was cancelled. You can try again or continue with email.',
  oauth_callback_failed: 'We couldn’t finish Google sign-in. Return to login and try again.',
  oauth_fetch_user_failed: 'We couldn’t reach Google. Check your connection and try again.',
  expo_go_oauth: 'Google sign-in needs the Navo development app. You can continue with email in Expo Go.',
  callback_failed: 'We couldn’t finish sign-in. Return to login and try again.',
  offline: 'You’re offline. Connect to the internet to sign in.',
  auth_not_configured: 'Sign-in is not available yet. Please add your Clerk key and reload.',
  profile_missing: 'We couldn’t save that name. Please try again.',
};

export function friendlyAuthError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const value = (error ?? {}) as AuthFailure;
  const entries = Array.isArray(value.errors) ? value.errors : [];
  const codes = entries.map(entry => entry?.code ?? '').filter(Boolean);
  const message = value.message ?? '';

  if (message === 'offline' || message === 'auth_not_configured' || message === 'expo_go_oauth'
    || message === 'oauth_cancelled' || message === 'callback_failed' || message === 'profile_missing') {
    return CODE_MESSAGES[message];
  }
  for (const code of [...codes, value.code ?? '']) {
    if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  }
  if (value.status === 429) return CODE_MESSAGES.rate_limit_exceeded;
  if (value.status === 422 || codes.some(code => code.startsWith('form_param'))) {
    return CODE_MESSAGES.form_param_format_invalid;
  }
  if (/network|fetch|abort|timeout/i.test(message) || value.name === 'AbortError') {
    return 'We couldn’t connect. Check your internet connection and try again.';
  }
  return fallback;
}

export function clerkErrorCode(error: unknown) {
  const value = (error ?? {}) as AuthFailure;
  const entries = Array.isArray(value.errors) ? value.errors : [];
  return entries.find(entry => entry?.code)?.code ?? value.code ?? '';
}
