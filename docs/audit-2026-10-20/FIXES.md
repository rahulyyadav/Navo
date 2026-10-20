# Audit follow-through — 20 October 2026

## Implemented

- Returning users can enter Home without being mistaken for new accounts when a device/profile record is unavailable. Brand-new accounts are offered setup; explicit Set up later is remembered without inventing experience or emergency details.
- Completed local answers cannot be replaced by an incomplete cloud draft. Valid newer completed answers are restored and cached. Legacy profile records can restore completion. Profile editing no longer clears the completed flag, and Close preserves existing answers.
- Onboarding commits to device storage before cloud sync. Derived-profile cache failure does not hide saved answers. Firestore profile restoration runs independently of backend group setup while preserving ownership/security rules.
- Home now opens one combined trail/place search. Nepal is the default scope with an explicit Worldwide option. Landmark aliases remain first, provider labels include area/type, and duplicate labels receive coordinates. Place matches are independent of the small overview catalogue.
- Discovery uses a compact layout with optional filters. Bottom navigation has visible labels, readable background and no decorative chevrons.
- Removed straight-line stop totals from prominent walking-distance/ascent metrics. The underlying illustrative stop-elevation data remains explicitly identified as such.
- Crew location-sharing UI/session stays mounted across full-screen/details transitions; explicit consent and current account/group guards remain. Two-device continuity still requires verification.
- AI connection status checks account readiness as well as model configuration. It no longer claims live inference from a configured key alone.
- Mapped facilities use a read-only GET request, route-specific bounded caching, dated stale fallback, cancellation and timeout recovery. There are no fabricated facilities or safety claims. This is an in-memory cache, not an offline map download.
- Added `npm run check:services` for backend liveness/model/readiness checks without logging secrets or server response bodies.

## Verification

- Lint, TypeScript and 131 client tests passed after these functional changes. Web, iOS and Android exports also passed (bundling, not native device certification). Regression tests cover stale cloud drafts, legacy recovery, returning/new account routing, account isolation, malformed profile records, readiness failure and facility cache/cancellation behavior.
- Browser: signed-in Home survives reload; Edit setup opens with Close and closing/reloading stays on Home; Pulchowki resolves to the hill from combined discovery and hands its destination into the planner. Small-screen discovery was measured at 320 CSS pixels without horizontal document overflow. Screenshots captured at phone sizes.
- No new account preferences, emergency contacts, invitations, shared messages or public reviews were submitted during regression checks.
- Production configuration still fails on the six previously audited endpoint/contact settings. Fixing code does not manufacture a hosted service address or server credentials.

## Still blocked or requiring separate validation

| Area | Remaining work / dependency |
|---|---|
| Live AI, shared groups, reviews and notifications | Firebase Admin credentials, reachable backend URL, rules/index deployment, authenticated end-to-end and two-account tests |
| Firebase console inspection | The supplied project URL redirected to Google sign-in; automatic approval review denied access to the private Google session. User approval or manual setup is needed; no alternative browser was used to bypass it |
| Native map migration | A MapLibre proof-of-concept, approved production style/tile source and rebuilt iOS/Android app; preserve working map features until validated |
| Offline basemaps | Licensed tile resources, downloads/storage/checksums and airplane-mode cold-start testing; current geometry/snapshots are not complete maps |
| Reliable background GPS and notifications | Platform setup, consent, development/release builds, locked-screen/battery and real-device delivery testing |
| Nepal trail verification | Licensed/field-reviewed tracks, measured elevation, dated access/facility references and locally checked return logistics |
| Weather/provider launch capacity | Confirm commercial-use rights and production quotas; do not treat public demo services as guaranteed infrastructure |

Use the detailed audit and implementation prompt in this directory for the remaining phases. This change is not a claim of full public-release or field-navigation readiness.
