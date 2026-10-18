# Navo evidence-led readiness review — 17 October 2026

## Scope and verdict

Baseline: `f3d2caa`, Expo 57 / React Native 0.86, existing Expo Router application. This review preserves the existing app. It does **not** certify public release or field navigation. Code inspection, automated tests, public competitor documentation, public web UI observation, and static artifact analysis are distinct evidence sources.

Navo already implements destination discovery, walking-provider requests, full-screen online maps, saved geometry, foreground GPS recording, pause/recovery checkpoints, weather, GPX, account-scoped preparation/history, and server-backed group/AI interfaces. The presence of those implementations does not establish that the configured phone build can reach their services.

## Baseline and gaps

| Area | Existing implementation | Remaining acceptance requirement |
|---|---|---|
| Search | Regional references and aliases, Photon lookup; `pulchowki` returns Phulchowki in browser | Provider agreement/capacity, broader verified Nepal references, error/retry and slow-network phone checks |
| Routing | Walking OSRM adapter, provider geometry/instructions and snapping checks | Approved production endpoint; verify Kathmandu/Pokhara trails on foot; avoid treating OSM paths as safe/access-permitted |
| Navigation | Full-page map, GPS freshness/accuracy, deviation timer, saved checkpoints | Device GPS tests, intersections/out-and-back ambiguity, actionable next-turn distance, native validation of direct map pause/end controls |
| ETA | Provider duration scaled by pace and route progress | Explicitly distinguish baseline walking time from terrain-aware hiking ETA, especially missing elevation |
| Offline | Saved geometry/plan/recording and schematic fallback | No downloaded basemap or offline routing engine; validate cold start in airplane mode, storage pressure, interrupted saves |
| Lifecycle | Foreground tracking; pauses when app becomes inactive | Never advertise background tracking; test lock screen, permission revocation, app kill, resume and battery drain |
| Groups | Firebase Admin / Firestore authenticated API, membership rules | Reachable deployment and admin credentials, two-account invitation/chat/deletion tests, push delivery |
| AI | Server-side Nemotron adapter and grounded route context | Public server connectivity and authorized limits; local inference is not deployed-service verification |
| Weather | Date-specific hourly forecasts with validation | Unsupported forecast dates must remain unavailable; mountain conditions differ from forecast grid |
| Storage | Per-account local plans/history and recovery drafts | Restore after update, account switching, full disk, corrupted geometry; local data is not cloud backup |
| Privacy/security | Membership checks, account deletion controls, secret separation | Run rules emulator/security tests, publish real privacy/support details, review location retention |
| Imagery | Existing destination assets/galleries | Audit per-image provenance, distinctness, resolution and fallback; do not copy competitor assets |

## Changes delivered in this review

Route matching previously sorted all segment candidates for every fix and compared only the runner-up to decide ambiguity. Adjacent segments at a vertex could hide an equally close return leg farther along a loop. Matching now selects the best candidate in linear time and checks all geographically plausible, distant-progress candidates. It refuses confident progress when geometry cannot distinguish the route leg, even with a previous-progress hint. Invalid/negative accuracy cannot produce confident matches.

Upcoming maneuvers now include remaining distance along the current instruction span. Invalid saved geometry fails closed instead of throwing during navigation. Hiking arrival estimates are withheld when elevation is missing or timing comes from an assumed GPX walking speed; provider estimates still exclude breaks and are not safety guarantees.

Full-screen navigation now exposes Pause/Resume and End directly; ending opens a confirmation dialog rather than hiding confirmation below a long scrolling page. These controls reuse the existing checkpoint and session lifecycle. Native interaction still requires device validation.

Regression tests cover hidden overlapping return legs, adjacent non-overlapping vertices, and invalid accuracy. This is conservative: at genuine overlaps progress can remain uncertain until the hiker leaves the overlapping section. That is preferable to fabricating remaining distance.

## Architecture decisions

1. Retain Expo Router, current services, and backend; no speculative rewrite.
2. Keep route matching provider-independent and fail uncertain at ambiguous geometry. Do not let AI decide GPS position or invent trail safety.
3. Treat MapLibre as a potential renderer migration, **not** an offline-data solution by itself. Before implementation choose licensed tiles/regions, attribution, storage budgets, download cancellation/resume and a native development-build test plan. Do not bulk-download public OSM/OpenTopoMap tiles without permission.
4. Keep secrets on the backend. Do not put Nemotron or Firebase Admin credentials in Expo public variables to bypass server connectivity.
5. Preserve authentication/membership enforcement. Removing verification will not fix an unreachable backend.
6. Avoid voice/background-tracking dependencies until the navigation lifecycle and real-device acceptance tests pass.

## Prioritized implementation plan

**P0 — before inviting real hikers:** reachable HTTPS API with Firebase Admin; production-approved routing/search configuration; field validation of ETA limitations, upcoming-maneuver distances and map pause/resume/end controls; geometry validation at persistence boundaries; two-account group tests; device GPS/stale/off-route/recovery checks. Acceptance: no fake success states, existing plan retained after provider failure, no cross-account access, all controls usable on small phones.

**P1 — dependable offline:** licensed offline map source, region size estimate, storage quota, resumable download with checksum/version/expiry, delete/replace packs, offline search/routing capability separately labeled. Acceptance: cold launch in airplane mode with downloaded region and saved route, plus missing-pack and low-storage states.

**P1 — product polish:** consistent screen headers, reduce long explanatory text into contextual details, map-first route review, distinct licensed destination galleries, accessible text sizing, large targets and contrast. Acceptance: 320–430 px phone widths, large fonts, keyboard open, reduced motion, Android back and iOS safe areas.

**P2 — expansion:** structured community trail reports with provenance/moderation, verified rest/landmark information, optional voice cues, battery profiling, consented notification preferences. Do not label danger/rest locations from AI inference alone.

## Validation and manual work

Baseline 89 client tests passed. After the matcher fix: **94 tests passed**, Expo lint passed, TypeScript passed, and iOS/Android/web exports completed successfully. Exporting is not device installation or field validation. No dependency or native configuration changes. Linear selection removes sorting complexity; no device performance improvement is claimed without measurements.

Browser inspection at 390 × 844 verified the planner renders and `pulchowki` offers the correct hill reference. This was an unauthenticated web session, not native GPS or group verification.

Still required: physical iOS/Android route walk, permission denial/revocation, stale GPS and urban/mountain drift, restart recovery, long-session battery/memory measurement, airplane-mode cold start, Firestore rules emulator, two-user groups, push delivery, deployed Nemotron response, release configuration check. These are release gates, not completed tasks.

Free initial operation should remain a limited preview with local testing and the user-approved Render Free approach. Do not promise always-on service, unlimited routing, unlimited AI, or offline tile redistribution. No paid service was activated during this review. Hosting/credential gaps and provider terms must be resolved before a public launch claim.

See [competitor research](competitors.md) and [REA evidence metadata](artifact-evidence.json). Existing deployment instructions remain in [production setup](../PRODUCTION-SETUP.md) and [release handoff](../PUBLIC-RELEASE-HANDOFF.md).

### Release configuration check performed

`npm run check:release` failed with six concrete configuration gaps: public HTTPS `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_PHOTON_URL`, `EXPO_PUBLIC_WALKING_ROUTER_URL`, a public HTTPS chat endpoint (or omit the override to use the backend), and a valid `EXPO_PUBLIC_SUPPORT_EMAIL`. Environment files and secrets were not changed. These failures prevent a public-ready verdict even when code checks pass.
