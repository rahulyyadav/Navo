# Navo Phase 1 — feature matrix

21 October 2026; checkout `4e525f9`. Status describes the complete user journey, not merely the existence of a component. **Verified** means the stated narrow behavior ran successfully in this audit. Unit/fixture tests do not constitute live/provider/device verification.

## Requested ten journeys

| # | Journey | Status | Evidence and limit |
| --- | --- | --- | --- |
| 1 | Open app and complete onboarding | **Partially verified** | Existing authenticated session opened Home. Final audit reload also checked. Completion/merge/storage tests passed; source commits completion locally first. New account creation, completing a fresh setup, sign-out/reinstall and cross-device sync were not performed. |
| 2 | Search hiking destination | **Verified, limited coverage** | Typed `Pulchowki` at `/trails`; Phulchowki hill appeared first and selected into planner. Remote results also included neighbourhoods/cafe/fuel POIs. Four detailed overviews are not Nepal-wide verified trail coverage. |
| 3 | View trail/details | **Verified for sampled overview** | Opened Mardi Himal overview, with image gallery, suggested duration, high point, unverified distance, planning warning and actions. Catalogue facts are static and not field-validated. |
| 4 | Display route on map | **Verified online for one route** | Botanical-garden entry → Phulchowki generated full-screen terrain preview, 6.76 km and 27 steps. Directions expanded. No GPS or field-access claim. |
| 5 | Distance/elevation/duration | **Partially implemented** | Provider distance and baseline visible. App explicitly says hiking duration unknown; ascent absent for OSRM. GPX can calculate source elevation; imported elevation is not independently verified or smoothed into authoritative ascent. |
| 6 | Plan/save trip | **Partially implemented / persistence tested** | Planner and save/start controls rendered. Account-isolated serialized plan/trip storage tests passed. No new saved trip was submitted in UI during this audit; cloud/group planning blocked. |
| 7 | GPS access | **Unverified on devices** | Foreground request/watch code, denial/timeout/accuracy guards exist and pure validation tests pass. No user's precise position was requested in this audit; no physical-device permissions test. |
| 8 | Follow route/deviations | **Partially implemented, field unverified** | Geometry matching and sustained deviation tests pass. Source requires fresh accurate fixes and 30 seconds of deviation after allowance. Full-screen preview works. No actual hike, reroute, locked-phone or two-device test. |
| 9 | Offline maps/trail data | **Partial trail data; basemap download missing** | Local route/checkpoint/snapshot/GPX storage exists and unit tests pass. `offline.tsx` explicitly excludes map tiles; `FullRouteMap` falls back to schematic RouteSketch. No map download manager, region packages or verified airplane-mode basemap found. |
| 10 | Resume after outage/restart | **Partially implemented / unit tested** | Account-bound navigation checkpoints restore paused, with serialized writes; local data survives simulated readers/failures in tests. Fresh app-process kill/restart, expired auth offline and real interrupted hike not tested. Standalone recorder stores totals, not an active-session resume track. |

## Additional capabilities

| Capability | Status | Detail |
| --- | --- | --- |
| Selected-date weather | **Verified online sample** | 21 October forecast loaded for selected route; sunrise 06:06, destination sunset 17:28 NPT and fetched time displayed. Forecast values are not observations or trail-safety certification. Out-of-range/invalid data guards covered by tests; every date/location not tested. |
| Water/rest/viewpoint/caution search | **Broken in sampled live request** | Overpass request reached a timeout; UI kept route and showed retry message. Decoder/cache tests pass. This is an observed service failure, not proof of permanent provider outage. |
| AI chat | **Broken/unavailable in current environment** | Shell service checker failed/timed out; browser UI reports account sync unavailable after detecting model configuration. These are different connectivity observations. Server integrations and safety tests pass with adapters; no live Nemotron answer obtained. |
| AI itinerary | **Implemented, operationally unverified/blocked** | Authenticated server planner and schema/audit/repair logic exist. No reachable main API configured; no generated live itinerary audited. |
| Shared groups | **Blocked in current build** | UI Create group disabled; main API URL absent. Backend membership/invite/message tests pass; no real two-account create/join/chat test. |
| Reviews/community | **Implemented, live unverified** | Moderated shared feed/submission/report backend and decoder tests exist. Main backend unavailable; no review was published or edited. No complete user-photo contribution system identified. |
| Hike recording | **Partial** | Standalone recorder saves foreground distance/time summaries; navigation separately supports optional local GPS path and GPX export. No background recording. |
| Notifications | **Partial** | Inbox/cache, local inspiration schedules, push token registration and server queue workers exist. Remote push needs native build/EAS credentials and active backend/worker. Delivery not tested. |
| Emergency use | **Limited crew tool** | Foreground consent-based group locations/check-ins/alerts; no rescue dispatch. No verified comprehensive emergency resource directory/offline emergency operation. |
| Transport/stay | **Personal planning** | Notes, budget/expense features and external direction links; no booking/payment inventory. Keep this scope explicit. |

## Confidence boundaries

No assertion that every button works, that every Nepal trail is indexed, that map labels prove legal entry, or that passing exports proves native execution. Existing signed-in browser access does not prove new-login/email delivery. All physical location, background, account deletion and public posting actions were left untouched. Refer to [current-state](current-state.md) for screenshot steps and [risks](risks.md) for required acceptance criteria.
