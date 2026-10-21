# Phase 4 — offline architecture and bounded proof of concept

21 October 2026. Decision: retain production Leaflet. Prepare a route-only standalone research document now; evaluate a native offline region separately after data rights and physical devices are available. Firebase readiness remains blocked independently.

## Current application inventory

This is source evidence plus the current 135-test suite, not a new airplane-mode app audit. AsyncStorage is local persistence, not encrypted storage, cloud backup or a guaranteed browser eviction policy. No private account data was measured.

| Resource | Storage / size evidence | Network dependency and limitations | Coverage |
|---|---|---|---|
| Trip metadata | `trip-library-store.ts`, UID-scoped JSON; actual bytes vary; no store-level byte quota observed | Existing saved data local; cloud sync needs backend; auth restoration may block cold UI | Decoder/persistence tests; physical cold restart unverified |
| Walking geometry/directions | `adventure-store.ts`, full RoutePlan/steps, 1,500,000-byte serialized library guard | Saved calculations local; new route/recalculation online | Store/routing tests; offline native screen unverified |
| GPX route/elevations | `route-store.ts`, UID JSON, 1,500,000-byte guard; segment boundaries preserved | Imported elevations optional; not surrounding terrain | Parser/profile/geometry tests; phone file operations unverified |
| Elevation/profile | Stored GPX values or catalogue heights; no production DEM enrichment | Routed ascent can remain unknown; raster contours are not numerical samples | Missing elevation tests; field datum/accuracy unverified |
| Basemap | No managed tile store or installed-region index; **0 app-downloaded tiles** | Leaflet CDN + raster servers; browser cache incidental | No offline map test can pass as a complete region |
| Terrain/resources | No managed DEM pack; production renderer flat | Online contours; Terrain Lab remote DEM, local vendored renderer only | Genuine online web terrain checked; offline terrain absent |
| Trailheads/POIs | Bundled catalogue/landmark references, saved plan endpoints, offline JSON snapshot | New Photon/Overpass results online; existing points not verified safe entrances | Aliases/decoders tested; Nepal coverage incomplete |
| GPS/off-route | Foreground watcher and local route math; navigation checkpoint 1,500,000-byte guard | GPS may work without data; reroute needs network; background explicitly pauses | Math/guards tested; physical GPS and locked screen unverified |
| Restart/recovery | `navigation-draft.ts` UID/plan JSON queue; checkpoints and paused resume | Last unwritten interval can be lost; authentication/OS kill/low storage need testing | Persistence unit coverage; no physical cold/kill proof |
| Trip snapshot | `offline.tsx` via `lib/storage` AsyncStorage JSON; waypoints/crew/checklist/contact/AI snapshot | Crew/weather/AI data stale; not live or rescue capability; actual bytes vary | `offline-pack.ts` validates shape/bounds; lifecycle not field tested |

Source maps/route/navigation stores are unchanged. Size limits are application guards, not statements about free storage. An actual device audit must measure UTF-8 serialized sizes and native database allocation separately without collecting private contents.

## Framework choices

| Option | Practical capability | Cost/risk and decision |
|---|---|---|
| Leaflet web / existing WebView | Excellent online raster line/marker preview; can use owned local tiles with a deliberately implemented local protocol/cache | No built-in dependable region lifecycle in current app. Keep web map; do not call browser cache offline support. Native WebView storage and bridge add lifecycle complexity. |
| MapLibre GL JS | Web vector/DEM 3D; custom protocols/archives possible | Needs complete local style/sprites/glyphs/tiles/DEM and durable delivery. Browser quotas/eviction and cold launch require explicit design. Keep isolated terrain planning experiment. |
| MapLibre React Native | SDK-managed offline packs, progress/errors, native rendering | Requires SDK57 development-build compatibility validation, licensed sources and lifecycle tests. Best next native candidate; do not assume native 3D parity. |
| Commercial native SDK | Potential integrated region and terrain tooling | Account/usage/licensing decision; no purchase or installation in this phase. |

[MapLibre OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/) documents region creation and pack deletion/invalidation. Those APIs do not grant tile rights or prove recovery on this app. The [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) prohibits bulk/offline prefetch from its public raster servers. Therefore this proof of concept downloads **no OSM tiles**. Map data licenses and hosted-service terms must be evaluated independently. No public demo endpoint is selected as production infrastructure.

Terrain sources need source-specific attribution, redistribution/offline rights, datum/resolution, void handling and update/version metadata. Existing sampled profile credits are retained; a modelled value is not surveyed accuracy. Unknown rest areas, hazards and water remain unknown. The Phase 3 source/provenance report remains authoritative for the public research fixture.

## Proposed package contract (not implemented in production)

Use a renderer-independent versioned manifest: package ID, owner/local scope, bounds, zoom range, source/license/revision, created/expiry date, component list, content hashes, expected byte counts, coverage and completion state. Separate route/directions/POIs from basemap/style/fonts/sprites and DEM. A valid route component must remain readable when map components are missing. UI should say exactly “route saved / map missing / terrain missing”.

Native large assets belong in app-managed files/SDK databases with a small metadata index, not monolithic AsyncStorage JSON. Keep current plan IDs and source coordinates; no destructive migration. Download to staging, preflight disk quota plus temporary overhead, bound concurrency, retry transient failures with backoff, persist progress and completed chunk hashes, support pause/cancel/resume and reject wrong-length/hash/version components. Publish the installed manifest only after integrity and coverage checks. Interrupted updates retain the last complete version. Cleanup removes abandoned staging and reference-counted unshared assets; deleting one pack must not break another. Expired data stays explicitly dated, not silently promoted as current.

Storage estimate: sum actual compressed component sizes + SDK/index overhead + update/staging allowance. For illustration only, 1,000 tiles averaging 30 KiB means ~29.3 MiB before overhead; a simultaneous replacement can approach twice that. This is not a measured Phulchowki tile region. The concrete route pack below is **46,974 bytes**, no tile estimate disguised as a download. Region selection must enforce area/zoom/byte limits and show a revised estimate before consent.

Location acquisition/session journal must be independent of map mount and network. Record timestamps, accuracy, gaps and checkpoint version; never draw invented movement across lost fixes. Current foreground-only behavior must remain explicit. Background tracking needs a separate approved implementation and OS permissions/service configuration, battery budget and device testing. [Expo SDK57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/) distinguishes foreground watchers from background task APIs. A native renderer alone does not enable background GPS.

## Working alternative proof of concept

`prototypes/offline-route-pack/prepare.py` uses only existing public Nepal fixtures. It prepares one self-contained HTML file with route schematic (north-up approximate local projection), modelled profile, all 69 tabulated stations, raw geometry/profile/provenance and input hashes. Bounds are derived from actual 269-vertex Godawari–Phulchowki geometry. No new trail facts or direction instructions are invented.

Preparation reports four progress stages and exact output bytes/hash. It validates finite coordinates, monotonic station distances and complete elevation; missing/oversized input fails. It writes a flushed temporary file then atomically replaces the destination; failed replacement removes the temporary file and preserves the previous complete pack. Retry is rerunning a fast local command; resumable network downloading/cancellation UI is not implemented because there is no network download. The small file can be deleted normally by its owner; no application stores are touched.

**Available without internet after saving:** route schematic, start/end references, sampled elevation chart/table, embedded raw data and credits. **Absent:** basemap, terrain tiles/3D, directions, GPS, live weather, AI, groups, rerouting and current conditions. This is not offline navigation or an installed offline map region.

Controlled tests disabled Python socket creation while preparing and reopening the file; succeeded. CSP forbids all resource requests and scripts; the document has no external assets. Tests also prove incomplete profile and disk-replacement failures preserve prior output. This establishes network-independent construction/readback, not a physical-device browser result. Browser automation rejected `file:` navigation due to protocol policy; no workaround was attempted. Manual file opening after disconnecting, browser restart and phone Files/browser compatibility remain **unverified**.

## Smallest safe next step

Manually open the standalone file offline to validate the reference experience, then approve one provider-authorized Phulchowki region and an isolated Expo57 native offline-pack spike. Test real download interruption/cold airplane-mode launch on one iPhone and Android before proposing production migration. Local field review/access approval is separately required before promoting the sample to hiking guidance. No deployment, credentials, billing, production map or background-location change was made.
