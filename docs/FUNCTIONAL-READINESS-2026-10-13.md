# Navo functional readiness — 13 October 2026

## Verdict and evidence

Not ready to claim a fully functional public release. The local walking-route flow has improved, but connected functionality and production configuration remain launch gates. This is a source/configuration/test audit, not a fresh physical-device or production acceptance test.

Audited main ba02eb2. Fresh checks: TypeScript passed; Expo lint passed; 80 client tests passed; 76 backend tests passed (one TestClient deprecation warning). Release configuration check failed on six settings below. Passing automated tests does not demonstrate live Firebase, model, push or GPS operation.

## P0: connect and verify the real services

| Requirement | Evidence / remaining action | Acceptance test |
|---|---|---|
| Public backend | Local development is not a public phone service. Render deployment health has not been demonstrated in this audit. Confirm build/start commands, secrets, CORS and `/health`. | Two physical phones on separate networks connect after both warm and cold starts. |
| Firebase Admin | Last inspected local setup lacked Admin credentials. Verify credentials privately in hosting; never bundle them in the app. Deploy rules/indexes and verify the intended Firebase project. | Verified account connects, writes preparation, creates a group, and another account joins; unrelated accounts cannot read it. |
| Production endpoints | `check:release` rejects API, chat, Photon and walking-router URLs. Development provider defaults do not carry into production. | Release build searches an arbitrary place and receives a real walking route without a laptop. |
| AI service | Chat now requires verified Firebase authentication and a server-side model key. Configured local model credentials alone do not enable hosted AI. | Authenticated chat and itinerary generation succeed; missing credentials, cold start, timeout and quota errors are actionable. |
| Email verification | Backend still requires verified email. Removing UI labels cannot solve server authentication or email delivery. | New account receives verification, follows link, refreshes token and connects; resend/reset flows work. |
| Privacy/support | Release check also rejects missing public privacy URL and support email. | Links work in release and describe actual location, model, account and retention behavior. |

Six failed keys: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_CHAT_BASE_URL`, `EXPO_PUBLIC_PHOTON_URL`, `EXPO_PUBLIC_WALKING_ROUTER_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`.

## P1: confirmed implementation gaps

1. **Preserve a guest plan through sign-in.** `src/app/trek-plan.tsx` keys Planner by user ID; changing authentication remounts it and resets local origin, route, stops and departure state. Persist a pending draft and restore the intended screen after authentication/onboarding. Test guest route → sign in → save/start without re-entry.
2. **Budget all AI endpoints.** `/chat` uses the daily global/user budget and kill switch. `/plans` and revisions use a separate five-attempts-per-hour user quota, not the same global daily budget. Apply shared controls before provider work; test exhaustion, retries and concurrent requests. Request limits are not a monetary spending cap.
3. **Deliver message notifications.** The message endpoint stores a message but does not enqueue a push notification. The existing push worker handles alert jobs. Add message-specific jobs, recipient checks, preferences, deduplication and deep links; test foreground/background/terminated delivery on two phones.
4. **Run notification workers.** Push and overdue-check-in workers exist as bounded scripts but need a deployed scheduler and receipt/retry monitoring. Do not advertise reliable background group alerts before this exists.
5. **Provide account deletion.** Privacy currently clears local trip data; no account-deletion implementation was found. Add reauthentication, cloud cleanup, group ownership handling and a clear history/retention policy. Test deletion without deleting other members' data.
6. **Make readiness truthful.** `/health` marks Firebase configured from the project ID alone. Separate liveness from readiness and safely verify required dependencies; do not expose secrets in diagnostics.

## P1: navigation and data acceptance gates

- Validate real trail geometry and access conditions; catalogue waypoint geometry is explicitly illustrative. Never treat it as a surveyed navigation track.
- Test permission denied, approximate location, stale GPS, drift, poor signal, off-route recalculation and cancellation on iOS and Android. Current navigation is foreground based; screen-lock/background continuity is not established.
- Unknown ascent must not produce a confident hiking ETA. Add explicit one-way/return planning, turnaround time and appropriate daylight comparisons; a flat walking baseline is insufficient for a mountain return time.
- Offline trip packs do not establish offline basemap availability. Test downloaded content in airplane mode, distinguish unavailable tiles from saved route geometry, and implement licensed offline maps if required by the product promise.
- Verify saved plans after restart/sign-out/sign-in, account isolation, interrupted writes and low storage. Personal device plans are not automatically a cross-device backup.
- Test GPX import/export/share using real files and an independent viewer, including malformed and large tracks.
- Validate forecast date limits, timezone, expired cached data, offline failure and mountain-location precision. Do not substitute invented weather when the provider fails.
- Complete two-account tests for invitations, revoked links, membership removal, chat, group edits, live-position expiry and check-ins. Invitations currently use the in-app inbox, not guaranteed email delivery.

## P2: product polish and operational work

- Improve autocomplete ranking: trail/peak matches first, nearby relevance, spelling variants, country context, useful empty states. Phulchowki aliases are already implemented; test other destinations too.
- Replace free-text departure inputs with accessible date/time selection while preserving validation and timezone clarity.
- Check small phones, large fonts, keyboard avoidance, screen readers, tap targets and safe areas across every screen. Recent browser route checks do not replace native accessibility testing.
- Verify distinct destination photos, image credits, loading/error states and reduced-motion slideshow behavior on slow connections.
- Keep connection diagnostics concise and recoverable; preserve form input on retry. Avoid exposing backend setup jargon as the user's main action.
- Review dependency advisories for reachable risk, update SDK-compatible dependencies, and run dependency diagnostics. An earlier dependency audit reported advisories; it was not rerun here.
- Add redacted error monitoring, provider quota alerts, data recovery procedures, release rollback and a support workflow. Avoid logging tokens, private messages or precise location unnecessarily.
- Test a signed release/development build on real iOS and Android devices, not only Expo web. Verify native Google sign-in, notifications, permission descriptions and app links.

## What is already improved

The latest merged work automatically requests a fresh foreground start location when none was chosen, preserves an explicit start, shows progress/errors beside Find walking routes, and opens a compact review view after success. Phulchowki aliases, terrain tiles, distinct licensed images, local saved plans, chat authentication and chat budgets are present. These should be preserved while closing the remaining gaps.

## Recommended order

1. Verify Render/Firebase/model configuration and fix the six release settings.
2. Preserve guest drafts, cover all AI endpoints with budgets, implement account deletion and reliable notification jobs/scheduling.
3. Run the two-account and physical-phone navigation acceptance tests above.
4. Start a limited private pilot with explicit foreground/offline limitations; expand only after fixing observed failures.

The no-cost preview constraint remains in force. No paid resources, deployments, notifications or credential uploads were performed by this audit. Free-preview availability must not be presented as guaranteed production uptime; confirm provider terms and quotas before inviting users.
