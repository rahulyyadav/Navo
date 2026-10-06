# Cinematic trekking on OpenStreetMap

Implemented 6 October 2026. Google Maps migration is deferred at the owner's request; no billing or Google API keys are needed for this version.

## Available now

Start Trek from preparation, a trek detail screen, or the map's selected-trek sheet. The journey screen offers two explicit modes:

- Preview journey: simulated movement over the bundled approximate waypoint geometry, a following 2.5D scene, oriented glowing trekker, elevation-responsive mountain layers, checkpoint labels, progress and adjustable playback speed.
- Live GPS: continuous foreground position updates, accuracy and stale-signal reporting, nearest overview matching, direct distances to known waypoints, conservative recorded movement, GPS altitude trend and optional barometric relative trend. Raw GPS and confidence remain separate. No verified trail guidance is claimed.

Both modes support pause/resume, end confirmation, a local summary, local session restoration and switching between the schematic scene and OpenStreetMap without restarting the session. Returning from background pauses the session and requires manual resume/fresh GPS. Leaving the screen unmounts location/sensor watchers. Stored session state is namespaced by user and route; it contains elapsed time, demo progress and aggregate movement, not raw coordinates. The mode and paused state are retained on restore.

The renderer uses original SVG mountain layers with the existing trek photograph as atmosphere. These are schematic rather than accurate 3D terrain. Reduced-motion mode removes breathing and camera easing. Camera interpolation is bounded, and it does not extrapolate indefinitely after GPS stops.

## Architecture

- `src/services/trekking/navigation.ts`: map-provider-independent geometry, validation, route matching, checkpoint distances, bearings and altitude filtering.
- `src/hooks/useTrekLocation.ts`: permission, subscriptions, acquisition timeout, accuracy/freshness and app lifecycle.
- `src/hooks/useTrekSession.ts`: separate live/demo sessions, playback, elapsed time, aggregate movement and local persistence.
- `src/hooks/useBarometricTrend.ts`: optional relative pressure trend. It is not absolute altitude or a weather-independent measurement.
- `src/components/trekking/CinematicScene.tsx`: bounded camera interpolation and layered 2.5D rendering.
- `src/components/trekking/TrekJourney.tsx`: start/session/degraded states, controls and provider-view switching.
- `src/components/NepalMap.*` and `maps/document.ts`: existing OpenStreetMap/OpenTopoMap adapter. Position updates no longer reset the user's map camera. Selected waypoint connections are dashed and explicitly illustrative.

A future Google adapter should implement the same region, regionNonce, selectedId, myCoords, followUser, interactive and onSelectTrek contract. Neither session logic nor scene geometry needs to depend on Google APIs. Recheck provider terms/attribution before introducing Google content.

## Limits and remaining release work

Current trek records have sparse illustrative waypoints. A verified, licensed GPX track with approved elevations/checkpoints is required before enabling trail guidance, meaningful along-trail distances or arrival/off-route alarms. No bridges, tea houses, water points or trail conditions are invented. The demo distances describe the supplied geometry; live waypoint distances are labelled direct.

The ABC source research is saved in [the candidate data folder](../data/trails/candidates/README.md). OSM relation 17548991 is openly reusable under ODbL, but its current snapshot has two disconnected components, a minimum 203.6 m gap and no elevation samples. Its segmented GPX is deliberately excluded from navigation until reviewed.

This version intentionally implements foreground tracking. Background/lock-screen recording is not implemented: it needs a TaskManager-based service, foreground notification on Android, background permission/configuration, development builds and field validation. Do not present this build as background navigation.

Bundled route data, fonts, scene and local session state are usable offline after installation. The conventional map loads external Leaflet assets/online tiles and requires connectivity; no offline basemap pack or bulk tile download is included. For production, use a suitable tile service and follow its usage policy.

GPS and sensor integrations need physical iOS/Android testing, including poor fixes, permission denial/revocation, battery use and process interruption. Exports and replay tests do not establish field accuracy. Full photorealistic 3D terrain and verified nearby-POI sourcing remain later work.

## Validation

`npm test` includes geometry boundary/duplicate points, backtracking, uncertain crossing, off-route/poor fixes, duplicate/stale/future fixes, impossible jumps, checkpoint order, bearing wrap and elevation uncertainty; map adapter tests check that GPS updates preserve camera position and inline data is safely escaped.

Run `npm run typecheck`, `npm run lint` and Expo exports. An isolated phone-size web preview checks start, demo playback, pause/resume, OpenStreetMap switching, local restore and end confirmation. It does not request the developer's live location or transmit test GPS to tile services.
