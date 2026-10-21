# Phase 3 — terrain prototype architecture decision

21 October 2026. **Status: accepted for isolated research only. Production migration is not approved or started.** Read with [the technology comparison and cost analysis](phase-3-mapping-comparison.md) and [prototype run instructions](../../prototypes/terrain-lab/README.md).

## Decision

Build a standalone, locally served MapLibre GL JS 6.14.0 experiment in `prototypes/terrain-lab/`. Use genuine Terrarium DEM terrain, public routing-engine geometry and separately sourced modelled heights. Retain the current Leaflet/WebView map everywhere in Navo.

For a later mobile phase, evaluate MapLibre React Native's native vector/2D hillshade and offline capabilities in actual Expo57 development builds. Treat GL JS 3D planning as an optional surface. Do not equate native DEM hillshade with a displaced 3D mesh, or assume wrapper/platform feature parity. A mandatory native-3D product requirement needs a separately reviewed SDK decision.

This gives concrete terrain evidence while avoiding a change to authentication, storage models, navigation lifecycle or a production dependency graph. A replacement renderer by itself cannot certify Nepal trail coverage, safety, permissions or route suitability.

## Isolation and implementation

The prototype is plain HTML/CSS/ES modules served by Python's standard HTTP server on **127.0.0.1:8120**, restricted to the prototype directory. It has no imports from Expo routes, no `.env` loader, no account/session access, no geolocation permission and no Firebase/model calls. The existing app on 8115 and local backend on 8114 were not restarted or modified in this phase.

MapLibre renderer/worker/CSS and its BSD license are pinned and vendored with source URLs, byte counts and SHA-256 hashes in `vendor/manifest.json`. This is one justified, isolated runtime dependency; **no root package/lockfile, Expo plugin or native SDK was added, and no package install ran**. Optional fixture preparation used Pillow and certifi already available on the machine; neither was installed. Normal operation uses no image-processing dependency.

The default prototype style drapes ordinary online OSM raster tiles over a Terrarium terrain source, with a separate hillshade source. This is a real displaced mesh plus shading, not a shaded flat image mislabeled 3D. Separate sources follow the [MapLibre terrain example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/). Raster text foreshortens with pitch; a vector label style is a future improvement. OpenFreeMap and MapLibre demo-style probes returned 403, so no successful vector integration is claimed or denial bypassed.

Camera controls support fit, zoom, bearing/north reset, 0–60° tilt and 2D/3D switching. Fit padding adapts to the actual map container, including short landscape screens. The 3D-ready indicator waits for loaded terrain and a plausible height query. Vertical exaggeration is fixed at 1×; profile heights are independent of camera scale. The [MapLibre API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) warns that queried heights reflect exaggeration, so an independent, reproducible profile is preferable to sampling whatever happens to be loaded in the viewport.

The renderer pixel ratio is capped at **1.5**, and worker count at two, to bound part of the rendering cost. Pitch is capped at 60°, consistent with the [documented camera cautions and pixel-ratio option](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/). No autoplay orbit runs. These limits are design choices, not evidence of acceptable battery use.

The local UI/UX Pro Max skill informed loading feedback, semantic controls, target sizes, safe areas and reduced motion. Navo's existing dark/lime visual language was retained rather than adopting an unrelated generated palette or horizontal-scroll marketing pattern. No paid design-generation workflow or asset purchase was used. Touch targets for interactive route references are 44 px even though their visible dots are smaller. The mobile detail toggle expands the map to the remaining viewport.

## Geographic data contract

| Item | Actual source and limitations |
| --- | --- |
| Demonstration line | Existing Phase 2A public OSRM foot response; 269 vertices; 6,760.06 m independently summed geometry, 6,756.6 m provider distance; one-way. Original stored response hash and request/time retained. |
| Route classification | `geometryKind: routing-engine`, `fieldVerified: false`. No imported user track or surveyed hiking trail is represented. |
| Start/end | Garden-area routed start and Phulchowki-area snapped destination. The UI explicitly calls the start an unverified trailhead reference. No legal entrance/summit approach is certified. |
| Elevation | One real zoom-12 Mapzen/Terrain Tiles cell was fetched during preparation; 69 stations at approximately 100 m spacing were bilinearly sampled at pixel centres. Range 1,521.0–2,745.2 m. Raw tile URL, byte count and SHA-256 are recorded. |
| Accuracy | Source-specific vertical datum, acquisition date and accuracy were not independently established for the blended cell. No ascent, trail grade, difficulty, conditions or hiking ETA is generated. |
| Runtime terrain | Normal online Terrarium streaming; max DEM source zoom 14, overzoom possible. Encoded precision/zoom is not source survey resolution. |
| Rights | OSM-derived route attribution/ODbL context; Mapzen/Tilezen and relevant USGS/NOAA credits, with a full attribution link. Software, source data and public hosting are separate rights. |

`tools/prepare_data.py` is optional regeneration, not an offline-region downloader. It hard-limits DEM cells to 16; this run used one. Raw terrain images are not bundled. The 69 local profile values are a small research derivative, not an offline map or navigation pack. The profile rejects missing/non-finite heights instead of inserting zero, and drawing/camera controls do not change its underlying heights.

## Browser checks actually executed

Testing used the available macOS in-app browser. Its viewport control/device scale required compensation, so **actual DOM CSS dimensions**, rather than just requested numbers, were recorded:

| Case | Executed observation |
| --- | --- |
| Desktop | 1,177×900 CSS viewport, no horizontal overflow; route and both endpoint markers rendered on raised terrain |
| Phone | 375×812; no horizontal overflow; full-width map plus scrollable route information |
| Phone full-map | At 375×812, details hidden and map height **748 CSS px**; both endpoints visible after fit |
| Compact phone | 320×568; document scroll width 315 px (scrollbar gutter), no horizontal overflow; controls/profile remained available |
| Landscape | 844×390; no horizontal overflow; both endpoint centres inside map after fit; no browser errors in the checked log |
| 2D / 3D | 2D selected state and “hillshade is not 3D” copy appeared with 0° pitch; 3D restored the displaced view |
| Camera | North reset reached 0°; tilt input reached 35°; fit reset the route overview; renderer rotation was also exercised by the timing interaction |
| Profile | 50% position displayed 3.40 km / ~2,082 m; keyboard ArrowRight moved the research profile to 0.10 km / ~1,531 m |
| Reduced motion | Explicit labeled preview disabled the loading animation (`animation-name: none`); reduced-motion camera changes were immediate. Actual OS accessibility settings were not changed. |
| Loading / empty / error / offline | All labeled state previews opened; empty displayed no distance/complete profile/endpoints; error retry returned to the normal demo; offline explicitly denied downloaded terrain/navigation |

The state previews are controlled UI fixtures, **not** real airplane-mode, provider-outage or OS-kill tests. They do not silently pretend that local route data equals a usable offline terrain region. No physical-device touch, VoiceOver/TalkBack, largest system font setting, native GPU, GPS, background tracking or field walk was tested.

Evidence images are under `docs/audit/evidence/phase-3/`: desktop terrain, phone full-map, offline state, and any additional comparison views saved in this phase. They contain only public demonstration geometry, not a private GPS track or authenticated account UI.

## Performance assessment and limitations

The visible first-terrain indicator recorded **11,763 ms** during an initial small-viewport load, and **6,901 ms** on a subsequent desktop load after the pixel-ratio cap. These are separate network/cache/viewport observations, not a controlled before/after speedup claim. The measurement includes module/worker startup, network data, shader/render readiness and event timing.

Two user-triggered three-second desktop camera windows reported:

| Window | Median rAF interval | p95 rAF interval |
| --- | --- | --- |
| First sampled interaction | 16.7 ms | **283.4 ms** |
| Subsequent interaction | 16.7 ms | **132.4 ms** |

These are `requestAnimationFrame` scheduling intervals recorded during prototype iteration, **not standardized final-build GPU frame timings or proof of 60 rendered FPS**. The long-tail stalls are material: this prototype is not evidence of smooth production navigation. Network streaming, graphics load, browser automation/instrumentation and device scaling can affect the results. No memory/energy superiority over Leaflet or another renderer was measured.

At the measured desktop viewport, the map was approximately 807×820 CSS pixels and its canvas 1,211×1,230 pixels at the 1.5 cap. That describes one canvas, not total GPU/worker/texture memory. Actual memory, CPU, sustained thermals, battery and low-end handset behavior remain unmeasured. Before deployment, use reproducible cold/warm traces and installed device tests; set budgets and retain a non-3D fallback. Do not use the attractive screenshot as a release gate.

## Automated checks and preservation

- `node --check prototypes/terrain-lab/app.mjs` and model module: passed.
- `node --test prototypes/terrain-lab/model.test.mjs`: **5 passed**. Covers independently known route length/provenance, malformed/gapped lines, documented DEM decoding, missing-height rejection, full profile coverage and non-mutation of source height data.
- `npm run lint`: passed with no warnings/errors.
- `npm run typecheck`: passed.
- `npm test`: **135 passed**; no failures/skips.
- Backend `.venv/bin/python -m pytest -q`: **111 passed**, one existing Starlette/HTTPX TestClient deprecation warning.
- `npx --no-install expo export --platform web --output-dir /tmp/navo-phase3-web-export`: passed; the existing Expo web application still exports. This is not a signed native build or deployment.
- `git diff --check`: checked; no whitespace defects in tracked work.

Logs are `/tmp/navo-phase3-prototype-tests.log`, `/tmp/navo-phase3-lint.log`, `/tmp/navo-phase3-typecheck.log`, `/tmp/navo-phase3-client.log`, `/tmp/navo-phase3-backend-tests.log` and `/tmp/navo-phase3-web-export.log`. Vendor files have independent digest checks. The existing 211 source/backend/report/configuration files were hashed before work and compared afterwards to verify preservation; secrets/hashes were not printed.

The root Git tree already contained Phase 2B changes and untracked audits. They were not reset, stashed, rewritten or committed. Phase 3 additions are the prototype directory, the two Phase 3 reports and public-only evidence images. Existing map components, route stores, GPS code, root manifests, lockfile, application/build/deployment files and environment files remain unchanged.

Exact prototype file groups added:

- `index.html`, `styles.css`, `app.mjs`, `model.mjs`: interface, renderer controls and data validation/profile helpers.
- `model.test.mjs`, `serve.py`, `README.md`, `tools/prepare_data.py`: tests, loopback server, run guide and optional bounded data preparation.
- `data/route.geojson`, `data/elevation-profile.json`, `data/provenance.json`: public route and sourced DEM research fixtures.
- `vendor/maplibre-gl.mjs`, `vendor/maplibre-gl-worker.mjs`, `vendor/maplibre-gl.css`, `vendor/LICENSE.txt`, `vendor/manifest.json`: the single pinned isolated runtime library and its notices/digests.

The other additions are `docs/audit/phase-3-mapping-comparison.md`, this decision record, and the Phase 3 public screenshots. No earlier report or application file was edited.

## Next phase, only after review

Choose one field-review corridor and legal data/provider/offline scope first. Then approve an isolated native development-build spike: MapLibre RN version compatibility, map/route selection parity, source units, native lifecycle, complete offline assets, download interruption/recovery and storage/account isolation. Treat 3D planning as optional until slow-device performance and native capability are established. Keep renderer-neutral geometry/provenance and essential local directions independent of tile success. The current stored `RoutePlan` must not be destructively migrated as a side effect of map rendering.

Firebase Admin credentials are still unavailable; this phase did not inspect/download/create keys, change IAM, project settings or billing, weaken auth/rules, or claim authenticated integration. Future two-account work remains a separate gate from mapping.

**Final status:** genuine web 3D works in this isolated browser prototype; route/profile/camera/state UI were tested within the limits above; offline terrain downloads are **not implemented**; native/field/battery behavior remains unverified; the production Leaflet map is unchanged. No deployment or production migration follows this decision.
