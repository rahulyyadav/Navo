# Navo public release handoff

## Fixes from the phone screenshots

The bundled Mardi Himal photograph is a valid 1400×933 JPEG with existing attribution. Home's image now has explicit full width/height, matching the working trek cards. All four bundled destination photographs remain packaged; no external image-host dependency was added. The destination deck changes every eight seconds while focused and active. It pauses during search/filter/list use, on manual swiping, in the background and for reduced motion. A visible play/pause control is available. Native photo display still needs verification on the rebuilt phone app.

Preparation is usable without a shared backend. It saves a separate account-scoped device draft, seeded from the previous local account copy when available. It never uploads that draft over an unknown account checklist. When an account load fails, the spinner stops and the user can retry or explicitly start this separate draft. Offline packs unwrap the existing outbox format correctly and include the device draft. Privacy cleanup removes both copies.

Native map failures expose a reload action, including a terminated WebView and failed Leaflet load. GPS marker updates reuse the existing marker, while resize work is coalesced into animation frames. Existing map panning/camera behavior is preserved. Public walking requests return actual provider geometry and alternatives only where available; catalogue waypoint lines remain explicitly illustrative.

Notification settings now offer four optional Saturday 9 AM prompts in the phone's timezone with varied wording. This is independent of remote group push. Re-enabling replaces only these inspiration notifications; canceling leaves group alerts intact. Notification permission is requested only on enabling. No reminders were scheduled on the user's phone during development. Physical-device delivery needs testing.

The group connection message now distinguishes group/backend setup from the separate chat endpoint. A live local Nemotron request returned useful planning questions without inventing current weather or closures. The public planner was exercised with Kathmandu → Thamel and returned 1.86 km / 25 minutes. This does not prove phone access to the backend or mountain trail suitability.

## Connect the actual phone build

`localhost` on a phone refers to that phone. The current chat URL is laptop-local. For public users deploy `backend/` as a persistent HTTPS service using its Dockerfile; publish the container's port 8000 through your host's HTTPS proxy. Build context is `backend/`:

```sh
docker build -t navo-api backend
# Local container verification only; a hosting service must provide public HTTPS.
docker run --rm --env-file backend/.env -p 127.0.0.1:8000:8000 navo-api
```

Use the host's secret manager for these server-only values:

- `FIREBASE_PROJECT_ID` and Firebase Admin credentials: either Application Default Credentials, a mounted JSON path via `GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
- `NEBIUS_API_KEY`, `NEBIUS_BASE_URL`, `NEBIUS_MODEL` (an NVIDIA model available to your Token Factory account).
- `CORS_ORIGINS`: exact deployed web origins. Native requests do not require browser CORS origins.
- `ENABLE_DEMO=false`; optional `EXPO_ACCESS_TOKEN` for enhanced Expo push security.

Never put those secrets in an `EXPO_PUBLIC_*` variable or commit them. Deploy this repository's Firestore rules and indexes to the matching Firebase project. Verify authentication, session initialization, group creation, invite acceptance with two accounts, membership restrictions and notifications before publishing.

Then set frontend build configuration:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://YOUR-BACKEND
# Remove the localhost chat override, or set it to your reachable HTTPS chat service.
EXPO_PUBLIC_CHAT_BASE_URL=https://YOUR-BACKEND
EXPO_PUBLIC_PHOTON_URL=https://YOUR-APPROVED-PLACE-SERVICE
EXPO_PUBLIC_WALKING_ROUTER_URL=https://YOUR-WALKING-DATASET-SERVICE
EXPO_PUBLIC_PRIVACY_URL=https://YOUR-PRIVACY-POLICY
EXPO_PUBLIC_SUPPORT_EMAIL=YOUR-SUPPORT-ADDRESS
```

Keep the already configured public Firebase and Google OAuth IDs. Restart Expo after environment changes; rebuild the development/release app for bundled config and native changes. Bundle identifier is `com.thakurbibek.navo`. Expo Go does not validate native Google OAuth or remote push delivery.

No additional AI API is needed: Nebius/Nemotron is integrated. Development place/routing/weather calls require no keys. Production needs approved search/walking service capacity; a car routing API is not a substitute for walking data. Weather is a point forecast with time/source, not a guaranteed mountain forecast.

## Required release checks

Run `npm run typecheck`, `npm run lint`, `npm test`, backend pytest, Expo Doctor, platform exports and `npm run check:release`. The release checker intentionally refuses missing public configuration and laptop-local services.

On real iOS and Android builds test small/large text, portrait/landscape, photo deck, account preparation and device drafts, permission denial, GPS acquisition, stale fixes, foreground sharing, offline sketch, recalculation, saved history, native GPX export, Google sign-in, group invites and notification delivery. Current tracking pauses on lock/background; basemap tiles are online. Dependency audit findings and verified mountain-route data remain release work. Neither passing unit tests nor AI responses establish field safety or public readiness.
