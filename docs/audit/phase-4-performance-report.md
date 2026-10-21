# Phase 4 — Terrain Lab performance

21 October 2026. Scope: isolated prototype only. Reviewed Phase 3 comparison/decision/README and offline, geographic and roadmap reports. Existing Phase 2B changes and untracked audit work were preserved. No production application, dependency, environment, Firebase or deployment change; no server restart.

## Findings and evidence limits

The earlier 132–283 ms camera p95 stalls **were not reproduced in the current small browser viewport**. Their exact GPU/network cause remains unresolved. Do not attribute them conclusively to React, DEM download, shader compilation or a specific SDK defect without a trace. Terrain Lab uses plain DOM, not React: there are no React rerenders to eliminate.

Source inspection confirmed two avoidable operations: every profile-slider event validated and scanned the entire sample list multiple times, and every map movement assigned three DOM values even when the rounded pitch/bearing had not changed. At the actual 69 stations, the profile work is small and cannot explain camera stalls when the slider is unused. At 20,000 stations, repeated scanning becomes meaningful. This phase fixes these bounded CPU issues rather than claiming the historic graphics problem is solved.

| Observation | Before | After | Interpretation |
|---|---:|---:|---|
| First terrain, visible readiness text | 1,195 ms | 1,042 ms | Warm/cache conditions uncontrolled; not a proven speedup |
| 3-second camera median rAF | 16.7 ms | 16.7 ms | One window each, no measurable improvement |
| Camera p95 rAF | 17.6 ms | 17.7 ms | Essentially unchanged; not GPU timing |
| 1,000 station lookups, 69 samples | 1.797 ms | 0.091 ms | Node CPU microbenchmark, median of 7 after warmup |
| 1,000 station lookups, 20,000 samples | 959.634 ms | 0.148 ms | Same synthetic input/targets; summary prepared once; not UI frame time |

Browser viewport was 430×932 CSS pixels; baseline canvas 623×867. One RGBA8 surface at that size is approximately 2.06 MiB, **not total GPU memory**. Textures, depth buffers, terrain meshes, workers and driver allocations are additional. Heap/GPU allocation tracing, CPU flame graphs, sustained energy and low-end native profiling were unavailable in this run. Prior Phase 3 desktop measurements used a larger canvas and different cache conditions; they are not comparable paired trials.

## Changes

- `model.mjs`: binary nearest-station lookup; 20,000-sample bound before profile allocation. Original coordinates/heights and tie behavior retained.
- `app.mjs`: validate/cache the profile summary once, use indexed station lookup, update camera labels only when their displayed rounded value changes. All terrain, hillshade, pitch, quality and endpoint features remain enabled.
- `load-json.mjs`: ten-second abort deadline for local route/profile fetch/body decoding; failed optional profile remains explicitly unavailable. This bounds the previous indefinite local-fixture wait before map initialization.
- `performance.test.mjs`, `load-json.test.mjs`, `benchmark.mjs`: equivalence, size bound, missing/invalid data, server failure and slow-request deadline tests; reproducible CPU benchmark.

No terrain-source consolidation was attempted. The separate hillshade and terrain sources can create separate decode/cache work; identical URLs alone do not establish duplicate network transfers because browser caching/coalescing may intervene. This follows the existing renderer example and needs a controlled source/worker trace before alteration. No OSM cache bypass, request flood, tile prefetch or quality reduction was introduced.

## Data loading and failure analysis

Local inputs: route 19,386 bytes/269 vertices; profile 9,558 bytes/69 stations; provenance 1,210 bytes. Vendored renderer resources remain approximately 1.68 MB. Initial readiness combines local JSON, module/worker initialization, remote basemap/DEM, shader/render work and the idle event. The present timer cannot isolate these phases; do not label it network time. The original profile sampling used one 57,545-byte DEM cell, but runtime terrain requests a viewport-dependent tile set; that is not the runtime transfer total.

The existing 25-second terrain readiness deadline, source-error UI and context-loss message remain. Missing/invalid elevation never becomes zero-height data. Slow local data is now independently bounded. Mock transport tests cover HTTP failure, invalid JSON and an abort-aware stalled fetch. Existing preview URLs cover loading/empty/error/offline UI, but **are not provider fault injection**. Real throttled DEM requests, partial tile failures, request counts and WebGL context recovery remain to be measured. Optional-profile failure permits map use; route failure prevents a misleading route display.

Large input test validates/draws a 20,000-station profile and checks binary lookup against a full scan. This establishes algorithm correctness and bound handling, not acceptable rendering of a 20,000-vertex SVG on a phone. Large GeoJSON GPU ingestion was not benchmarked. Current route is only 269 points; a production simplification/downsampling proposal needs error bounds and visual/device evidence first.

## Executed checks

- Prototype Node tests: **8 passed**, including original 5 geography/profile tests.
- Offline pack Python tests: **3 passed**, including network-disabled preparation/readback and two preservation failure paths.
- Client suite: **135 passed**; lint and typecheck passed.
- Browser: terrain reached ready after reload; camera measurement completed; slider 50% retained 3.40 km / approximately 2,082 m.
- Production backend tests were not rerun: backend unchanged in this phase; previous 111-pass result is historical, not a new run.
- Native build, field walk, physical GPS, battery and actual offline cold-launch app flow: unverified.

Commands: `node --test prototypes/terrain-lab/*.test.mjs`, `node prototypes/terrain-lab/benchmark.mjs`, `python3 -m unittest discover -s prototypes/offline-route-pack -p 'test_*.py'`, `npm run lint`, `npm run typecheck`, `npm test`. Logs: `/tmp/navo-phase4-{lint,types,tests}.log`. Benchmark values above are this run, not thresholds.

## Next measurement gate

Use the same hardware, viewport, browser version, power mode, route and camera trajectory for at least five cold and five warm trials. Capture request timing/transfer/error counts, worker/main-thread long tasks and GPU/memory where supported. Compare terrain on/off diagnostically without silently changing the shipped view. Separate first map, first route, first DEM and all-visible-tile readiness. Reproduce the historic p95 before claiming a cause or improvement. Native device gate is in the accompanying validation plan.
