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
