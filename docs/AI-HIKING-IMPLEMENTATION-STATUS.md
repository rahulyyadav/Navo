# Earlier GPX phase audit

The following documents the first GPX-only pass. It is superseded by [Connected planning and navigation](CONNECTED-PLANNING.md), which records the integrated search, routing, weather, navigation, history and UI changes.

# AI hiking brief: preservation audit and delivery status

10 October 2026. This is a status report, not a claim that the entire master brief is production-ready.

## Preserved baseline

The current baseline already contains Firebase login, onboarding, discovery/search, day-hike planning, weather, saved trips and expenses, preparation sync, group/invitation UI and backend, notifications, AI chat/planning, Leaflet OSM maps, foreground recording and the cinematic journey. No auth migration, tab replacement, map-provider migration or redesign of those completed flows was made in this pass.

The reported expo-sensors plugin error does not reproduce: SDK 57 has expo-sensors ~57.0.3 installed, and `expo config --type public` succeeds. Baseline typecheck, lint and 49 client tests passed before edits. Do not remove the existing sensor integration as a speculative fix.

## Added in this pass

My trips and Offline packs link to My routes. This is an additive, signed-in Expo Router screen using existing typography, colors, responsive page spacing and controls.

- System GPX file picker, maximum 2 MB and 20,000 points per route.
- XML validation, rejection of DTD/entity declarations and invalid coordinates/elevations.
- Track segments and route points, including namespace-prefixed GPX.
- Segment boundaries retained through parsing, storage, online map, offline sketch and export. Distance never spans gaps.
- Missing elevations stay unknown. Raw elevation totals are labelled as potentially noisy; they are not treated as verified ascent.
- Save up to 20 routes privately per account on this device; serialized writes, corrupt-data preservation, deletion confirmation and privacy cleanup.
- Online OSM track preview and local north-up geometry sketch. Map tiles are still online-only.
- Explicit foreground GPS overlay with position freshness, accuracy and distance from the imported line. Backgrounding pauses it. No raw location upload or new GPS-history persistence.
- Native share-sheet GPX export; browser GPX download. Temporary native export files are removed after sharing.
- Tests for segment gaps, namespace parsing, elevation uncertainty, malformed/unsafe data, round-trip export, corrupt storage, account isolation and failed writes.

New dependencies installed with Expo SDK 57 resolution: expo-document-picker, expo-file-system, expo-sharing; fast-xml-parser for cross-platform XML. Rebuild the development app to include new native modules. The sharing config plugin is for receiving shares/extensions; those features are not enabled for this outbound-only export flow.

## Remaining master-brief work

| Requirement | Current reality / next acceptance gate |
| --- | --- |
| Route alternatives, fastest/scenic comparison | No live routing-provider integration. Needs provider selection, server-side credentials, response validation and field review of Nepal coverage. Do not label any option “safest” without supporting data. |
| GPX navigation | Import, overview and GPS overlay work in code; no verified turns, automatic reroute, arrivals or remaining-time claims. User-imported files must not automatically become approved tracks. |
| Long-running navigation | Existing and new tracking are foreground-only. Background/lock-screen work needs a dedicated task service, permissions, native builds and real-device lifecycle/battery testing. |
| Recording history | Existing aggregate recording remains unchanged. Full raw path history/export needs explicit opt-in, storage/migration design, recovery and retention controls. |
| Hourly weather and route risks | Existing daily trailhead forecast remains. Hourly route-aware forecast, timestamped offline cache and daylight comparison need implementation and validation. Weather is not safety clearance. |
| Contextual AI guide | Existing chat and itinerary pipeline remain. Live routing/weather/GPS tool integration, authenticated context boundaries and evaluations still need work. |
| Cloud groups / notifications / AI | Backend deployment and provider configuration must be validated; earlier user confirmation said backend was not deployed. Local GPX functionality does not depend on the backend. |
| Offline map tiles | Not implemented. Requires a provider/licence allowing offline packs; never bulk-download public OSM tile servers. |
| Units / route recommendations / verified POIs | Still pending. Do not invent water, shelter, permits, trail closures, ratings or review counts. |
| Production readiness | Dependency audit, signed-in/device QA, background tests, supported provider quotas and real trail validation remain release gates. |

## Validation and manual checks

Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo config --type public`, and `npx expo export --platform all`.

On a rebuilt development app, sign in → My trips → My GPX routes. Import a genuine GPX with two disconnected segments. Confirm the gap stays empty, save, restart, reopen, export and reimport. Deny GPS then retry after granting permission. Background the app and confirm the overlay requires restart. Test portrait, landscape and large text. Test offline sketch with internet disabled. Confirm clearing downloaded data removes imported routes for this account only.

Automated exports do not verify native file pickers, GPS or share sheets. No physical-device validation is claimed.

The initial dependency audit reported 26 findings. A compatible shell-quote update removed the critical finding; 25 remain (3 moderate, 22 high). Its suggested broad fixes include incompatible Expo/RN downgrades. These were not applied blindly because preserving completed features is a requirement. Review the remaining dependency chains and apply compatible patches before production release.
