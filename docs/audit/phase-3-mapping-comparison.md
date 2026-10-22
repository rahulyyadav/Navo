# Phase 3 — mapping comparison and research

21 October 2026. Baseline `4e525f9` plus preserved Phase 2B modifications. No production map migration, credential/provider setting, billing, environment-file rewrite or deployment was performed.

**Recommendation:** use the isolated MapLibre GL JS experiment to evaluate web 3D planning. Separately evaluate MapLibre React Native for native vector maps and lawful offline regions, with 2D/hillshade as the supported baseline until native terrain capability is proven. Do not promise one renderer with identical 3D/offline behavior across web, iOS and Android. Keep Leaflet in production until the native build, data/provider and field-validation gates pass.

## Existing implementation and evidence

All requested reports were available: architecture, current-state, feature-matrix, risks, upgrade-roadmap, geographic-data-audit, offline-gps-readiness, Phase 2B and Phase 2C. Their findings were reviewed against current source; previous evidence is not relabeled as a new physical-device test.

| Concern | Actual implementation |
| --- | --- |
| App and package manager | Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3`; npm/package-lock, no Bun lock; Expo Router under `src/app` |
| Platforms | Web and configured iOS/Android; native folders generated through Expo configuration, not hand-maintained |
| Production renderer | Leaflet 1.9.4 HTML from `src/components/maps/document.ts`; web iframe in `NepalMap.tsx`, native WebView in `NepalMap.native.tsx`; pinned CDN JS/CSS with integrity attributes |
| Map updates | `useMapPayload.ts` separates fixed geometry from frequent moving-position payloads; native bridge and browser messages validate selection coordinates/IDs |
| Sources | OSM raster streets; OpenTopoMap default contours; optional credited satellite template; Photon place search; OSRM walking; Overpass facilities; Open-Meteo forecast. Rendering does not replace these services. |
| Route shape | `WalkingRoute` stores complete geometry/instructions, provider distance/baseline, nullable ascent/descent, source/time and snapped endpoints/offsets. `RoutePlan` adds places/stops/date/time/pace/weather. App coordinates are objects; source GeoJSON is longitude-first; Leaflet uses latitude-first arrays. |
| Catalogue/trailheads | Four sparse illustrative trek overviews and a small landmark/alias collection. A peak/temple/place point is not a verified entrance or full hiking trail. |
| Persistence | Account-scoped AsyncStorage libraries for personal trips, walking plans, GPX segments, offline snapshots and navigation checkpoints. These are separate models; changing a renderer must preserve IDs, units, account ownership and existing data. |
| GPS | Foreground Expo Location watcher, freshness/accuracy filters, local progress/deviation calculations and explicit pause on background/blur. No background task or verified lock-screen tracking. |
| Backend | Local health works; Admin readiness remains blocked. This prototype never calls it. No authenticated integration is implied. |

**Working evidence:** previous audits reproduced online walking geometry/GPX, weather and local UI; this phase independently renders the saved public sample with a real DEM and exercises browser camera/profile controls. **Mock/adapter evidence:** existing route math, persistence, auth and readiness suites. **Unverified:** physical iOS/Android map bridge, GPS in terrain, battery, background lifecycle, genuine offline cold launch, two-account sharing and trail access/safety. A bundle export is not a signed/native field test.

Existing conventions remain npm lint/type-check, Node tests and backend pytest. This prototype adds its own five Node tests and plain static files, outside Expo routes. No application import points to it.

## Technology comparison

| Criterion | Existing Leaflet/WebView | MapLibre GL JS | MapLibre Native via React Native v11 | Mapbox SDK alternative | CesiumJS alternative |
| --- | --- | --- | --- | --- | --- |
| True elevation mesh | Not in existing renderer; raster contour/hillshade remains flat | Genuine raster-DEM terrain, with pitch/rotation; demonstrated here | Do **not** assume GL JS parity; current documented baseline is DEM hillshade, not a proven displaced terrain mesh on both native platforms | Native terrain is a candidate if essential; SDK/version/wrapper support and commercial terms require a separate spike | Genuine global terrain/globe; useful for landscape/3D analysis |
| Lines/markers/camera | Current route and markers work; no comparable tilt/rotation implementation | GeoJSON styling, terrain-draped lines, camera controls; demonstrated | Native camera/source/layer APIs; moving GPS avoids a WebView bridge, subject to build validation | Strong styled route/camera system; provider-specific integration | Route entities and terrain clamping; a larger globe-oriented UI redesign |
| Elevation analytics | Imported GPX values only; routed ascent unknown | Renderer can query loaded terrain, but this is not a stable full-route analytics pipeline | DEM source access does not automatically yield validated ascent | Requires data/version/method controls too | Terrain sampling API exists; still needs datum/error handling |
| Offline | Stored line/snapshots, no managed basemap/DEM region | No native pack manager; local protocols/archives and complete assets need separate implementation | `OfflineManager` supports packs; rights, all assets, recovery and device behavior must be verified | Offline SDK capability subject to provider terms/limits and RN wrapper tests | Offline terrain/imagery hosting possible, not a turnkey Navo mobile pack |
| Expo/RN | Already used; WebView native behavior still needs device tests | Web-first; embedding in WebView is possible but not tested here | v11 requires new architecture, RN ≥0.80; Navo 0.86 meets the documented minimum, **not** a compatibility guarantee. Expo plugin + development build required, not Expo Go. | RN integration often adds a community wrapper; exact Expo57/native version support untested | WebView/browser path; no Expo-native drop-in navigation component evaluated |
| Performance | Straightforward raster overlay stack; bridge/static layer rebuild costs | GPU terrain plus tile decoding consumes memory/power; measured browser stalls here | Avoids HTML bridge; real GPU/CPU/memory/battery must be measured | Mature native rendering, but no comparative device benchmark in this phase | More capabilities and potentially larger rendering cost; no benchmark here |
| Lock-in / effort | Lowest immediate change; limited 3D | Open style/GeoJSON ecosystem; substantial adapter and lifecycle work | Open renderer; two platform builds and offline/storage work make this a real migration | Commercial SDK/account/data dependencies increase switching cost | Open library but a different scene/terrain model; highest UI/model conversion effort |

MapLibre's [3D example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/) demonstrates displaced terrain, separately from hillshade. Its [style specification](https://maplibre.org/maplibre-style-spec/sources/) supports Terrarium and Terrain-RGB DEM sources. Software licensing does not grant imagery, tile-hosting or offline rights.

Renderer license check: [Leaflet](https://raw.githubusercontent.com/Leaflet/Leaflet/main/LICENSE) and [MapLibre Native](https://raw.githubusercontent.com/maplibre/maplibre-native/main/LICENSE.md) use BSD-2-Clause; the [React Native wrapper](https://raw.githubusercontent.com/maplibre/maplibre-react-native/main/LICENSE.md) uses MIT terms; the vendored GL JS 6.14.0 package declares BSD-3-Clause; [CesiumJS](https://raw.githubusercontent.com/CesiumGS/cesium/main/LICENSE.md) uses Apache-2.0 with third-party notices. Preserve notices for any shipped version. Mapbox SDK/service use needs its applicable commercial terms review. None of these software licenses resolves source-data attribution, offline distribution or hosting terms.

The [React Native requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [v11 migration guide](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11/) and [Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/) establish a possible native integration, not a tested Navo build. Native `MapView`/camera names have changed; old snippets must not be copied blindly. [RasterDEMSource](https://maplibre.org/maplibre-react-native/docs/components/sources/raster-dem-source/) documents hillshade. Current [cross-platform terrain documentation](https://maplibre.org/flutter-maplibre-gl/advanced/globe-terrain-sky/) explicitly limits terrain/sky root objects to web, and the [March 2026 upstream update](https://maplibre.org/news/2026-04-01-maplibre-newsletter-march-2026/) describes native Terrain3D development/funding work. Recheck released native capabilities before promising more; an experimental branch is not production parity.

[Native OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/) documents pack creation and lifecycle operations. It does not authorize downloading arbitrary public raster servers. [Cesium terrain documentation](https://cesium.com/learn/cesiumjs-learn/cesiumjs-terrain/) provides a meaningful alternative when global 3D matters more than a lightweight hiking map. Neither alternative was installed or claimed tested.

## Nepal elevation, profiles and geographic integrity

The [AWS Terrain Tiles registry](https://registry.opendata.aws/terrain-tiles/) describes global coverage and account-free access. A real Nepal tile was fetched successfully. The prototype streams Terrarium tiles and independently samples one zoom-12 tile along the sample route. That proves this corridor has usable values, **not** complete Nepal coverage or surveyed vertical accuracy. Mountain voids, blending, source resolution, vegetation, interpolation and vertical datum still need regional validation.

Terrarium is RGB-encoded height, decoded using the documented offset/fraction formula. Attribution and source-specific rights are given by the [Tilezen source credits](https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md) and [format reference](https://raw.githubusercontent.com/tilezen/joerd/master/docs/formats.md). The underlying Nepal cell's acquisition date and exact input lineage were not independently established. Pixel zoom/resolution and encoded numerical precision are not vertical accuracy.

The sample uses 269 original route vertices and 69 height stations approximately 100 m apart, bilinear pixel-centre sampling, without elevation exaggeration in the profile. Its ~1,521–2,745 m range is model output. No gain/difficulty/ETA was invented. Production analytics should use a pinned source/revision, explicit datum/resolution/uncertainty, gap/no-data handling and a benchmarked smoothing/resampling method. Keep measured GPS/GPX heights distinct from DEM enrichment. Never sum noisy raw deltas and call the result authoritative ascent.

The route is **OSRM foot geometry**, not a user-imported GPS track and not field-verified hiking data. Its OSM-derived rights, public request, original audit response hash, fetch time and unverified status are retained in the prototype data. An OSM landmark, route snap, pretty mesh or height chart establishes neither lawful access nor current trail suitability. No rest/water/hazard claims were added.

## Basemap, hosting and operating costs

The proof of concept uses normal interactive OSM raster requests and public AWS terrain streaming. [OSMF policy](https://operations.osmfoundation.org/policies/tiles/) requires visible credit, normal identifying browser/referrer behavior and caching; it prohibits bulk/offline prefetch and offers no availability guarantee. These are limited research dependencies, not a contracted launch architecture. The prototype neither adds a downloader nor suppresses normal cache/referrer behavior.

Two bounded command-line style probes, OpenFreeMap Bright and MapLibre demo OSM Bright, returned 403. No denial was bypassed. OSM interactive tiles, the pinned renderer/worker and the DEM succeeded using verified TLS roots. The implemented fallback is raster imagery draped over genuine DEM terrain. Raster text rotates/foreshortens with the surface; a provider-approved vector style would offer better label behavior. It was not silently claimed integrated.

Illustrative USD estimates as checked 21 October 2026; **no account, subscription, billing or paid service was activated**:

| Option | Realistic budget / constraints |
| --- | --- |
| Current local prototype | $0 service purchase; existing computer/network costs excluded. Best-effort online services, no offline guarantee. |
| No-key vector beta candidate | [OpenFreeMap](https://openfreemap.org/) advertises free public usage without view/request limits or keys and offers self-hosting. Availability was not established in this environment (403 probe). It does not supply a complete Navo terrain/routing/offline stack or SLA. Verify access, attribution, terms and distribution rights first. |
| Managed commercial tile candidate | [MapTiler pricing](https://www.maptiler.com/cloud/pricing/) lists Free $0 for testing/personal/non-commercial use and Flex $30/month plus usage. With a third-party renderer, plan around API request billing. At $0.15/1,000 **additional billable** requests, 400,000 excess requests add $60; base plus this conservative allowance is $90/month. Included quota can reduce that figure. Four million excess requests would add $600, total $630 before tax. These are assumptions, not measured Navo demand. Ordinary terrain must not be confused with separate Gaussian-Splat “3D session” pricing. |
| Self-hosted static regional data | [R2 Standard pricing](https://developers.cloudflare.com/r2/pricing/) lists $0.015/GB-month, $0.36/million reads, and monthly free allowances of 10 GB and 10 million reads. For 50 GB stored all month, 20 million reads and writes within the free allowance: about **$4.20/month object storage/read cost**. This excludes preprocessing machines, range-read amplification, workers, domains, support, monitoring and operational labor. A cheap bucket is not a free finished mapping service. |
| Commercial integrated SDK alternative | [Mapbox web pricing](https://www.mapbox.com/pricing) lists 50,000 GL JS loads free, then $5/1,000 in the next band: 100,000 web loads would be $250. Mobile/native/wrapper billing and offline terms require separate confirmation; do not apply the web allowance to mobile MAUs. |
| Globe/3D specialization | [Cesium ion pricing](https://cesium.com/platform/cesium-ion/pricing/) lists a non-commercial/evaluation community option and commercial individual entry at $149/month; public/external integration may require sales terms. CesiumJS software and hosted ion content are separate licensing decisions. |

For demand planning, estimate active hikers × map sessions per hiker × requests per session, then measure it. A hypothetical 1,000 hikers × 4 sessions × 100 tile/data requests is 400,000 requests before caching/pack behavior, not an observed app usage metric. Native region sizes, CDN egress, DEM processing and offline re-download frequency need real measurements. Changing routing/search providers remains a separate cost and reliability task.

## Recommendation and next review gates

1. Preserve current Leaflet navigation while validating one lawful local route and its access/elevation provenance. Renderer quality cannot repair bad trail data.
2. Keep GL JS 3D as an optional planning/exploration surface. Benchmark low-end devices; do not make remote hikers depend on an online GPU-heavy view.
3. Approve a separate Expo57 MapLibre RN development-build spike for native vector/2D hillshade and offline pack lifecycle. Keep a renderer-neutral plan model and existing local geometry/directions fallback. A hybrid GL JS 3D preview plus native navigation is plausible, not already implemented.
4. Select legal, reachable vector/DEM capacity and offline rights; validate complete style/glyph/sprite/tile packs, quotas, interrupted downloads, storage corruption and cold launch.
5. Require physical iOS/Android tests, memory/thermal/battery evidence, lifecycle/privacy review and a rollback before any production replacement. If identical native 3D is mandatory now, separately evaluate a commercial SDK or wait for verified native capability rather than mislabel hillshade.

Migration effort is moderate for a web preview, high for two native renderers plus offline and lifecycle parity, and very high for a scene-model rewrite such as Cesium. These are engineering judgments, not delivery-time commitments. No next-phase migration starts here.
