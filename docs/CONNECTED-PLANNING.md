# Connected Navo planning and navigation

## Architecture and preservation

Navo remains the existing Expo SDK 57 / React Native app with Expo Router, Firebase sign-in, local AsyncStorage, Firestore groups and a FastAPI/Nebius backend. Existing authentication, onboarding, preparation, group invitations, notification flows, trek catalogue and cinematic journey are retained.

The new connected flow is Home search → destination preview/planner → walking-route selection → saved plan → foreground GPS navigation → summary → local hike history. `/trek-plan` is also accessible before sign-in. Saving and navigation/history routes retain the account boundary.

## Problems addressed

Home's search previously matched only bundled catalogue entries. Home's planning action opened a preparation page without a selected trek. There was no general walking route engine or destination-to-navigation handoff. These are now connected through typed services and saved plans.

The reported expo-sensors plugin failure did not reproduce: the matching sensor module was installed, Expo configuration resolved, and the existing app started with `expo start --go`. Sensor integration remains. A later merge had reverted the previously approved application identifier; iOS and Android now use `com.thakurbibek.navo` again. Rebuild the development app and confirm the iOS OAuth client is registered for that identifier. Expo Doctor found seven patch-level mismatches; compatible SDK 57 patches were installed through `expo install --fix`.

The home screen's blue gradient is now the shared background token. Shared headings, cards, input/button components and stack headers use its typography, spacing, surfaces and palette. The existing greeting and destination photography remain. Function-specific full-screen map/cinematic views retain their layout.

A browser test caught empty string conditionals rendering outside a Text component; those search conditionals now return booleans. Route and weather failures have actionable messages. Provider results are validated before use.

## Data providers

- Places: Photon, using OpenStreetMap data. Debounced 350 ms, cancellation, stale-result protection, six suggestions, five-minute memory cache, recent searches and saved destinations. Searches are global; the default relevance bias is Kathmandu Valley, replaced by the selected start where available. No device location is requested for the default bias.
- Walking routes: OSRM-compatible walking dataset. Development defaults to FOSSGIS's explicitly prepared `routed-foot` service. The car service is never used for hiking. Alternatives are shown only when returned. A selected endpoint more than 200 m from the mapped walking network is rejected. Provider distance, duration, endpoint offsets and instructions are retained; no elevation/difficulty/scenic quality is invented.
- Weather: Open-Meteo daily and hourly data, including temperature, rain probability, wind, humidity, visibility, sunrise and sunset. Date and response values are validated. Start and destination point forecasts are requested only on explicit action. Arrival after sunset and forecast rain/thunderstorms produce planning notices.
- AI: Existing Nebius/NVIDIA backend, extended with optional typed route context and support for official US and global Token Factory endpoints. Arbitrary credential destinations are rejected. Route names, distance, timing and available progress can be sent on explicit question. Raw GPS coordinates and path histories are excluded. Matching fetched weather snapshots and sunset are included with their date, source and fetch time. Missing weather/elevation remain unknown. Live model inference still requires a connected backend and server credentials.

Public Photon and FOSSGIS services are for light development use, with no service guarantee. Release bundles do not silently fall back to them. Configure provider-approved or self-hosted production capacity before publishing.

## Planning and navigation behavior

Users choose current GPS, another searched start, or a map point; select destination, date/time (Nepal time), pace and up to three stops; calculate walking routes; inspect the map, instructions and forecasts; and save/start a plan. Provider estimates are scaled for the chosen pace and explicitly exclude unplanned breaks and terrain uncertainty.

Navigation consumes real foreground GPS. Invalid, stale, inaccurate and implausible fixes are filtered. Position matching supplies remaining route distance and ETA only when reliable. A deviation beyond accuracy-adjusted tolerance must persist for 30 seconds before an off-route notice. Recalculate uses a fresh fix and retains the destination; optional stops are deliberately removed with an explanation. Failed recalculation preserves the existing route.

GPS calculation continues without internet while the navigation screen stays active. A local north-up route sketch is available when offline, with a visible offline status. Basemap tiles, new weather and recalculation need internet. Backgrounding or locking pauses tracking; this is not background navigation. Resume acquires a new fix and does not bridge paused gaps.

Local checkpoints are saved every 30 seconds and on pause/background. Interrupted sessions reopen paused; ended summaries can be restored. Users explicitly choose whether a raw GPS path is retained. Default history stores totals. Export preserves recording segment breaks. Navigation map updates send small position messages without repeatedly rebuilding/transmitting the route geometry.

During navigation, users can explicitly select a connected crew and enable foreground position sharing/nearby alerts using the existing group service. The navigation GPS watcher is reused; there is no second continuous GPS watcher. Sharing stops on pause, leaving, or backgrounding.

Imported GPX functionality is retained and integrated: choose a continuous segment to create a local navigation plan. Separate segments are never joined. Sparse segments with gaps over 500 m cannot start guidance. GPX time estimates explicitly assume 4 km/h before terrain and breaks; they are not provider travel times or verified trail guidance.

## Storage and privacy

Account-scoped recent searches, saved places, walking plans, hike history and navigation drafts use separate keys from the completed trip library. Serialized writes preserve concurrent changes and corrupt stored data is not overwritten. A payload limit makes storage exhaustion an actionable failure. My adventures includes plan/history removal and recent-search clearing. Privacy cleanup includes these stores and imported GPX routes.

Saved plans and recorded hikes are local to this device. A selected walking plan can create a custom hike group through the existing group API, including destination, meeting point, date, time and expected party size. Invitation acceptance and membership rules are unchanged. Shared features require a connected backend. Search/routing/weather disclosures describe the coordinates sent on the corresponding action. Paths are never automatically uploaded to groups or AI.

## Environment and running

Development search and routing need no API key. For production configure public endpoints:

```
EXPO_PUBLIC_PHOTON_URL=https://your-approved-photon-service
EXPO_PUBLIC_WALKING_ROUTER_URL=https://your-osrm-walking-base
EXPO_PUBLIC_API_BASE_URL=https://your-navo-backend
```

The walking base must serve a prepared walking dataset; `/route/v1/foot/...` is appended. Public endpoint variables must not contain credentials. Keep Nebius keys and Firebase Admin credentials only in `backend/.env` or your deployment secret store. The existing Nebius values were moved out of the frontend root environment into the ignored `backend/.env` and a live NVIDIA Nemotron request succeeded. The local chat-only endpoint uses `EXPO_PUBLIC_CHAT_BASE_URL=http://localhost:8114`; the shared backend URL and Firebase Admin credentials still need configuration. A phone cannot use the laptop’s localhost URL; deployment requires a reachable HTTPS endpoint. Set `CORS_ORIGINS` to your actual web origin (including `http://localhost:8113` for this local test server). Existing Firebase/OAuth public values remain required for sign-in. Production privacy/support configuration is also required by the release checker.

```
npm install
npx expo start --go
npm run typecheck
npm run lint
npm test
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8114
backend/.venv/bin/python -m pytest backend/tests -q
npx expo-doctor
npx expo export --platform all
npm run check:release
```

Use a rebuilt development app for native Google sign-in and new native GPX picker/share modules. Expo Go does not establish production native behavior.

## Verification and limits

Live public-coordinate requests returned Kathmandu autocomplete, two FOSSGIS walking alternatives, and a 24-hour Open-Meteo forecast. Automated tests use captured real provider fixtures and explicit synthetic GPS test inputs; the product does not simulate live movement. The browser's actual public planner was exercised with “Ka” → Kathmandu → Thamel start → walking route, yielding 1.86 km and about 25 minutes with instructions.

The signed-in save/navigation screen and hardware GPS need real iOS/Android testing. No field accuracy, lock-screen tracking, background recording, offline basemap availability, rescue dispatch, route access approval, or production readiness is claimed. Unknown elevation and difficulty remain unavailable. Route estimates cannot establish whether a mountain summit is an appropriate destination.

Provider references:
- https://github.com/komoot/photon
- https://routing.openstreetmap.de/about.html
- https://project-osrm.org/docs/v5.24.0/api/
- https://open-meteo.com/en/docs
- https://docs.expo.dev/versions/v57.0.0/sdk/location/

## Local verification and release gate

The local application can reach the chat backend at localhost:8114 and the existing NVIDIA Nemotron credentials produced a nonempty live reply. Server-only values now live in the ignored backend environment, not the frontend root environment. Local chat is separate from the unconfigured shared-service endpoint so missing Firebase Admin setup does not block route questions.

The production release checker still fails until the shared HTTPS backend URL, production place/routing endpoints, privacy-policy URL and support email are configured, and the local-only chat URL is replaced or unset. A rebuilt native development app and real-device GPS/Google sign-in tests remain necessary. The remaining dependency audit reports 23 findings (3 moderate, 20 high); no incompatible forced SDK downgrade was applied.

Final automated validation: TypeScript and lint pass, 71 client tests and 69 backend tests pass, Expo Doctor passes 21/21 checks, and iOS/Android/web exports succeed. Browser testing at 390×844 verified real Ka autocomplete, Kathmandu selection, Thamel start, an actual 1.86 km / 25-minute route, instructions, live hourly forecasts and a live Nemotron route reply. No mock account or GPS movement was used.
