# Phase 2A — offline and GPS readiness

21 October 2026; source `4e525f9`. No new SDK, background task, permission grant, offline package or device-location request was implemented. **Verified** below means an executed check; **code inference** is source analysis; **unverified/blocked** marks missing runtime/device evidence. See [backend smoke test](backend-smoke-test.md) for this run's 60 client and 59 backend test results.

## Exact offline inventory

| Capability | What exists | Network requirement and evidence status |
| --- | --- | --- |
| Trip metadata | UID-scoped personal dates, meetup/origin notes, transport/stay notes, budget/expenses, bookmarks and activity summaries in trip-library-store | Code inference plus tested persistence; no new UI save or physical offline restart in Phase 2 |
| Walking route geometry | `adventure-store.ts` saves full selected geometry, endpoints, steps, provider distance/baseline and optional weather snapshot in RoutePlan | Local calculations need no routing network after a valid plan is available; store/decoder tests passed, airplane-mode cold-start unverified |
| Imported GPX | `route-store.ts` stores validated segments and optional file elevations; segment gaps preserved | Local GPX library/geometry/profile math can run without provider; file import/share still depends on platform facilities; no native import/share test |
| Trip pack | `offline.tsx` snapshots approximate catalogue waypoints, checklist, last crew/member positions, contact and cached AI itinerary | Snapshot, not live group/location/conditions; initial save needs any required fresh group roster; offline reading code exists, no real outage test |
| Navigation checkpoint | `navigation-draft.ts`: owning UID/plan, totals, phase/history, optional local path; serialized writes and 1.5 MB guard | Account-bound tests passed; resume paused. OS-kill recovery and expired-auth offline startup unverified |
| Basemap tiles | **No application-managed download** | Leaflet CDN and OSM/OpenTopoMap raster requests are online. Browser cache opportunism is not a downloaded region. No coverage index/download completeness/expiry guarantee. |
| Offline elevation data | **No DEM/terrain package** | GPX `<ele>` and static stop elevations may be stored as source values, not a surrounding elevation model. Phulchowki export had zero elevations. Raster contours do not populate route metrics. |
| Offline search | Small bundled landmark aliases and four catalogue overviews | Code inference; local matches can appear/fall back without Photon. New global discovery/geocoding needs provider; no full Nepal search index or fresh airplane-mode search test. |
| Offline GPS fixes | Foreground device watcher can supply fixes independently of mobile data, subject to permissions/receiver/OS behavior | Code inference; no physical-device test. Network loss must not be confused with GPS loss, and GPS availability is not guaranteed. |
| Offline navigation | Saved line, local progress/deviation math, optional text steps and schematic RouteSketch | Code inference plus math tests; surrounding terrain map absent. Real routing/recalculation, new POIs, weather, group updates, AI and alerts need network. |
| Cached inbox/preparation | Bounded dated inbox and durable preparation outbox | Local data is stale snapshot or pending write, not delivery or successful cloud sync. UID isolation/failure tests passed. |

All AsyncStorage data remains on the owning device/account namespace; this is not encryption or a cloud backup. Sign-out can retain trip data. The public sample GPX exported in this run is a separate audit file, **not** evidence that the user pressed Save walking plan or installed offline maps.

## Why locking the phone stops tracking

**Code inference, explicit application behavior:**

1. `useTrekLocation.ts` uses foreground permission and `watchPositionAsync`. Its effect only runs while enabled **and foreground**; changing AppState removes its subscription.
2. `navigate.tsx` listens for non-active AppState, checkpoints, changes active → paused and clears the last distance fix. Leaving focus also pauses. Returning requires a meaningful resume/reacquisition, not silent continuation.
3. `record-hike.tsx` calls pause/save on background or screen departure. It checkpoints totals every 30 seconds and does not store a GPS track. Reopening creates a new in-memory recorder; this is not a resumable active recording journal.
4. `useTrekSession.ts` is a separate cinematic/demo/live overview session. It pauses in background and persists summary/progress; approximate catalogue geometry never becomes a verified track.
5. `TrekLocationSession.tsx` deliberately stops crew uploads on background/blur. Last shared position can remain visible until hidden; recent-position eligibility is bounded separately. Local navigation and transmitting precise location must remain separate consent decisions.

No `TaskManager.defineTask`, `startLocationUpdatesAsync`, background permission request or background-location configuration flags were found in source/app config. `locationAlwaysAndWhenInUsePermission` is a permission-description string, not an implementation of background collection. `app.config.ts` conditionally configures Google sign-in, not background GPS.

### Platform prerequisites for a future approved implementation

Expo SDK57 documents `watchPositionAsync` as foreground-only. Background updates require a top-level task and background update API. iOS requires background location mode and appropriate Always permission; Android needs foreground/background permission handling and location foreground-service configuration as appropriate. Expo Go is not sufficient for the documented iOS background flow; use development builds. Process termination and Android vendor behavior can still stop updates. These are future requirements, not settings changed now. [Versioned Expo Location documentation](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

## Navigation calculation and lifecycle risks

- Freshness/accuracy gates are positive: progress suppresses unreliable fixes; sustained deviation requires accuracy allowance plus 30 seconds; tested matching handles overlaps/ambiguous geometry. These are tests of calculations, not a proof of navigation in switchbacks, forest or ravines.
- `recordFix` rejects old/bad fixes, implausible speed and jitter; gaps over 60 seconds restart segments rather than bridge missing movement. Consequently measured distance may undercount real travel with poor reception. Do not interpolate gaps as if surveyed.
- Navigation checkpoints run every 30 seconds and on background. Abrupt OS termination may occur before pending asynchronous persistence completes, so last seconds can be lost. No device test establishes a precise recovery-loss bound.
- Recalculation requires a fresh fix and network, replaces the selected route with the first returned option and removes optional stops. UI explicitly warns of stop removal. A future beginner flow should reconfirm required water/rest/exit constraints rather than silently assuming they remain on the route.
- At most 10,000 optional recorded path samples and capped local library size are retained. Long hikes/low storage require explicit UX and recovery tests. Privacy cleanup also needs an inventory covering the separate `trek-session:` summary prefix noted in Phase 1.
- App cold start still needs usable Firebase client configuration and authentication restoration. A valid cached plan does not by itself prove the signed-in route is reachable after token expiry or fresh offline boot.
- Online map assets are external resources. Keep local geometry/directions rendering independent from tile/CDN success; do not treat an already-loaded iframe as a cold-offline test.

## Required device test protocol — not executed

Use approved non-production accounts and a lawful, locally reviewed short route. Record OS/app build/device model, permission state, connectivity, screen/foreground state, sample timestamps/accuracy and expected recovery. Keep private tracks out of public reports; use local redacted summaries.

| Scenario | Required observation / acceptance | Current status |
| --- | --- | --- |
| Save route, airplane mode, remain foreground | Position/progress/directions available or explicit unavailable state; no fabricated basemap | Unverified on iOS/Android |
| Cold launch offline | Correct account/plan can open; dependencies or auth blocks reported honestly | Unverified |
| Screen lock for 2/10/30 minutes | Current build must visibly pause, not claim continuous tracking; future background build measured against approved requirements | Unverified physically; pause is code-established |
| Switch apps/return | No bridged distance jump; fresh reacquisition; sharing does not silently restart | Unverified |
| Force-stop/relaunch/process kill | Latest durable checkpoint recovered under right account, paused; no invented missing movement | Unverified |
| Poor GPS/outdoors/forest/stale updates | Accuracy/age visible; uncertain progress/ETA withheld; no false arrival | Pure guards tested; field unverified |
| Deny/revoke/approximate permission | Clear alternatives and Settings path; no permission loop or hidden sharing | Unverified native |
| Leave planned line for >30 seconds | Alert only with valid sustained evidence; reconnect reroute preserves or explicitly changes constraints | Calculation tested; device unverified |
| Low power/storage; prolonged hike | No silent data corruption; actionable storage error and measured energy use | Unverified |
| A/B crew sharing with offline/background transitions | Private/local recording stays separate from upload consent; stale marker timestamp/stop/hide semantics clear | Blocked by shared readiness/accounts |

## Ranked gaps and acceptance criteria

| ID / severity | User impact / evidence | Recommended next action and gate |
| --- | --- | --- |
| O1 / P1 | No downloaded basemap/elevation region; line alone lacks terrain context | Approve lawful offline scope/provider before implementation; airplane-mode cold-start region/asset/label/completeness tests required |
| O2 / P1 | Locking/background pauses all current trackers | Choose explicit foreground-only beta or approved background task/service/permission work; validate both platforms and OS limits before promising continuity |
| O3 / P1 | Physical cold-launch/kill recovery untested | Run device matrix and define durable journaling/data-loss limits; never invent path across missing fixes |
| O4 / P2 | Multiple stores/recorders, caps and cleanup paths differ | Inventory storage/version/migration/cleanup and account isolation; preserve existing data and verify every lifecycle |
| O5 / P2 | Local landmark fallback is not broad offline discovery | Define/label supported offline catalogue; test aliases and unavailable global search without connection |

This phase specifies the investigation and tests only. It does not install an offline engine, request background permissions or claim production GPS readiness.
