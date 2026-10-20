# AllTrails investigation and Navo systems implementation

18 October 2026. Baseline: `5478d7c`. This increment adds public discovery and moderated trail feedback. It does not establish complete AllTrails parity or a production-ready outdoor-navigation product.

## Evidence and scope

REA MCP is now connected and was actually used. Existing homepage evidence was reused. A normal browser opened the public [Phulchowki trail page](https://www.alltrails.com/trail/nepal/bagmati-province--3/phulchowki) after a raw HTTP request returned 403. Observed controls included overview/conditions/reviews sections, dated reviews, condition tags, review search, rating distribution, map expansion and route statistics. No account, review submission, subscription, native GPS or paid offline feature was exercised. No trail geometry, ratings, photographs or review text was copied into Navo.

The observed public resources included the trail-page JavaScript module. REA parsed it as inert text: 930,430 bytes, 709 recovered modules, no parse failures; semantic reconstruction reached its 6,000-node limit and remains incomplete. A smaller supporting chunk exposes internationalization exports. This is evidence of those packaged exports, not proof of AllTrails' private backend or its review moderation algorithm. A literal review trace returned no matches within the partial graph; that result is **not** evidence the review feature is absent.

[Exact evidence IDs, hashes, limits and source URL](ALLTRAILS-REA-EVIDENCE-2026-10-18.json) distinguish browser observations, static analysis and independent design decisions. Browser resource inventory was read without replaying private API calls. Only public selected JavaScript was downloaded, outside the repository.

## System-by-system result

| Requested system | Navo implementation and verification | Remaining work |
|---|---|---|
| Discovery | New public `/trails` screen. Search name/region/summary/stops; combined region/difficulty filters; no-results reset; images and route cards | Four curated overviews remain four. Universal place search is available in the walking planner; a place match is not a verified trail |
| Trail details | Public static trek details; about/reviews shortcuts; explicit sign-in for personal operations. Guest mode does not read another account's saved library | Catalog waypoints remain illustrative. Validate/licence real tracks and current local access/permit details |
| Reviews | Backend + UI for one review per user/trail, visit date, 1–5 rating, text and condition tags. Edit/remove own review; published-only latest-20 feed; search/filter and clearly scoped rating average | Deploy backend and indexes, connect accounts, staff moderation and complete two-account phone testing |
| GPS navigation | Existing provider-backed routes, full-screen map, next-maneuver distance, pause/resume, freshness/accuracy checks, ambiguity rejection and off-route timer | Foreground only; physical GPS, lock-screen/app-kill recovery and trail-network validation remain release gates |
| Offline maps | Existing saved route/GPX geometry, snapshot packs, route schematic and GPS overlay; honest online/offline status | **No offline terrain-map downloader or offline routing engine has been added.** A licensed map-pack source, native renderer/download pipeline and airplane-mode cold-start test are still required |
| Trail recording | Existing recorder and account-scoped summaries; GPX import/export and optional navigation path capture | Endurance, battery, device GPS and background-operation acceptance are not established |
| Community | Existing private groups/invitations/chat/check-ins plus this moderated trail-feedback service | Real HTTPS/Firebase Admin connection, moderation operation, two-user membership tests and push delivery |

## Navigation handoff correction

The main action on a trek overview and its preparation page now opens the actual walking-route planner with the selected destination prefilled. The destination is labeled an approximate planning point and the user can adjust it. Origin permission remains explicit; the routing provider must still validate snapping and return usable geometry. The cinematic/illustrative journey remains available as a separately labeled preview. Browser verification confirmed the complete catalog → Mardi detail → prefilled walking-planner handoff without requesting the user’s GPS.

## Review service behavior

- Uses current Firebase authentication and account-deletion checks. Author identity/display name comes from the account, never from submitted author fields.
- New/edited reviews are pending. Other users see only published feedback. Author can see pending/rejected status. Reviews are self-reported; none is labeled a verified hike.
- One deterministic document per user and curated trail prevents duplicate rating inflation from retries.
- Moderator publication uses a random revision token and a transaction. A stale approval cannot publish a replacement edit or a deleted review.
- Mutations read the account-deletion marker inside the Firestore transaction, preventing late writes during erasure.
- Removing a review replaces its content with a tombstone. Account erasure recursively deletes authored reviews and deletes reports authored by that account.
- Reports are private, one per reporter/review, have an unresolved moderation queue and explicit resolution. Reports do not automatically declare a trail dangerous or remove another hiker's content.
- Feed is limited to the latest 20 published reviews. The displayed average explicitly applies to those reviews, not an invented all-time total. No pagination or global social feed is claimed.
- Firestore direct client access to these collections remains denied by the existing fallback rules. Access goes through authenticated backend endpoints.
- Privacy screen now describes shared review fields, moderation and deletion. Device download cleanup leaves cloud reviews unchanged.

## Deployment and moderation runbook

Required setup remains a reachable HTTPS Navo backend and Firebase Admin credentials. Do not put the Admin JSON or moderation token in an Expo public variable. Deploy the updated backend, existing rules and `firestore.indexes.json` to the intended Firebase project; wait for new indexes to finish building. No deployment or paid plan was activated in this work.

Server-only `MAINTENANCE_TOKEN` must be at least 32 characters and stored in the hosting secret manager. It is the existing privileged operator credential; never bundle it in the mobile app. The following are endpoint shapes, not commands that were run against a live account:

| Method/path | Purpose |
|---|---|
| `GET /routes/{trekId}/reviews` | Signed-in, verified account reads published feed and its own review |
| `PUT /routes/{trekId}/reviews/mine` | Submit `{rating,text,visitedOn,conditions}` for moderation |
| `DELETE /routes/{trekId}/reviews/mine` | Remove own content |
| `POST /routes/{trekId}/reviews/{id}/report` | Submit `{reason}`; allowed reasons: spam, abuse, inaccurate, off-topic |
| `GET /internal/reviews` | Operator Bearer token: latest 20 pending reviews, including revision |
| `GET /internal/review-reports` | Operator token: latest 20 unresolved reports with affected review/revision |
| `PUT /internal/reviews/{id}` | Operator token: `{status:"published" or "rejected",revision:"current token"}` |
| `PUT /internal/reviews/{id}/reports/{reporterId}/resolve` | Operator token: mark handled report resolved |

A moderator should inspect the current text before publication, reject inappropriate claims/content, and resolve reports after investigation. If publication returns 409, reload the new revision and review the new text. Account-deleted content cannot be republished. Moderation is an operator API workflow in this increment; no staff dashboard is claimed.

Before enabling shared feedback: use two test accounts to submit, approve, view, edit, report, reject and remove a review. Verify pending content is absent from the other account, denied direct Firestore access, and account-deletion cleanup. These require the actual configured backend/indexes; in-memory unit tests are not an emulator.

## Validation performed

- 106 client tests passed; Expo lint and TypeScript passed.
- 99 backend tests passed, including authentication, one-review behavior, moderation revisions, author-only deletion, reports/resolution and erasure coverage. One existing test-client deprecation warning remains.
- iOS, Android and web exports completed. This is not native device installation or field certification.
- Browser checked at 320 and 390 px widths: public discovery, stop-name search (High Camp → Mardi Himal), combined-filter empty state, clear-filter recovery, public detail entry, reviews shortcut and explicit account actions.
- Shared-feedback browser publication was not exercised because the environment lacks the deployed connection. No fake account or review data was inserted into the actual app.

## Outstanding release configuration

`npm run check:release` still fails on public HTTPS API, privacy, Photon, walking-router and chat configuration plus a valid support email. Local credentials/secrets and environment files were preserved. User input requested: deployed Render HTTPS URL and local Firebase Admin credential path. AllTrails-style offline basemaps, background navigation, native field testing, licensing and operational moderation remain open; this document does not mark them complete.

## 2026-10-20 increment: discovery map, ease of use and hike-time route

**AllTrails evidence route.** Downloading AllTrails' shipped JavaScript for REA analysis was refused by the local permission classifier (fetching unvetted external code needs explicit confirmation). This increment therefore comes from observing AllTrails' *rendered public UI* — "Expand map", trail stat row, layer controls, Length / Elevation gain / Estimated time, route type ("Point to point", "Out & back") — and re-implementing those ideas against public tile and routing sources. No AllTrails code, tile or trail data was copied or fetched.

**What changed**
- `src/services/elevation-profile.ts` + `src/components/ElevationProfile.tsx`: profile x positions are real walked kilometres (`cumulativeKm` in `src/data/treks.ts` also feeds the headline distance, so the two cannot disagree). Size comes from `src/hooks/useMeasuredSize.ts`, which measures synchronously; `onLayout` alone never fires before the first painted frame.
- `src/components/maps/document.ts`: waypoint popups and tooltips now state `… · approx. <elev> m · <km> km along the route`; the dashed line keeps its "Illustrative waypoint connections — not a navigation track" label.
- `src/services/map-providers.ts`: `basemapOptions()` exposes Terrain and Streets always, Satellite only when a credited `https` tile template is configured — no dead layer button.
- `src/app/(tabs)/map.tsx`: layer chips, an expand-to-full-screen mode, and a measured header plus a fixed card allowance. The card scrolls inside its own allowance while Close and the actions stay pinned; the map keeps ~162 px with a card open and 657 px expanded, and cannot overlap the card.
- `src/services/routing/progress.ts` (`maneuverFractions`), `src/components/RouteProgressStrip.tsx`, `src/components/FullRouteMap.tsx`, `src/app/navigate.tsx`: hike time shows the walking route full-screen with layer chips, a progress bar carrying one tick per maneuver, remaining distance and climb. With no confident GPS fix the bar reads "Waiting for a confident position" instead of inventing progress. Route geometry carries no elevation, so no hike-time elevation profile is drawn.
- Honest states: `/navigate` without an account or without a `plan` id now says "Sign in to start a hike" / "Choose a saved plan" with a working next step, rather than a device-storage error. `trek-plan.tsx` validates `type`/`provider` on a destination passed through the URL.

**Validation performed (2026-10-20)**
- 124 client tests pass (`npm test`), including two new map-document tests that assert the exact waypoint label text for the selected and unselected cases; `npx tsc --noEmit` and `npx expo lint -- --no-cache` are clean.
- Browser at 591×693 on `localhost:8081`: basemap chips move the ✓ and switch the iframe to `tile.openstreetmap.org`; expand mode changes the map from 162 px to 657 px; the card's resting box is 12 px under the map with Close/Open trek/Preview trek on screen; `/trek-plan` routed Namche Bazaar → Lukla (19.58 km, 28 steps) and the hike full-screen map held 329 px with the progress strip in its uncertain-position state, dropping to 228 px when the direction list was expanded. `/ai` shows the offline service banner and re-probes on "Check the connection again".
- Saved-plan storage was exercised for a signed-in browser account (one Namche → Lukla plan). That plan is user data created during testing and can be deleted from `/adventures`.

**Still open.** No offline terrain-map downloader and no on-device routing engine — tiles, geocoding and walking routes all need a connection. Field behaviour on a phone with real GPS is untested. In the automated hidden tab, synthetic taps on Leaflet vector layers do not open popups and entering animations freeze, so those two behaviours were verified by unit test and by computed style rather than by screenshot.
