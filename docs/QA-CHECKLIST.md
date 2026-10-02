# Verification and two-device acceptance

## Automated checks

```sh
npm ci
npm run typecheck
npm run lint -- --no-cache
npm test
npx expo-doctor
npx expo export --platform all --output-dir output/verified-build
cd backend
.venv/bin/python -m pytest -q
```

Firestore rules tests require Java 21 and the Firebase CLI. They use the isolated `demo-navo` emulator project, never real credentials:

```sh
npx firebase-tools emulators:exec --only firestore --project demo-navo "npm run test:rules"
```

The local machine currently has no Java runtime; this rules suite is supplied and wired into CI but is not yet locally verified. Python state-machine tests use an in-memory adapter and do not substitute for Firestore contention or rules tests.

## Two-phone flow (staging only)

1. Install the same development build on phones A and B. Configure staging Firebase, backend, indexes and workers. Use two test accounts you control, verify both email addresses and confirm Connected in Groups.
2. On A, create a trek group. Confirm its roster contains only A. Invite B by the email B used to connect. Confirm A is not allowed to invite an existing member or send the same pending invitation twice.
3. On B, open Your updates. Decline once and verify no membership access. Invite again from A, accept from B, and confirm both phones show the new roster. A third account must not read the group, messages, alerts or coordinates.
4. Exchange chat messages. Disconnect one phone, attempt a send, reconnect and retry. Confirm no false sent state or duplicate document. Confirm a reload retains server history.
5. Use Check in safe & share position on B, granting location permission explicitly. On A, inspect timestamp and accuracy. Deny permission and test indoors/no GPS as well. Stop sharing on B: the current marker should disappear and reminders pause; historical check-in records remain until retention/deletion processing.
6. Send a clearly labelled group test alert as owner A. Confirm B sees it, acknowledges once, and A can resolve it. Ordinary members must not send owner test alerts or resolve someone else's alert. Exercise SOS only with your test crew after warning them; it never calls rescue services.
7. Register push on both devices and background B. Run the push worker; verify the notification opens the correct alert. Inspect tickets/receipts separately from user acknowledgment. Test denied notification permission and a removed group member.
8. With an opt-in check-in overdue in staging, run the check-in worker. Confirm one missed-check-in event, one notification per recipient and no repeats on the next pass. Do not manipulate production check-in times.
9. Configure the exact Nemotron ID. Generate a plan and inspect route stop checks and repair audit. Test an impossible duration, unavailable model, timeout and hourly quota. Rejected drafts must never appear approved. Enable the labelled demo flags only for an intentional ascent-fault demonstration, then disable them.
10. Save a trip pack while connected, enable airplane mode and reopen it. Verify waypoints/contact/checklist are readable and clearly timestamped. Map tiles and group updates must not be presented as available offline.
11. Sign out and switch accounts. Check no prior user's profile, group, message or notification appears. Test email reset and Google cancel/success on both platforms and cold-start session restoration.

## UX and device checks

- Phone widths 320/390/430, tablet, large text, keyboard open, long names, long translated copy.
- VoiceOver/TalkBack labels, focus order, slider activation, reduced-motion setting and keyboard-only web access.
- Low connectivity, unavailable backend, expired auth, permission denied, failed tile load, stale saved pack.
- Battery use and listener cleanup after leaving group/map screens; no background location tracking is promised.
- No dead controls, unlabeled simulated data, fake safety status or hidden errors.

## Current evidence

TypeScript, lint, unit tests and exports are rerun as implementation changes. The final response reports the latest completed results. Live Firebase, Nemotron, push and two-device end-to-end flows require the owner's server configuration and cannot be inferred from compilation or fake-store tests.

## Recorded verification — 2026-10-02

- TypeScript and ESLint: passed, no lint warnings.
- App unit tests: 15 passed. Backend tests: 28 passed (one upstream Starlette/httpx deprecation warning).
- Expo Doctor: 21/21 passed after SDK patch alignment.
- Production JavaScript exports: web, iOS and Android completed. These are bundles, not signed native builds.
- Browser at phone width: onboarding keyboard activation, full-page exit into login, blank-form validation, signup navigation and password controls inspected.
- Isolated preview generated from the actual map document: OpenStreetMap tiles and OpenTopoMap terrain loaded, Everest/Langtang selection and zoom worked, attribution remained visible, UTF-8 text and layer-loading feedback verified. This tests the shared map document, not authenticated group data, device GPS or the native WebView.
- Local secrets and generated previews are ignored by Git. Production preflight intentionally fails for missing backend URL, Google IDs, privacy URL and support email.
- Firestore rules emulator suite is wired into CI but was not run locally because Java is absent. Live Firebase/Nemotron/push and two-device acceptance remain unverified.
