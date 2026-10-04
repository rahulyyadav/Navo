# Reference-driven hiking experience — October 2026

Navo remains a hiking app with transport and stay planning, as selected by the owner. These references guide hierarchy, photographs, rounded cards and lime/navy contrast; they are not evidence that travel inventory or payment providers exist.

## Reference coverage

| Supplied screenshots (time) | Adaptation in Navo | Boundary |
| --- | --- | --- |
| 22.18.02, 22.18.53, 22.19.27 | Photo-led discovery, compact inbox, region/search/difficulty/saved filters, map and planning actions, labelled bottom navigation | Four curated trek overviews; no invented popularity or reviews |
| 22.19.00, 22.19.35 | Larger destination photograph, elevation/stop statistics, persistent trek shortlist, preparation and map links | Licensed destination photographs; no invented coins, prices or bookings |
| 22.19.08, 22.19.42, 22.19.58 | City-to-trail approach planning, road/transit handoff, return pickup/turnaround notes | No flight inventory, live bus schedules, fares or reservations; confirm locally |
| 22.19.53, 22.21.28 | Foreground GPS distance and active-time recorder; saved activity summaries | No calories, fabricated distance goals, background capture or verified route line |
| 22.20.04, 22.20.20 | NPR trip budget, expense entries, remaining balance and approximate equal share | No payment collection, cards, transfers or currency conversion |
| 22.22.59, 22.23.25 | Existing #E4FF89 / #2A3437 / #19293A / white palette, readable system typography, rounded surfaces | Satoshi is not bundled without its licensed font asset; platform typography retained |

## Implemented in this phase

- Personal library: plans, saved treks and recorded walks, scoped to the signed-in account on this device.
- Day hike plans can be saved without a configured group server. Destination, date, Nepal departure time, expected people, origin, walking allowance and approach estimate persist.
- Trip details retain return transport, stays and NPR budget/expenses. Amounts use integer paisa; malformed, negative and excess-precision inputs are rejected.
- Writes are serialized per account, validated before persistence and preserve existing data on failure. Corrupt libraries are not silently overwritten. Explicit privacy clearing can remove them.
- The recorder requests foreground location only on Start. It rejects inaccurate, stale and implausible fixes, ignores jitter and never bridges pauses or long signal gaps. Summaries checkpoint every 30 seconds and on pause; raw GPS history is not stored or uploaded.
- Leaving the recording screen, locking/backgrounding the app, GPS errors and persistence failures pause recording. A new account gets a new recording session.
- Map layout keeps the approximate-waypoint notice visible; short screens can scroll to the selected trek's actions.
- Privacy controls include the new local plans, bookmarks, notes, expenses and activity summaries.

## Verification performed

- Local lint, TypeScript, 27 unit tests, and all-platform Expo export.
- Credential-free isolated web UI fixture at 375px: create Phulchowki plan, save return/stay notes and NPR 2,000 budget, add NPR 123.45 expense, reload and verify NPR 1,876.55 remaining.
- Bookmark Mardi Himal and verify the saved library.
- Online OSM tiles visibly render; selecting Mardi Himal focuses the map. Portrait and landscape inspection found and fixed an overlapping map notice and inaccessible short-screen sheet.
- The UI fixture replaces authentication/cloud contexts only outside the repository. It does not prove real login, live groups, push delivery or deployed service availability.

## Release gates still required

1. Deploy the backend and notification worker, configure Firebase server credentials and Firestore rules/indexes, then set a public HTTPS EXPO_PUBLIC_API_BASE_URL.
2. Set EXPO_PUBLIC_PRIVACY_URL and EXPO_PUBLIC_SUPPORT_EMAIL. The release checker currently rejects these missing values.
3. Configure server-only NEBIUS_API_KEY, NEBIUS_BASE_URL and the exact NVIDIA model identifier in NEBIUS_MODEL. Run the real model evaluation and retain evidence; no live inference is claimed by this phase.
4. On signed iOS/Android development builds, verify Google client registrations, email/password and recovery, onboarding and sign-out/account switching.
5. Run a two-device group journey: create, invite by link, accept/approve, check in, consent to sharing, trigger and resolve an alert, test push delivery and stale/offline positions.
6. Walk-test GPS accuracy, permission denial, phone lock, app interruption, low signal and storage failure. This recorder intentionally pauses in the background. A background-tracking release requires a separate implementation, consent and battery tests.
7. Obtain validated trail geometry and a tile service/offline licence before claiming trail navigation or downloadable maps. Current waypoints are planning overviews.
8. Confirm weather-provider production terms/capacity, forecast failure handling and attribution. Routing links are handoffs, not Navo-generated verified transport itineraries.
9. Test VoiceOver/TalkBack, enlarged fonts and reduced-motion settings on physical devices. Local browser checks do not certify accessibility on every device.

## Next implementation prompt

Continue in the existing Navo Expo repository. Read AGENTS.md and the matching Expo SDK documentation before native API changes. Preserve the hiking scope, licensed Nepal photography, lime/navy palette and Firebase authentication. Do not introduce payment collection, fake bookings, invented reviews, transit fares, verified-track claims or simulated production success.

First deploy and verify the existing backend using server-side secrets; never ship those secrets in EXPO_PUBLIC variables. Complete the public privacy/support configuration. Run a real signed-build login and two-device group journey. Surface actionable offline, loading, empty, permission-denied and retry states. Validate invitation expiry, membership authorization, account isolation, notification deduplication and delivery.

Connect the configured NVIDIA open model on Nebius server-side, run the existing evaluation suite, and document measured latency, cost and failure behavior. Ground recommendations in dated weather and confirmed route information. Keep route safety decisions and emergency actions explicit; AI output must remain a reviewable planning draft.

Before expanding navigation, integrate licensed validated GPX/route geometry and a production tile provider. Define offline coverage and data age honestly. For transport, use a provider with actual local coverage and display provenance; otherwise continue the current map-app handoff.

Add background recording only as a separate tested feature with clear consent, visible controls and platform lifecycle/battery validation. Preserve the current foreground recorder's stop and gap semantics. Test privacy deletion, storage failures and account switching.

Deliver a concise evidence-based report of what passed and what remains blocked. Run lint, typecheck, tests, export and CI. Commit only source and intended assets; exclude credentials and local QA fixtures. Merge to main only after checks pass and within the owner's authorization.

## Follow-up: My Treks and inbox storage

- My Treks adds search by name/meeting place/origin and upcoming/past/all filters using Nepal's date. Empty search results provide a one-tap reset.
- Notifications now distinguish a live server snapshot from an initial/cached snapshot, display unread counts and timestamps, and filter unread updates or invitations.
- A validated, account-specific local cache retains the latest 50 inbox items. Items older than seven days are discarded on opening the inbox. Privacy clearing removes this cache too. Personal trip plans remain device-local; this does not add multi-device plan backup.
- Cached notifications are visibly stale and cannot submit invitation or alert actions until a live snapshot returns. Initial snapshots no longer trigger a new-update banner.
- Shared page spacing accounts for narrow phones, font scale, wide screens and bottom safe areas on My Treks, notifications, trip details and recording.
- Validation: 29 client tests; lint/typecheck; all-platform export. Isolated UI fixture checks at 320×568 and 430×932 confirmed wrapping, search reset, unread filtering and cache persistence after a simulated disconnect/reload. Sample notifications were fixture-only; no invitation was sent or accepted.
- Physical-device large-text, VoiceOver/TalkBack, remote push and live multi-user journeys remain release checks.
