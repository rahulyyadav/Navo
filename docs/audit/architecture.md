# Navo Phase 1 — architecture

Audit date: 21 October 2026, Asia/Kathmandu. Audited checkout: `4e525f9`, branch `codex/onboarding-discovery-reliability`. The working tree was clean before this audit. This phase adds documentation and fresh screenshots only; it does not implement fixes, install dependencies, change providers, deploy, or push anything.

Read this with [current-state](current-state.md), [feature-matrix](feature-matrix.md), [risks](risks.md), [test-results](test-results.md), and [upgrade-roadmap](upgrade-roadmap.md). Earlier audit documents are historical context, not evidence that this checkout works. Findings below come from current source reads, commands, and the running web app.

## Framework and entry points

| Concern | Actual implementation and evidence |
| --- | --- |
| Runtime | Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3`; `package.json`. React Native Web and React DOM support the browser target. |
| Entry | `expo-router/entry`; routes under `src/app/`. `src/app/_layout.tsx` loads Satoshi fonts, then AuthProvider → CloudProvider → NavoProvider, SafeAreaProvider, and Stack. |
| Native targets | iOS `com.thakurbibek.navo`, Android same application ID; portrait, dark appearance, tablets enabled in `app.json`. No checked-in `ios/` or `android/` directories were found. Native generation is configuration-driven. |
| Build configuration | `app.json` plus `app.config.ts`; the latter conditionally adds native Google sign-in callback configuration. `eas.json` defines development, preview, production profiles. An export is not a signed native build. |
| Package manager | npm and `package-lock.json`; no Bun lock found. Node engine minimum `22.13.0`; this audit used Node `26.7.0`, unlike CI's Node 22. |

## Route organization

- `(tabs)/discover`, `ai`, `map`, `profile`, and hidden-from-dock `groups`: main app areas. `BottomNav.tsx` supplies four labeled tabs; Groups is reached through Home and other actions.
- `index`, `login`, `signup`, `welcome`: authentication and optional profile setup. Protected routes use Firebase sign-in state. Catalogue/discovery, trek details, walking planner, join, and privacy are outside the signed-in Stack guard, although the whole app still needs Firebase client configuration.
- `trails`, `trek/[id]`, `trek-plan`, `navigate`, `adventures`: discovery → overview → provider walking route → saved-plan navigation/history.
- `routes`: GPX import/library/export and segment-to-plan conversion. `record-hike`: a separate foreground summary recorder. `journey`: cinematic approximate-route preview with a separate session implementation.
- `day-hike`, `trips`, `trip/[id]`: personal meetup plans, transport/stay notes, exact-paisa expense calculations, bookmarks and activity summaries.
- `plan`, `copilot`, `group/new`, `group/[id]`, `join`: server planning and shared crews.
- `offline`, `safety`, `alert`, `notifications`, `privacy`: snapshots, check-ins/alerts, inbox and data controls.

This breadth creates overlapping concepts: personal trip, walking adventure, imported route, AI itinerary and cinematic journey are separate models/screens, not one unified lifecycle.

## State and persistence

| Layer | Evidence | Scope / behavior |
| --- | --- | --- |
| Authentication | `context/AuthContext.tsx`, `lib/firebase.ts`, `lib/firebase.native.ts` | Firebase JS SDK. Native explicitly uses AsyncStorage persistence; web uses Firebase web Auth. |
| Profile/onboarding | `context/NavoContext.tsx`, `services/profile.ts`, `services/onboarding-state.ts` | UID-scoped local answers; completion resolves monotonically against cloud answers. Local completion commits before network sync. Legacy profile restoration exists. |
| Cloud | `context/CloudContext.tsx` | Own-profile Firestore subscription is independent of group backend setup. Session API must succeed before group/inbox streams start. Queries are bounded and member-filtered. |
| Walking plans/history | `lib/adventure-store.ts`, `lib/navigation-draft.ts` | UID keys; serialized mutations; shape/coordinate checks; capped libraries and 1.5 MB limits. Navigation checkpoints are restored paused, not silently tracking. |
| Imported GPX | `lib/route-store.ts`, `services/routes/gpx.ts` | Local, account-scoped, 20-route/1.5 MB storage bounds; 2 MB/20,000-point import bounds. User tracks are explicitly unverified. |
| Personal trips | `lib/trip-library-store.ts`, `services/trip-library.ts` | Local account library, validated money and activity summaries. Not a live booking system. |
| Preparation | `hooks/usePreparation.ts`, `services/preparationSync.ts` | Device-only path if no main API; otherwise durable local pending outbox with serialized remote writes/retry. A failed first cloud read does not initialize over unknown account data. |
| Offline snapshots/inbox | `app/offline.tsx`, `services/offline-pack.ts`, `lib/inbox-cache.ts` | Trip/crew/contact/checklist snapshots and bounded dated inbox cache. Not offline basemap packages. |

Most app data uses AsyncStorage, not encrypted application databases. UID namespacing protects against accidental cross-account app reads; it is not encryption against device inspection. Data may remain on the device after sign-out. Privacy UI includes explicit clearing/deletion controls; those destructive actions were not run.

## Backend and integrations

Python FastAPI (`backend/app/main.py`), Uvicorn (`serve.py`), Pydantic schemas, Firebase Admin/Auth, Cloud Firestore and HTTPX. Docker runs as a non-root user; pinned `backend/requirements.lock` is used by Docker and CI. `render.yaml` describes a Free preview, not proof of an active deployment.

- `auth.py`: verifies Firebase bearer tokens with revocation checking, requires verified email for shared services, checks pending deletion and request limits. The model key alone cannot make chat work: authenticated chat also needs Firebase Admin and database access.
- `database.py`: certificate path, explicit server credential fields or ADC; missing server credentials yield a controlled 503. The audit did not open private Admin files, generate keys or alter Google/Firebase accounts.
- `main.py`: `/health` is liveness/model-configuration reporting; `/ready` probes Firestore. Groups, invitations, messages, check-ins, location and profiles mutate through backend validation/transactions, not client Firestore writes.
- `firestore.rules`: verified owner/member reads, all client writes denied, default deny. `firestore.indexes.json` supports queries; deployed rules/indexes were not inspected.
- `chat.py`, `token_factory.py`, `planner.py`: Nemotron through allowed Nebius Token Factory hosts. Chat is advisory, not an action agent or live web researcher. Planner validates structured itinerary drafts against approximate stop records and returns `review_required` or rejected; `routeVerified` remains false.
- `ai_budget.py`: persistent global/per-user request reservations. `push_worker.py`, `checkin_worker.py`, `maintenance.py`: queue processing, receipts, retries and cleanup. Scheduled GitHub maintenance is gated by repository variables/secrets; deployment/operation is unverified.

## Mapping stack and coordinate flow

`components/maps/document.ts` creates Leaflet **1.9.4** HTML, with pinned CDN JS/CSS and integrity hashes. `NepalMap.tsx` displays it in a web iframe; `NepalMap.native.tsx` displays the same document in `react-native-webview` and validates bridge messages. This is not a native MapLibre or react-native-maps renderer. `react-native-maps` is declared, but no source import was found in the inspected source tree.

App coordinates are `{latitude, longitude}`. Photon/OSRM GeoJSON decoders convert `[longitude, latitude]`; Leaflet rendering converts to `[latitude, longitude]`. Catalogue links are dashed/illustrative; provider walking geometry is rendered separately. `useMapPayload.ts` splits large static route payloads from moving GPS payloads, reducing bridge traffic. A static update still rebuilds map layers, and full geometry rendering/matching needs device profiling.

Providers:

| Purpose | Implementation |
| --- | --- |
| Streets | Hard-coded `https://tile.openstreetmap.org/{z}/{x}/{y}.png` in map document. |
| Terrain | Configurable `EXPO_PUBLIC_OUTDOOR_TILES_URL`; default OpenTopoMap raster tiles, attribution credits OSM/SRTM. Contour imagery does not populate route elevation fields. |
| Satellite | Only offered if HTTPS template and attribution are configured. |
| Place search | Photon API with development-only public fallback, Nepal country scope, rounded location bias, aliases and in-memory cache. |
| Walking | OSRM foot endpoint, development fallback `routing.openstreetmap.de/routed-foot`; production needs explicit endpoint. Full GeoJSON, instructions, alternatives, timeout, bounds and snapping checks. |
| Trail facilities | Overpass, route bounding box and 300 m distance filter, maximum 40 shown, dated in-memory stale cache. No guarantee of access/potability/hazard completeness. |
| Weather | Open-Meteo selected-date point forecasts, Asia/Kathmandu, fetched timestamps, 15-day future bound. |
| Route elevation | Imported GPX elevation when present; catalogue stop elevations are illustrative. Routed OSRM ascent/descent are null; no route DEM enrichment service found. |

The day-hike wizard has a separate daily forecast adapter in `services/day-hike.ts`; the walking planner uses `services/weather/hourly.ts`. Keep provider/freshness/timezone behavior consistent across both rather than assuming they are one shared weather implementation.

## Environment and dependency audit

Only example env files are tracked (`git ls-files '.env*' 'backend/.env*'`). No secret values are included in this report. Public Firebase identifiers and OAuth client IDs are client configuration; private Admin/model credentials must stay server-side.

Relevant public groups: Firebase configuration; Google OAuth IDs; API/chat URLs; Photon/walking/Overpass URLs; tile templates/attribution; support/privacy/invite URLs; demo flag. Server groups: project/Admin credentials; CORS; model key/base/model; AI ceilings; Expo push and maintenance tokens. See `.env.example`, `backend/.env.example`, and `scripts/check-release.mjs` for names.

Expo printed legacy Clerk variable names while loading local configuration; current auth source uses Firebase and no Clerk source reference was found. That output is not proof of a secret leak. Review/remove obsolete local configuration later. `expo-secure-store` and `react-native-maps` appear unused by current source; evaluate only after native regression tests. No dependency was removed. No package was declared unmaintained without evidence; advisory scanning was blocked by DNS.

## Checks and boundaries

CI `.github/workflows/quality.yml` covers lint/typecheck/client tests/all-platform export, backend tests and Firestore emulator rules tests. It does not prove physical GPS accuracy, background behavior, field trail verification, offline basemap downloads, deployed integrations or store compliance. Current command results and limitations are in [test-results](test-results.md).
