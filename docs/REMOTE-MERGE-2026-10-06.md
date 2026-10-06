# Remote integration — 6 October 2026

Local `main` at `7f29847` was merged with remote `main` at `c8caf8a`. The local commit and all fourteen remote-only commits remain in the merge history. Recovery branch: `backup/local-main-before-remote-merge-20261006`.

## Preservation decisions

- Local home layout, blue gradient, Satoshi typography, transparent circular Home / AI / Map / Profile dock, trek detail presentation and primary preparation action take precedence over the remote replacements.
- Local swipe preparation, fixed trek selection, sharing, database endpoints, durable outbox, journey and cinematic OSM navigation remain intact. Critical preparation, navigation, font and chat files were compared against the backup byte-for-byte. No tracked files were deleted; ignored local environment files were not edited.
- Remote day-hike search/planning, saved treks, personal trip arrangements and recordings, invitation approval/revocation, group positions, inbox cache, privacy controls, workers, CI and release tooling are retained. Home links and search suggestions expose the additional features using the existing local design. Saved-trek controls are integrated into the local trek detail screen. New screens use Satoshi.
- iOS and Android retain `com.rahulyadav.navo` to preserve the active app identity. Font and sensor plugins coexist with the remote notification/native Google plugins.
- Chat still uses the signed-in app gate and optional loaded email metadata, without Firebase verification on `/chat`, as explicitly requested. Protected database endpoints retain Firebase verification; remote verified-email and rate-limit checks apply there.
- Both chat and structured itinerary generation use `nvidia/nemotron-3-super-120b-a12b` at the US Central Nebius endpoint. The remote planner's old endpoint restriction was corrected without dropping its structured-output transport, audits or measurement support.
- Remote attributed trek photographs and their credits are retained as content updates, within the local visual layout. Shared theme colors and home animation timing retain local values.

## Validation

- TypeScript: passed after regenerating Expo's ignored typed-route declarations for the new screens.
- ESLint: passed.
- App tests: 49 passed, covering local preparation/outbox and chat behavior plus remote trips, recording, search and inbox features.
- Backend tests: 65 passed, including protected identity, transactions, preparation, anonymous chat, planner audits and provider failures. Test configuration is mocked so real local secrets do not change expected results.
- Firestore rules: 7 passed against the local `demo-navo` emulator; no production deployment.
- Expo exports: iOS, Android and web passed.
- Expo dependency check: passed against the installed SDK's local compatibility map (network lookup unavailable during this check).
- Development backend LAN health: HTTP 200, AI configured.
- Git whitespace/conflict checks: passed; critical local files preserved byte-for-byte; no tracked-file deletions.

Physical-device interactions, native OAuth callbacks, production cloud credentials, push delivery and verified trail guidance still require their respective environment/device checks. Existing missing Firebase Admin credentials can still block protected cloud operations; chat remains independent of them. No push or deployment is included in this integration.
