# Hackathon readiness — 28 October 2026

## Verified locally

- The backend was restarted using `npm run backend:dev`; `/health` and `/ready` both returned HTTP 200 on port 8114.
- Backend tests: 215 passed. Client tests: 180 passed. Expo lint and TypeScript type checking passed.
- A saved Mardi Himal journey opened on the web with its route summary, budget caveat, stage review and research panel. The saved plan predates per-call evidence, so the panel correctly says no call record is available for it. Unknown times, fares and source gaps are visible.
- A three-case live Nemotron evaluation made nine successful provider calls, but all three final itineraries failed the independent validator. See [evaluation](EVALUATION-2026-10-28.md).

## Not yet verified

- `npm run check:release` fails because `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_PHOTON_URL` and `EXPO_PUBLIC_WALKING_ROUTER_URL` lack public HTTPS values, and `EXPO_PUBLIC_SUPPORT_EMAIL` is missing. No production URL was guessed.
- The Render workspace is signed in through Chrome, but its project page displayed only a blank content area on inspection. No public service URL or deployment health was verified.
- No clean-browser judge walkthrough, two-device group test, native push/OAuth test, public YouTube video or field validation was completed in this check.

The app is suitable for a controlled local demonstration. It is not yet a verified public demo or a source of navigable, certified trek directions. A reviewer should see the actual unresolved checks before treating a plan as usable in the field.
