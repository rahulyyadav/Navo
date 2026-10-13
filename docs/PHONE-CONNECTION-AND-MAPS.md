# Phone connectivity, discovery and map update

## What the screenshots revealed

The phone's AI endpoint was laptop-local; the group endpoint was unset. A Nemotron key configures the server but cannot make a phone reach that server. The map tab began at a broad Nepal-region view, and place search relied only on Photon spellings. Trek galleries displayed three enlarged crops of the same photograph.

## Implemented behavior

- Phulchowki, Phulchoki, Pulchowki, Fulchowki and Nepali spelling aliases resolve to the OpenStreetMap peak reference `node/3490869705`, at 27.5710397, 85.4067119. Trekking-intent words are normalized. Exact Pulchowk stays a separate neighbourhood query. Peak results are clearly labeled. References remain available if remote search fails; a place reference does not establish a hiking route or legal access.
- The map tab starts in Kathmandu Valley, with visible terrain/street controls, searchable destinations, closer focus and a planning action. Maps default to OpenTopoMap contours, with street access as a secondary layer. Provider-approved outdoor and satellite XYZ templates can replace these layers, with mandatory attribution for satellite. No satellite service was silently enabled or charged. The same selected real provider route remains visible in planning/navigation. A live Godawari-entry → Phulchowki request returned 6.76 km one-way, with a provider baseline of 1h 30m. That time is explicitly not a reliable uphill hike budget. Peak-destination notices explain ascent, breaks, access and the missing return journey; routes are labelled mapped options rather than unverified best routes.
- Published maps are linked after routing. Phulchowki links to Access Nepal's published map section; Annapurna Base Camp has a publisher's PDF. These maps remain on the publisher's site, with their copyright preserved, and may use a different itinerary. Generic destinations have a terrain map link. GPX export remains available for the actual selected route. No unlicensed operator map was copied into the repository.
- Eight distinct licensed gallery images are bundled (about 4.2 MB total), in addition to the original four. Gallery selection changes the actual scene, not zoom. Individual author, source and CC license links are shown. Attribution is recorded in assets/TREK-PHOTO-CREDITS.md.
- Native development requests can translate a localhost backend URL to the private Wi-Fi host that Expo supplies, retaining the backend port. Public HTTPS addresses stay unchanged. Release builds and unsupported tunnel hosts reject loopback with an actionable message. Server keys are never bundled. This is local testing, not public hosting.
- Group creation retains server authentication/verified membership rules. If disconnected, users can prepare the selected trek on this phone instead of facing only a disabled button. Shared membership is not simulated.

## Test the phone without cloud billing

Keep phone and laptop on the same Wi-Fi, start Expo in LAN mode and run:

```sh
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8114 --no-access-log
npx expo start --go --port 8113
```

The existing localhost chat override can resolve to Expo's private LAN host on iOS/Android development builds. Allow Navo/Expo local-network access on the phone. Keep the laptop running. Expo tunnels do not forward the backend port. The local service uses server-only backend/.env credentials. This setup has been made available locally, but the physical phone was not operated/tested by Codex.

Shared groups also require Firebase Admin credentials. You are currently on Firebase Spark and chose to keep the no-cost plan. No billing upgrade or private-key generation was performed. For a key-based host, generate/download an Admin SDK JSON yourself, keep it outside Git, and configure its path as GOOGLE_APPLICATION_CREDENTIALS. Do not paste the contents in chat. Existing rules/indexes must be deployed for Navo's authenticated clients.

## Optional free HTTPS preview

`render.yaml` defines an optional Free Docker web service with no paid database or disk, automatic deployment off, and `/health` liveness checking. Upload a Firebase Admin JSON as the secret file `/etc/secrets/firebase-admin.json` using your hosting account. Supply NEBIUS_API_KEY, exact NEBIUS_MODEL and CORS_ORIGINS as server environment settings. Reuse the existing server key without copying it to a public variable. The Docker entrypoint now honors the host's PORT.

A Render account/deployment and Firebase credentials have not been provisioned. Its Free services sleep after 15 idle minutes and can take about a minute to wake. Render explicitly describes Free instances as previews, not production hosting. Leave payment methods unset/spend controls at zero to prevent paid overages; service suspension/quota limits can still interrupt access. Background push/check-in workers also need separately hosted execution, which is not provided by this free web-service blueprint. A truly available public launch remains an infrastructure decision.

After deployment, set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_CHAT_BASE_URL to the actual HTTPS URL and restart/rebuild the app. Do not invent a hostname or point the app at an undeployed service. Phone authentication, shared groups and invitation acceptance require two real accounts to verify.

## Provider references

- OpenStreetMap peak source: https://www.openstreetmap.org/node/3490869705
- Terrain tiles and attribution: https://www.opentopomap.org/about
- Phulchowki published map: https://accessnepaltour.com/tour/phulchowki-hike/
- Published Annapurna PDF: https://www.ambitionhimalaya.com/wp-content/uploads/2022/05/Annapurna-Base-Camp-Trek-14-Days-Map.pdf
- Optional commercial outdoor-map API: https://docs.maptiler.com/cloud/api/reference/
- Cloud Run requires billing: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service
- Free preview constraints: https://render.com/docs/free

## Validation boundary

Client/backend tests, lint, typecheck, Expo Doctor, exports and actual browser search/map/AI checks are recorded during implementation. Tests use supplied/captured map data and synthetic GPS only. No physical GPS accuracy, current mountain access, successful phone group creation, offline basemap availability or public service uptime is claimed.

## Readability and preview connection follow-up

Home now has a visible destination-search action and a slideshow control above the image deck, where it cannot sit behind the floating navigation bar. The shared blue gradient is deeper; white headers have 5.41:1 contrast and the secondary text token has 4.84:1 against its lightest stop. These are token-level measurements, not a certification of every screen. Preparation uses the same shared palette. AI send targets are at least 44 points.

Render preview requests have a bounded two-minute cold-start window, while ordinary local/shared requests retain their shorter timeout. Chat and group connection states explain startup and keep personal plans available.

The owner created a Python 3 Free service on Render. Its first deployment failed because it looked for requirements.txt at the repository root. The correct native Python configuration is:

- Root Directory: blank.
- Build Command: `pip install -r backend/requirements.lock`.
- Start Command: `PYTHONPATH=backend python -m app.serve`.
- Python family: repository `.python-version` selects the latest supported 3.13 patch, matching the Docker/test family.
- Health Check Path: `/health`.

The build command was corrected in the hosting console. Startup and private environment settings still require completion/verification. An assigned service URL does not establish a successful deployment. No Nebius secret or Firebase Admin JSON has been uploaded by Codex. Finish those steps before replacing the local app endpoints with the public service URL.

## Launch-audit fixes (12 October)

The route planner now puts search before the setup cards and collapses completed inputs into an editable outing summary. AI, crew options and detailed directions/map references open on demand. Review emphasizes one-way distance; unknown elevation/peak destinations no longer display a confident hiking arrival. Weather can cover the rest of the day and fetched times explicitly use Nepal time.

Chat now requires the existing verified Firebase authentication and valid Admin configuration. This deliberately closes the previously public, unbudgeted endpoint. Configure Firebase before testing signed-in AI on a phone; the old anonymous localhost demo is no longer available. The client sends its Firebase bearer token and preserves actionable error messages.

Server controls: AI_ENABLED=false pauses chat; AI_DAILY_REQUESTS defaults to 100 globally; AI_USER_DAILY_REQUESTS defaults to 10 per account. Firestore transactions reserve attempts before provider calls, reset on UTC dates, and count failures too. Two chat calls per process may run concurrently. These are request ceilings, not a currency billing guarantee; use provider-side credit/spend controls as well. Multiple processes share the daily Firestore budget; concurrent slots are process-local. Unknown-ascent timing/return questions receive a fixed caution rather than model-generated hiking budgets. General answers remain model-generated and need review.

Outstanding release gates remain documented in LAUNCH-AUDIT-2026-10-12.md: deployment/credentials, real email and two-account group verification, deletion/recovery, dependency triage and real-device/field testing. The dated audit is historical evidence; this section records subsequent fixes.

## Find walking routes fix (13 October)

The button previously stopped when origin was unset and placed its error only at the top of the long planner. It now resolves a fresh precise foreground location on the user's tap when no explicit start exists, then calculates the route. A chosen trailhead is preserved. Inaccurate, stale, denied or cancelled fixes cannot become invented starting points. The action displays location/routing progress and an adjacent failure message/settings action. Successful calculation opens a distinct review state with an editable outing summary and the mapped route; recording still begins only through Start Trek. The map renderer remains the Expo Go-compatible existing implementation; MapLibre/ORS migration was not silently installed and would require native build/provider configuration.
