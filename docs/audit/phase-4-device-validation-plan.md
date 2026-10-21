# Phase 4 — physical-device validation plan

21 October 2026. **Not executed on a physical device.** Browser emulation, unit tests and source inspection do not certify native lifecycle, GPS or field accuracy. Production remains foreground-only and has no downloaded basemap. Firebase Admin and two-account tests remain blocked independently.

## Setup and evidence

Use one supported iPhone and a representative lower/mid-range Android with limited RAM, plus the intended minimum OS if different. Record model, OS/build, app commit, renderer/provider versions, battery health/charge, power-saving setting, storage free, viewport/font scale and permission state. Use a development build for diagnostics and a release-equivalent build for performance. Preserve existing Expo; start separate approved build tooling when that phase is authorized. No native build or billing step ran here.

Use only a lawful short route reviewed with a local guide/authority, a safe escape/turnaround plan and an independent navigation backup. The current Phulchowki public graph line is a laboratory fixture, not a field-approved itinerary. Store precise test tracks privately; reports contain aggregate/redacted observations. Do not create accounts without designated environment/approval. Offline navigation tests should not depend on model responses or group readiness.

## Test matrix and acceptance

| Test | Procedure | Required evidence / acceptance |
|---|---|---|
| Permission states | Fresh install deny, approximate, precise; revoke in settings and resume | No loop/crash or hidden sharing; text alternative; accuracy/age visible; no falsely precise progress |
| GPS quality | Stationary outdoors then reviewed walk; forest/poor reception only in safe supervised area | Timestamp/accuracy/gaps logged locally; stale/poor fixes withheld; no false arrival or impossible jump |
| Lock/background | Foreground 5 min, lock 2/10/30 min, switch apps and return | Current app explicitly pauses; resume gets fresh fix and does not bridge missing distance. Future background implementation requires independent continuous-sample evidence |
| Connectivity | Save route; disable Wi-Fi/cellular; restore | Local line/directions work or truthful failure; weather/crew age visible; no fake reroute; tile missing status accurate |
| Offline cold launch | Terminate app, airplane mode, reopen saved route with restored owner | Route reachable without network, no login trap; map only marked installed if all assets load. Current result unverified |
| Interrupted packs | Future native pack at 10/50/95%, force close, network failure, resume | Complete prior version intact; resumed checksums match; no “downloaded” for incomplete region |
| Low storage/corruption | Controlled test directory/quota, invalid component hash; avoid filling whole personal device | Actionable error; no plan loss; cleanup bounded; previous complete pack retained |
| Restart/session | Kill between checkpoints and during write, reopen correct account, then switch account | Paused durable recovery, no cross-account data; record actual maximum lost interval; no invented path |
| Map performance | Same viewport/route, 5 cold+5 warm starts, repeated pan/zoom/rotate, optional 3D and 20k route | Median/p95 startup/frame timing, main thread/CPU/GPU/memory and crashes recorded; no performance claim from rAF alone |
| Battery | Matched 60-min route/brightness/radio conditions, foreground map vs baseline, repeat | Percent/hour, temperature/thermal throttling and accuracy recorded; set product budget from measured baseline |
| Accessibility | VoiceOver/TalkBack, largest font, landscape, reduced motion, one-handed use | All essential directions/status reachable without map gestures; controls not clipped; visible focus/44px targets |
| Native offline reference | Save Phase 4 HTML in Files; disconnect, reopen after browser restart | Table/profile/data readable with no internet; record whether OS permits local HTML. This file has no GPS/map tiles |

Proposed initial engineering thresholds, **not achieved claims**: no crash/data loss; no false complete-package indicator; offline route information visible within 2 seconds on the agreed representative device; camera p95 within 33 ms in the chosen 2D native navigation view; data loss no worse than the agreed checkpoint interval. Adjust only with measured rationale and product agreement. Do not transfer web CPU microbenchmark numbers into native performance expectations.

## Tools and blockers

Use iOS Instruments/Xcode or Android Studio profiling on an authorized test machine if available; otherwise record honest timing/OS memory summaries with limitations. Native continuous GPS requires Expo background tasks, platform permission/service settings and lifecycle tests; the present `watchPositionAsync` path is foreground-only. SDK57 documentation: https://docs.expo.dev/versions/v57.0.0/sdk/location/ . A renderer migration alone is insufficient.

Required next inputs: physical devices/test operator, approved development-build distribution, lawful offline tile source/limits, locally reviewed corridor, agreed background scope and privacy retention. No new account, service purchase, provider setting or permission grant was requested in this phase. An actual device/network-offline run is still needed; the automated Python socket-disabled test is only file preparation/readback.

## Change summary and checks

Only isolated `prototypes/terrain-lab/` code/tests/run notes, new `prototypes/offline-route-pack/` and three Phase 4 audit reports were changed/added. Production `src`, backend, package/lockfile, app configuration and environment were not edited. Existing Phase 2B modifications remain uncommitted; no reset, push or deployment.

Executed: 8 prototype tests, 3 pack tests, 135 client tests, lint/typecheck; warm browser camera/profile checks. Backend 111-test result belongs to Phase 3, not this run. Physical-device, real provider fault injection, native offline packs, field accuracy, battery and two-account integration remain unverified.
