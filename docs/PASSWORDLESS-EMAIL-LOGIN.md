# Passwordless login with Brevo

Login and account creation now use a six-digit email code instead of a password.
Google sign-in remains available. The existing onboarding slider still leads to
`/login`, and the existing authenticated route guard and pending invitations are
unchanged. An email is required; username lookup is not implemented.

The design follows the supplied mountain/photo reference. The access card
explains email-code sign-in instead of advertising an unimplemented Face ID
credential flow. The SOS control provides emergency-help information and does
not claim to dispatch rescue.

## Configure the backend

Set these **server-only** values in `backend/.env` or your hosting secret manager:

```
BREVO_API_KEY=<Brevo transactional API key>
BREVO_SENDER_EMAIL=<sender verified in Brevo>
BREVO_SENDER_NAME=Navo
AUTH_OTP_SECRET=<a stable random secret of at least 32 characters>
```

Generate the secret locally with:

```
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Do not put any of these in `EXPO_PUBLIC_*` variables or commit them. Brevo needs
transactional sending enabled and an authenticated/verified sender or domain.
Use `https://api.brevo.com/v3/smtp/email`; SMTP credentials are not API keys.

Firebase Admin credentials for the **same project as the app** are also required.
Use the existing `GOOGLE_APPLICATION_CREDENTIALS` service-account setup or the
existing `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` settings. Custom token
creation needs a signing-capable service account (or appropriately configured
Google IAM signing credentials). A Firebase web API key alone cannot mint tokens.

The client continues using `EXPO_PUBLIC_API_BASE_URL`. It must reach the backend
from the phone; production requests should use HTTPS. Restart the backend after
setting secrets. No new native dependency or development build is required.

## Flow and storage

- `POST /auth/email/request` accepts an email and sends a code through Brevo.
  It returns an opaque challenge ID, 600-second expiry and 45-second resend delay.
  It never returns the code or reveals whether an account exists.
- `POST /auth/email/verify` accepts the email, challenge ID and code. Account
  creation may additionally include a name. A valid proof signs in to the
  existing Firebase UID or creates a verified, passwordless account. Google-linked
  and existing password accounts keep their UID and account data.
- Firebase `signInWithCustomToken` establishes the normal Firebase session.
  Codes and custom tokens are kept in memory by the screen, not persisted by it.
- Challenges contain only keyed hashes of email and code. Five incorrect attempts
  exhaust a challenge. Successful verification consumes it atomically, including
  when Firebase later fails. Request another code after an identity-service outage.
- A successfully delivered resend invalidates earlier codes. Failed email delivery
  creates no usable proof and does not remove an earlier delivered proof.
- Persistent limits: five sends per email/hour, twenty per source IP/hour, two
  hundred sends globally/hour and one hundred verifications per IP/hour. The
  direct client address is used; arbitrary forwarded headers are not trusted.
- Expired proofs fail immediately. Old hash/rate-limit records are cleaned on
  subsequent requests. API responses use the existing no-store middleware.

Default SQLite storage is `backend/.local/email-otp.sqlite3`. Configure
`AUTH_OTP_STORE_PATH` to a durable path shared by workers **on one host**. Separate
hosts/replicas need a shared transactional database implementation before rollout;
independent SQLite files would split proof state and rate limits. Configure trusted
proxy/IP handling at deployment if a reverse proxy otherwise collapses all users
into one address. Monitor legitimate email rejection, quotas and abuse without
logging OTPs, custom tokens or secret keys.

## Validation

Backend tests mock Brevo and Firebase and cover existing/new users, verified email,
expiry, cooldown, failed delivery, attempt exhaustion, concurrency, replay,
disabled accounts, signing outages, configuration failure and Brevo request shape.
Client request tests cover token-free OTP requests, challenge validation, token
exchange and Retry-After handling. No live email is sent by these tests.

Live email delivery and Firebase token signing still require the configuration
above and an end-to-end check using an email address you control.

References: [Brevo transactional email API](https://developers.brevo.com/reference/send-transac-email),
[Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens).
