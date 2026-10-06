# What to configure last
No new account/key is needed to run the unit tests. These items are needed for the real demonstration.

## Required: NVIDIA Nemotron on Nebius Token Factory
Location: backend/.env or your backend host's secret manager.
NEBIUS_API_KEY=<Token Factory API key>
NEBIUS_BASE_URL=https://api.tokenfactory.us-central1.nebius.com/v1
NEBIUS_MODEL=<exact NVIDIA Nemotron model ID available to your account>

Choose a model whose catalogue entry supports JSON/structured output. Do not guess an Ultra/Super/Nano identifier. Confirm the model publisher and availability in the account catalogue. Start with one model; compare cost/latency before adding multiple models.
Setup: https://docs.tokenfactory.nebius.com/quickstart
JSON support: https://docs.tokenfactory.nebius.com/ai-models-inference/json

From backend/:
.venv/bin/python -m app.evaluate
This checks configuration without inference or secret output.
.venv/bin/python -m app.evaluate --live --case gradual-mardi
This makes up to THREE paid model calls and writes ../output/evaluation/live-report.json.
.venv/bin/python -m app.evaluate --live --case all
This makes up to NINE paid calls. Review every result; the report is descriptive, not a safety benchmark.
No Firebase credentials are needed for the CLI evaluation. The app itself still needs authenticated backend connectivity.

## Required for the app: Firebase and hosted API
Keep your existing public Firebase client/OAuth values in root .env.local.
Server: FIREBASE_PROJECT_ID plus GOOGLE_APPLICATION_CREDENTIALS pointing to an untracked service-account file, or server-managed application-default credentials. See docs/PRODUCTION-SETUP.md for the supported alternatives.
Host the backend container at an HTTPS URL; put it in EXPO_PUBLIC_API_BASE_URL.
Set CORS_ORIGINS to the actual web demo origin (exact scheme/host/port).
Deploy firestore.rules and firestore.indexes.json to the intended Firebase project.
Run the check-in and push workers if demonstrating those features.
Do not publish the Admin SDK file or put it in the Expo bundle.

## Required submission hosting
Choose a public HTTPS web demo host or provide an installable test build. A browser demo is easier for judges, but native GPS/audio/Google behavior must be tested separately.
Set EXPO_PUBLIC_INVITE_BASE_URL to the actual web origin for browser invitations.
Set EXPO_PUBLIC_PRIVACY_URL and EXPO_PUBLIC_SUPPORT_EMAIL before production release.
Never publish a temporary auth-bypass fixture as the working demo.

## Conditional: native Google login / notifications
Existing Google web+iOS IDs are configured locally; verify them in a newly signed development build.
Android signing hashes / iOS bundle and URL scheme must match com.rahulyadav.navo.
EAS project plus APNs/FCM credentials are needed for native push; EXPO_ACCESS_TOKEN is optional enhanced push security.
Use Expo's configuration guide: https://docs.expo.dev/push-notifications/push-notifications-setup/

## Existing external services: no extra key for the current flow
- Google Maps external directions URLs: no Maps API key used. This is not internal navigation, booking or live ETA extraction.
- Open-Meteo free forecast endpoint: no key used; free access is noncommercial. Arrange suitable commercial access before commercial launch. https://open-meteo.com/en/licence
- Existing map provider/tile configuration remains separate; confirm its terms before adding offline downloads.

## Optional later, not needed to prove the hackathon AI loop
A licensed Nepal place-search/route provider, verified GPX tracks and a commercial weather backend. Baato can be evaluated for local place coverage, but adding a key alone does not verify mountain trails. Do not integrate several mapping providers just for the demo.
Do not add Tavily, a vector database, an extra LLM provider or paid routing just to expand the stack. Add them only when a demonstrated user requirement needs them.

## Final checks
npm run check:release
npm run typecheck
npm run lint
npm test
From backend/: .venv/bin/python -m pytest -q
Then real model evaluation, two-device flow, clean-browser demo, and the public video.
