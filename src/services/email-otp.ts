export type EmailChallenge = { challengeId: string; expiresIn: number; resendAfter: number };
export class EmailOTPError extends Error {
  constructor(message: string, readonly retryAfter = 0) { super(message); this.name = 'EmailOTPError'; }
}
export function decodeEmailChallenge(value: unknown): EmailChallenge {
  const v = value as EmailChallenge;
  if (!v || !/^[A-Za-z0-9_-]{43}$/.test(v.challengeId) || !Number.isInteger(v.expiresIn) || v.expiresIn < 1 || v.expiresIn > 3600 || !Number.isInteger(v.resendAfter) || v.resendAfter < 1 || v.resendAfter > 3600) throw new Error('Navo could not prepare your code. Please try again.');
  return v;
}
export function emailOTPFailure(status: number, retryAfter: string | null, detail?: unknown): EmailOTPError {
  const seconds = Number(retryAfter);
  if (status === 429) return new EmailOTPError('Too many attempts. Please wait before trying again.', Number.isFinite(seconds) && seconds >= 1 ? Math.min(3600, Math.ceil(seconds)) : 45);
  if (status === 422) return new EmailOTPError('This code is invalid or has expired. Request a new code and try again.');
  if (status === 503 && detail === 'email_otp_configuration_missing') return new EmailOTPError('Email sign-in setup is incomplete on the server. Configure BREVO_API_KEY, BREVO_SENDER_EMAIL and AUTH_OTP_SECRET in backend/.env, then restart the backend.');
  if (status === 503 && detail === 'Server Firebase credentials are unavailable.') return new EmailOTPError('Firebase Admin is not configured on the server. Configure approved Admin credentials in backend/.env, then restart the backend.');
  if (status >= 500) return new EmailOTPError('Email sign-in is temporarily unavailable. Check the backend email and Firebase configuration, then try again.');
  return new EmailOTPError('We couldn’t complete email sign-in. Please try again.');
}
export function otpDigits(value: string) { return value.replace(/[^0-9]/g, '').slice(0, 6); }
