# Navo configuration and release runbook

## Credential locations

There are two separate configurations. Never put an Admin SDK private key or Nebius key in an `EXPO_PUBLIC_` variable.

1. **Repository root `.env.local`:** Firebase public web-app configuration, Google OAuth client IDs and `EXPO_PUBLIC_API_BASE_URL`. The Firebase values supplied for `navo-57a5c` are already present locally. The blank template is `.env.example`.
2. **`backend/.env`:** `FIREBASE_PROJECT_ID`, an absolute `GOOGLE_APPLICATION_CREDENTIALS` path to an untracked service-account JSON (or managed Application Default Credentials), `NEBIUS_API_KEY`, `NEBIUS_BASE_URL`, and the exact `NEBIUS_MODEL` available in your Nebius account. A blank local file has been created from `backend/.env.example`. Do not commit it. Inline Firebase email/private-key variables are an alternative, not additional requirements.

No Clerk key is used by the current application. Historical Clerk variables can be removed from your local environment after confirming no other project uses them.

The Firebase web configuration identifies the client project; it does not enable authentication providers, create Firestore, deploy rules, authorize a backend, or grant access to Nemotron.

## Local setup

```sh
npm ci
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
# Fill backend/.env, then:
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

On the phone, `localhost` means the phone. Set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000` in root `.env.local`, on the same trusted Wi-Fi. For a browser on this computer, use `http://localhost:8000`. Add the actual web preview origin to backend `CORS_ORIGINS`. Use HTTPS for deployed builds. Restart Metro after changing public variables:

```sh
npx expo start --clear
```

`GET /health` reports configuration presence, not a successful Firebase or Nemotron connection. API documentation is at `/docs` locally. Production should restrict API docs and add a gateway with TLS, request-size limits, per-IP abuse controls and monitoring. The API already limits request bodies to 64 KiB and authenticated accounts to 90 requests per minute; AI generation additionally has its own hourly quota.

## Firebase Console

- Enable Email/Password and Google in Authentication. Set authorized web domains, including localhost for local web testing.
- Brand verification and password-reset templates as Navo. Enable email-enumeration protection and configure the password policy.
- Create Cloud Firestore, choose an appropriate region, then deploy this repository's rules and indexes to **the intended project**. All client writes are denied. Authenticated backend endpoints perform validated mutations; clients subscribe to authorized reads.
- Firebase email verification is required for collaboration. Email/password users can complete personal setup first, then verify through the Groups connection panel and tap Retry connection. Google users normally have a verified email claim.
- Restrict API keys appropriately for their platforms, use a least-privilege server identity, and set budget alerts. Do not put Admin credentials in the app bundle.

Deployment command after reviewing the selected project and rules:

```sh
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project navo-57a5c
```

This command has **not** been run by the agent.

## Native Google and push notifications

Native Google now uses `@react-native-google-signin/google-signin`, following Expo's native integration guidance. Web uses Firebase's popup flow. Email/password remains available in Expo Go.

- Supply the Web OAuth client ID. For iOS, also supply the iOS client ID; `app.config.ts` derives its reversed URL scheme.
- Register the Android package and build signing SHA-1/SHA-256 in Firebase/Google Cloud. Register the iOS bundle ID. Current identifiers are `com.rahulyadav.navo`; review ownership before shipping.
- Changing native OAuth configuration requires a new development build. `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` remains documented for your console configuration but is not passed to the native Google SDK.
- Configure an EAS project and Android FCM/iOS APNs credentials for remote notifications. No project IDs or signing identities were invented. Push registration is opt-in from Your updates.
- Push acceptance and receipts are not proof that a person saw an alert. Device settings, connectivity and operating-system restrictions apply.

See [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/) and [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Backend workers

Run bounded worker passes from `backend/` with the same server environment:

```sh
.venv/bin/python -m app.checkin_worker
.venv/bin/python -m app.push_worker
```

Schedule check-in evaluation every minute and push processing at an appropriate short interval on your hosting platform. Push worker leases prevent concurrent claims; receipt lookup starts after 15 minutes. Check-ins start an explicit four-hour interval. Stopping sharing cancels that interval. Workers have not been deployed or scheduled here.

Messages and group alerts use Firestore listeners. Requests use Firebase ID tokens; the backend verifies revocation and verified-email claims. Invitations require an existing connected user, remain pending until acceptance, and do not send email.

## AI configuration

Use the exact Nemotron model ID from your Nebius catalogue. The default endpoint is `https://api.tokenfactory.nebius.com/v1`. No fabricated model ID or simulated production response is provided.

Each request allows one draft and at most two repairs. Deterministic checks cover schema, route stops, continuity, trailhead/return, duration, configured ascent/distance thresholds, elevation consistency and rest. Distances remain model estimates because verified trail geometry is not supplied. Every result remains rejected or requires guide review; nothing is labelled safe/approved.

For a clearly labelled repair demonstration only, enable backend `ENABLE_DEMO=true` and app `EXPO_PUBLIC_ENABLE_DEMO=true`. The first draft then contains a deliberate ascent violation, recorded as `simulatedFault` in the audit. Keep both disabled in production.

## Maps and offline expectations

Leaflet displays online OpenStreetMap and optional OpenTopoMap tiles with attribution. No Baato key is required. Baato can be evaluated separately for local landmark search; that does not verify mountain trail geometry. Public tile services must not be bulk-downloaded for offline use.

Trip packs store approximate waypoints, preparation, emergency contact, saved AI draft and an optional timestamped crew snapshot. They do **not** store map tiles, supply offline routing, guarantee remote trail coverage, or receive new alerts offline. Off-route alert creation stays disabled until a licensed, verified track is supplied. A tested distance/debounce utility is ready for that integration.

## Release gates still requiring external setup or verification

- Real Firebase credentials, deployed Firestore rules/indexes and reachable HTTPS backend.
- Actual Nemotron call with the user's selected model, latency and cost assessment.
- Two-device invitation/chat/check-in/alert tests and physical iOS/Android OAuth/push tests.
- Verified trail data and licensed offline mapping before advertising navigation or off-route safety.
- Published privacy policy, operator identity, support contact, retention policy and full account-deletion workflow before store submission. Do not claim store readiness without these.
- Load testing, crash reporting, monitoring, backup/restore and abuse-protection configuration in the chosen hosting environment.

Use `docs/QA-CHECKLIST.md` for the executable checks and device walkthrough. Code compilation is not evidence that these external release gates passed.

## Dependency review and release preflight

Run `npm run check:release` before preparing a release. It reports missing production variables without printing their values. It does not replace live-service checks.

The audited dependency tree uses scoped overrides for gRPC 1.14.5 and Xcode’s UUID 11.1.1 to remove the reported high-severity and UUID advisories. Three moderate advisory entries remain in the Expo Router → query-string → decode-uri-component chain. The available decoder fix changes module format; do not force an untested major dependency downgrade. Resolve this upstream-compatible dependency chain and rerun the security audit before production release.

`backend/requirements.lock` records the tested Python environment. Docker and CI use it. A real container build and hosting deployment still need verification in the destination environment.

## Build profiles

`eas.json` includes development, internal preview and production profiles. Configure your EAS account/project and public environment variables first, then use:

```sh
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Production builds run the release preflight automatically through `eas-build-pre-install`. Signing, cloud builds and store submission have not been performed. The development client is included for native Google/push testing.

## UI direction

The existing Himalayan imagery and requested #E4FF89 / #2A3437 / #19293A / #FFFFFF palette remain intact. The implementation uses a full-page onboarding exit, short entrance transitions, reduced-motion handling, readable secondary text, password visibility controls and explicit offline/connection feedback. Inspiration focused on clear preparation and offline availability patterns from [AllTrails](https://www.alltrails.com/welcome) and [komoot](https://support.komoot.com/hc/en-us/articles/10194701438234-Get-started-with-komoot), without copying their branding or implying equivalent navigation coverage.
