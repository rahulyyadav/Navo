# Navo: map providers and cinematic live trekking

Updated 6 October 2026: OpenStreetMap remains the active provider at the owner's request. Google setup/migration below is deferred. The foreground cinematic journey implementation and its release limits are documented in [CINEMATIC_TREKKING.md](CINEMATIC_TREKKING.md). Verified trail data and background tracking remain release dependencies.

## Product outcome

After choosing a trek and completing preparation, the user taps Start Trek. Navo opens a calm cinematic journey view: a distinctive trekker indicator follows their real progress along a flowing trail, the scene responds gradually to slope, and the next verified checkpoint becomes more prominent as they approach it. A single Map control opens conventional Google Maps context without ending the session.

Use Satoshi, navy #19293A, slate #2A3437, lime #E4FF89 and white. Keep the trekker near the lower centre, trail and next checkpoint ahead, atmospheric mountain silhouettes behind. Use restrained depth, lighting and motion rather than game mechanics. The scene is a schematic journey visualization; do not imply its silhouettes depict exact surrounding terrain.

## Findings in the current app

- Native maps currently render Leaflet in a WebView; web uses an iframe. Both use OpenStreetMap/OpenTopoMap tiles.
- react-native-maps 1.27.2 is already installed and matches Expo SDK 57's documented version.
- The shared NepalMap component is used in the map tab and trek details. Its selection, bounds, position and noninteractive preview behaviours must survive migration.
- useMyLocation requests a single position. Continuous tracking, altitude, heading and trek-session lifecycle are absent.
- Four trek records contain sparse, explicitly illustrative waypoints, not verified GPX tracks. Distances along straight lines between these points must not become claimed trail distances.
- The map configuration has no Google Maps keys. Firebase configuration and Google sign-in OAuth client IDs are not a substitute for Maps SDK setup.

## Architecture decisions

### 1. Google Maps context

Use react-native-maps with the Google provider on iOS and Android. Use Maps JavaScript API for web. Keep a small shared component interface and separate platform adapters. Use the existing route data as approximate overview points during migration; draw navigation polylines only for licensed, verified tracks, or explicitly label a demo as illustrative.

Google supplies the visible basemap and, later, optional geographic lookup services. Do not keep a hidden map mounted to obtain GPS or progress: neither requires a map renderer. Mount the conventional map when needed and keep its required branding and attribution unobstructed.

### 2. Navo navigation engine

Inputs: device location fixes, heading, optional barometer, route geometry/elevation, independently sourced checkpoints, and session state. Outputs: measured position, accuracy/freshness, matched segment and confidence, route progress, remaining along-trail distance, next checkpoint, slope trend, and off-route status.

All navigation calculations run independently of Google Maps. Use approved dense tracks; Google walking directions are not assumed to describe Nepal's trekking trails. Nearby Google Places search is an optional later feature in the conventional Google map experience, not a source of invented water, shelter or bridge availability.

### 3. Cinematic presentation

Start with a custom 2.5D renderer: layered vector silhouettes, a perspective-projected route ribbon, animated indicator and a few checkpoint labels. Evaluate React Native Skia in a performance prototype before adding it; use Reanimated for transitions and camera values. A full photorealistic 3D world is outside the first release.

This renderer consumes a compact navigation snapshot and never owns geographic calculations. Cosmetic camera movement and interpolated animation must not alter measured progress. Cinematic terrain comes from original art and route/sensor information we have rights to use, never terrain reconstructed from Google Elevation API values.

### 4. Provider terms boundary

Google's terms restrict derived terrain, caching and use with non-Google maps. Before shipping a custom geospatial scene alongside Google Maps, review whether the scene is treated as a non-Google map and whether the intended combination is permitted; obtain clarification or change the integration if needed. Independent sourcing alone does not establish permission for every combined experience.

For the first migration, Google content stays inside the conventional Google map. The cinematic prototype uses Navo-owned/licensed data and is identified as schematic. Do not copy Google imagery, tiles, elevations or Places content into custom terrain or offline route packs. Keep source/licence metadata separate for every dataset. Provide the required Maps terms/privacy notices.

## User flow

1. Discover → trek detail → Prepare for this trek.
2. Preparation shows route-pack availability and allows Start Trek only for an approved live-navigation track. Unverified tracks offer an explicitly labelled demo, not live guidance.
3. Start requests location permission, obtains an acceptable fix and confirms route/direction. If far from the route, show the actual location and distance to the trail rather than advancing the trekker onto it.
4. Transition to the cinematic scene. Essential controls: Back/session, Map, Re-centre, Pause/Resume and End Trek. A compact status area shows next checkpoint, along-trail distance and location quality.
5. Map and scene modes share the same active session. Switching views does not restart tracking or lose progress.
6. Ending the session stops location and sensor subscriptions and saves a local summary. Resuming after interruption obtains a fresh fix before moving the indicator.

## Movement, elevation and uncertainty

- Validate timestamps and accuracy; reject duplicate/out-of-order fixes and physically implausible jumps. Handle missing altitude and heading.
- Match the position to nearby route segments using accuracy, prior segment and plausible movement. Hairpins, crossings and return legs must not snap to the wrong segment. Track forward and backward travel instead of forcing monotonic progress.
- Retain raw location and route-match confidence separately. When matching is uncertain or off-route, show that state and avoid displaying a falsely precise on-trail avatar.
- Interpolate between accepted fixes over a bounded interval. Do not continue apparent forward movement indefinitely when GPS stops. Show last-fix age and a degraded signal state.
- Estimate direction from displacement while moving; smooth angle changes through the shortest rotation. Avoid compass jitter or walking animation while stationary.
- Derive upcoming trail slope mainly from the approved route elevation profile. Use GPS altitude with vertical accuracy and optional calibrated barometric relative change to refine the trend. Pressure changes do not independently establish absolute altitude.
- Filter elevation changes over a distance/time window and use hysteresis for climbing, descending and level states. Drive camera pitch and ribbon slope continuously, without abrupt scene swaps.
- Checkpoint distance is remaining distance along the matched track; proximity alone does not establish arrival. Backtracking and GPS uncertainty affect checkpoint state.
- Show only documented landmarks with provenance; unknown conditions and absent POIs remain unknown. The example bridge, tea house and water point in the brief are examples, not confirmed records.
- Support reduced motion with a stable camera and simpler position transitions. Never conceal degraded location quality for visual polish.

## Session and data contracts

RoutePack: id/version, geometry, cumulative distances, elevation profile and datum when known, ordered checkpoints, source/licence, verification status/date, direction and download integrity.

LocationFix: latitude/longitude, horizontal accuracy, altitude/vertical accuracy when available, speed, heading, timestamp.

NavigationSnapshot: session/route ID, raw fix, matched position/segment, match confidence, progress and remaining distance, cross-track distance, slope trend/confidence, next checkpoint, tracking state and freshness.

Session: preparing, acquiring GPS, active, paused, degraded, ended. Persist only the information needed for local resume/history; do not send raw movement to AI or cloud services by default. Any sharing follows an explicit product setting.

## Delivery sequence and acceptance gates

### Phase 1 — Migrate the existing map to Google Maps

- Configure platform keys through Expo app configuration/build environment. Enable Maps SDK for Android/iOS; enable Maps JavaScript API only if web is required.
- Restrict Android keys to com.thakurbibek.navo and the correct development/release signing SHA-1s; iOS to com.thakurbibek.navo; web to approved referrers. Restrict each key to its intended API. Use separate server credentials for any future server API calls.
- Replace the native Leaflet WebView with native MapView; replace the web iframe map provider while preserving its supported behaviours.
- Preserve all four trek selections, focus-on-location, Nepal reset, trek-detail previews and deep links. Keep Google attribution visible around the navigation dock and selected-trek sheet.
- Add loading, missing configuration, denied permission and network failure states. Handle map readiness before applying camera commands and avoid resetting the camera on every render.
- Validate with fresh development builds on real iOS and Android devices; exports alone do not prove native SDK keys work. Do not rely on Expo Go for final Google-provider verification.

Done when both native platforms display Google Maps with working selection, camera and location controls, the shared detail preview still works, and keys/attribution are verified. Web passes if included. Existing routes remain clearly approximate.

### Phase 2 — Establish usable trail data

- Obtain one approved Annapurna Base Camp track with explicit usage rights and elevation/checkpoint data. Record verification and source information.
- Import, validate and version the pack. Check continuity, direction, elevation anomalies and checkpoint placement. Provide a separate recorded/synthetic replay dataset for development.
- Pack geometry/elevations/checkpoints for offline calculations without downloading Google basemap tiles.

Done when route provenance, geometry, elevation and checkpoint accuracy are reviewed. If this data is unavailable, cinematic work continues only in labelled demo mode.

### Phase 3 — Build and test live navigation independently

- Add continuous foreground location watching with cleanup and a session controller. Add filtering, route matching, progress and upcoming checkpoint calculations.
- Build a simple diagnostic UI/replay tool before cinematic rendering.
- Test stationary noise, normal walking, slopes, hairpins, backtracking, crossings, off-route movement, inaccurate/absent altitude, stale fixes, permission changes and interrupted sessions.

Done when deterministic replay tests pass and a field walk against the approved route demonstrates credible tracking. Foreground tracking stops or is marked suspended when the app backgrounds; do not claim lock-screen tracking yet.

### Phase 4 — Cinematic 2.5D experience

- Prototype Annapurna Base Camp first using approved route data and original visual assets.
- Add perspective trail, glowing oriented trekker, smooth following camera, route-completion effect, upcoming checkpoint labels and elevation-aware motion.
- Add subtle atmospheric layers and haptics only where they help. Keep the next checkpoint prominent and limit competing labels.
- Transition between cinematic and traditional modes without breaking the session. Complete the provider-terms integration gate before shipping the combination.

Targets: smooth motion on representative mid-range devices, no unbounded animation/extrapolation, stable memory during a long replay and reduced-motion support. Measure frame times and battery cost before setting a supported performance claim.

### Phase 5 — Reliability and field release

- Add background/lock-screen tracking using Expo's supported background location/task APIs and a new native build, with explicit permissions and visible tracking state. Verify platform lifecycle behaviour; app termination is not assumed to preserve tracking.
- Add robust local resume and offline packs, battery-aware update intervals, thermal/performance checks and privacy controls.
- Test both platforms in poor connectivity and mountainous GPS conditions. Verify that loss of Google map connectivity does not destroy the independently stored session/route calculation state.
- Release to a small field-testing group before general availability. Expand to other treks after each route passes the same data gate.

Done when field testing validates tracking, degraded states, resume, mode switching and long-session battery behaviour. Offline capability means route data and device GPS work locally; Google basemap availability is not promised offline.

## Setup needed from the project owner

Confirmed by the owner: Google Maps project/billing/SDK keys are not configured yet. This is the first implementation dependency.

1. Open Google Cloud Console and select the existing Firebase-linked project, or create a dedicated Navo Maps project.
2. Attach a billing account and configure budget alerts and service quotas. Budget alerts alone do not cap spending. The owner completes billing and terms acceptance.
3. In APIs & Services → Library, enable Maps SDK for Android and Maps SDK for iOS. If the web app is in scope, also enable Maps JavaScript API. Do not enable Places, Routes or Elevation services just for this migration.
4. In APIs & Services → Credentials, create separate API keys for Android, iOS and optional web. Set API restrictions and the application restrictions described in Phase 1.
5. Obtain the actual signing SHA-1s for development and production Android builds; the package name alone is insufficient. Register the iOS bundle ID and approved web origins.
6. Store keys outside committed source. Planned build variables: GOOGLE_MAPS_ANDROID_API_KEY and GOOGLE_MAPS_IOS_API_KEY; optional browser variable EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY. Native build configuration will consume the platform keys. Mobile and browser keys are embedded client identifiers, so restrictions are required even when their environment files are ignored.
7. Generate new iOS/Android development builds after native Maps configuration changes. Verify both Maps SDKs on devices before calling the migration complete.
8. Add the Maps notices to the application's published privacy policy and terms as part of release preparation.

Google Cloud project with billing configured, Maps SDKs enabled and restricted keys for the target platforms. Firebase's existing project may be reused if the appropriate Maps services are enabled. Do not paste credentials into chat; store them in the agreed local/build environment. Cloud billing/terms setup is performed by the owner.

An approved trail-data source and usage rights are also required before live trekking navigation is enabled. Start with one route rather than assuming the four existing overview records are ready.

## Sources checked

- Expo SDK 57 react-native-maps: https://docs.expo.dev/versions/v57.0.0/sdk/map-view/
- Expo SDK 57 location: https://docs.expo.dev/versions/v57.0.0/sdk/location/
- react-native-maps installation: https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md
- Google Maps Platform terms, especially section 3.2: https://cloud.google.com/maps-platform/terms
- Elevation policies: https://developers.google.com/maps/documentation/elevation/policies
