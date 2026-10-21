# Navo Terrain Lab — isolated Phase 3 prototype

Run from the repository root, without installing packages:

```sh
python3 prototypes/terrain-lab/serve.py --port 8120
```

Open [the prototype](http://127.0.0.1:8120/). The server binds loopback and serves only this directory. It does not load the application's environment, Firebase, account data, or production map. A different unused port can be supplied; do not terminate another listener to take a port.

The page supports actual DEM-backed MapLibre GL JS terrain at **1×** vertical scale, route/start/end references, zoom/rotation/north reset/tilt, fit-to-route, an interactive modelled-height profile and phone full-map mode. Touch rotation/pitch and mouse gestures are provided by the renderer; physical-device gestures remain unverified. This is a visualization experiment, **not field navigation**.

On a phone-width viewport, use **Route details / Hide details** to expand the map. In 2D mode the page explicitly labels hillshade as flat. The 3D-ready indicator requires loaded terrain and a plausible elevation query; it is not just a decorative badge.

## Data and rights

- `data/route.geojson`: 269 vertices from the existing public Phase 2A OSRM foot response, 21 October 2026. Geometry length 6,760.06 m; provider reports 6,756.6 m. This is routing-engine geometry, **not** an imported GPS trail or field-verified route. Start is a garden-area reference, not a certified lawful trailhead.
- `data/elevation-profile.json`: 69 stations, approximately 100 m apart, sampled bilinearly from a real Mapzen/Terrain Tiles Terrarium DEM at zoom 12. Sample height range 1,521.0–2,745.2 m. No measured ascent, difficulty, access approval, ETA or vertical-accuracy claim is generated.
- `data/provenance.json`: source request, dates, hashes, tile source and limitations. DEM generation read one 256×256 source tile; it did not create a downloadable terrain region. Raw DEM imagery is not bundled.
- Interactive background: OpenStreetMap raster tiles, credited on screen. Terrain credits: Mapzen/Tilezen; USGS global SRTM/GMTED2010 and NOAA ETOPO1. [Full terrain attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

The online services are research dependencies, not contracted production capacity. No bulk OSM tile prefetch, region downloader, Service Worker or offline terrain is implemented. Browser cache is not an offline pack. See the [mapping comparison](../../docs/audit/phase-3-mapping-comparison.md) before selecting a production provider.

## Dependencies

One isolated runtime library is vendored: **MapLibre GL JS 6.14.0**, BSD-3-Clause. `vendor/manifest.json` records original HTTPS URLs, byte lengths and SHA-256 hashes; `vendor/LICENSE.txt` is retained. Renderer, worker and CSS total about 1.68 MB uncompressed. No root manifest/lockfile or Expo native dependency changed; no npm install is needed. Native MapLibre was researched, not installed.

Optional fixture regeneration:

```sh
python3 prototypes/terrain-lab/tools/prepare_data.py
```

This needs Pillow, already available on the audit machine, and TLS trust roots; certifi is used if already available. Neither tool was newly installed. It reads the repository's public audit route and a bounded set of DEM cells (hard limit 16). It overwrites **only this prototype's three generated data files**. Internet data/metadata can change; review the new hashes rather than assuming identical results. Normal prototype operation does not require Python image packages.

## Tests and reproducible state previews

```sh
node --check prototypes/terrain-lab/app.mjs
node --test prototypes/terrain-lab/model.test.mjs
npm run lint
npm run typecheck
npm test
```

Open `/?state=loading`, `/?state=empty`, `/?state=error`, or `/?state=offline` on this server. They are visibly labeled **state previews**, not real device/network fault tests. Error/offline previews skip remote map initialization and retain local route/profile information. Empty has no distance, route markers or fabricated heights. Try again returns to the ordinary demo. `/?motion=reduce` is a labeled reduced-motion preview; system reduced-motion preferences also suppress camera animations and loading animation.

**Measure interaction** runs one user-requested 3-second camera movement and reports median/p95 `requestAnimationFrame` intervals in the route panel footer. This is not GPU frame timing or a battery benchmark. Pixel ratio is capped at 1.5 and pitch at 60° for the prototype. No autoplay camera orbit runs.

Recorded results: five prototype tests, 135 existing client tests, 111 backend tests, lint and type-check passed. Browser evidence and timing limitations are in the [architecture decision](../../docs/audit/phase-3-architecture-decision.md). Native Expo builds, background GPS, OS offline cold starts, memory/battery measurements and authenticated integration remain unverified. Stop here; production migration needs a separate review.

## Phase 4 follow-up

Profile lookup now uses a validated cached summary and binary station search; camera labels avoid unchanged DOM writes. Local JSON requests abort after ten seconds. Terrain quality/features remain unchanged. Run all eight tests with `node --test prototypes/terrain-lab/*.test.mjs` and the CPU-only microbenchmark with `node prototypes/terrain-lab/benchmark.mjs`.

A separate `../offline-route-pack/` produces a self-contained route/profile reference, **not downloaded terrain or maps**. See `docs/audit/phase-4-performance-report.md`, `phase-4-offline-architecture.md` and `phase-4-device-validation-plan.md` from the repository root. Historic camera stalls are not claimed solved; current small-viewport rAF timing was essentially unchanged.
