# Navo Phase 1 — command and runtime evidence

Executed on 21 October 2026 in `<repository>`, except backend pytest's working directory was `backend/`. Initial checkout `4e525f9`; branch `codex/onboarding-discovery-reliability`; initially clean. Commands below did not install or remove dependencies. Expo export went to `/tmp/navo-phase1-export`.

## Commands actually run

| Command | Exit/result | Exact salient output / interpretation |
| --- | --- | --- |
| `npm run lint` | 0 | `expo lint`; no lint diagnostics. Environment loader printed variable names, not values. |
| `npm run typecheck` | 0 | `tsc --noEmit`; no errors. |
| `npm test` | 0 | `tests 131`, `pass 131`, `fail 0`, `skipped 0`, duration about 7.62 s. |
| `.venv/bin/python -m pytest -q` in backend | 0 | `99 passed, 1 warning in 1.27s`. Starlette/FastAPI TestClient deprecation warning about HTTPX; no dependency change made. |
| `npx --no-install expo export --platform all --output-dir /tmp/navo-phase1-export` | 0 | Web bundled 1,536 modules; iOS 1,871; Android 2,056. Exported web entry 3.8 MB, iOS HBC 6.6 MB, Android HBC 6.8 MB. These are export sizes, not installed/store/download sizes. |
| `npm run test:rules` | 1, environment prerequisite missing | `tests 8`, `pass 0`, `fail 8`; common before-hook error: `Run this suite with firebase emulators:exec --only firestore --project demo-navo. Never run rules tests against production.` No rule assertion was reached; not eight demonstrated authorization defects. |
| `npm run check:release` | 1 | Six configuration issues listed below. |
| `npm run check:services` | 1 | `Main backend: no service address configured.` and `Chat backend: health/readiness check failed or timed out. No credentials or server response bodies were logged.` |
| `npm run doctor` | 1 | `19/21 checks passed`. Config-schema check: `getaddrinfo ENOTFOUND exp.host`; React Native Directory check: `unexpected server response`. Cannot conclude those two checks are valid or invalid. |
| `npm audit --json > /tmp/navo-phase1-npm-audit.json` | 1, network blocked | Registry advisory request failed: `getaddrinfo ENOTFOUND registry.npmjs.org`. No current vulnerability count available; do not interpret as zero advisories. npm also could not write its global log directory. |
| `git ls-files '.env*' 'backend/.env*'` | 0 | Only `.env.example`, `backend/.env.example` tracked. This is not a full secret-history scan. |

`command -v firebase` found no standalone Firebase CLI. No CLI/emulator was installed and no production rules test/deployment was attempted. CI already defines an emulator rules job in `.github/workflows/quality.yml`.

One initial backend command incorrectly referenced `backend/.venv/bin/python` from inside the backend directory, producing `no such file or directory` (127). The corrected command above ran successfully. Several exploratory source reads found nonexistent candidate filenames; actual files were located and inspected instead. These lookup failures were not application failures.

### Release check failures

```text
EXPO_PUBLIC_API_BASE_URL must be a public HTTPS URL.
EXPO_PUBLIC_PRIVACY_URL must be a public HTTPS URL.
EXPO_PUBLIC_PHOTON_URL must be a public HTTPS URL.
EXPO_PUBLIC_WALKING_ROUTER_URL must be a public HTTPS URL.
EXPO_PUBLIC_CHAT_BASE_URL must be a public HTTPS URL, or unset to use the main backend.
EXPO_PUBLIC_SUPPORT_EMAIL is missing or invalid.
```

No credentials or private environment values were copied into the report. The current failure proves runtime configuration is incomplete; it does not prove the model key is invalid or that Firebase itself is down.

## What tests establish

Current client tests exercise route/POI decoding using fixtures, coordinate/snapping validation, stale/inaccurate GPS rejection, sustained off-route detection, unknown ETA suppression, GPX validation/segmentation, local write serialization/account ownership/failure recovery, onboarding merging/restoration, preparation outbox, map camera helpers, reviews and AI readiness classification. Backend tests cover API authorization, transactions, planner/schema audits, chat grounding, budgets, group positions, reviews, proximity and account deletion using test adapters/mocks. They do not contact every deployed service or physically walk a route.

## Fresh browser observations

Target: existing signed-in Navo tab at `http://localhost:8115/discover`, then 390×844 browser viewport. No new login/onboarding submission, public message/review/group/invite, GPS permission grant, notification subscription or deletion was performed. Public route endpoints and search text were sent through the application's normal controls. Selecting/searching can update the app's normal local recent-place state; no saved trip was created.

1. Home rendered authenticated name, destination photograph, slideshow control, labeled navigation and entry actions.
2. `Pulchowki` search returned the Phulchowki hill reference first, then mixed general Nepal POIs. Selection carried correct hill metadata into planner.
3. Chose the existing public recent result `Entry national botanical garden` as origin, avoiding private GPS. `Find walking routes` completed and opened full-screen terrain route: **6.76 km, 27 steps**, one-way. Directions expanded with mapped maneuvers. This does not validate field geometry.
4. Trip details explicitly displayed hiking duration unknown; provider baseline 1h30m; start/destination offsets 6 m/28 m. No ascent was supplied.
5. `Check hourly weather` returned dated hourly results for 21 October 2026; destination sunset 17:28 NPT, source/fetched timestamp visible.
6. `Find stops & viewpoints` timed out and showed a recoverable message without removing the walking route.
7. Groups rendered “Shared groups are unavailable…” with disabled Create group. AI browser reported account sync unavailable after model configuration was detected; this differs from the shell probe's connectivity failure and is not a verified model inference.
8. Mardi overview gallery selection changed the background image and photographer credit; offline screen explicitly excluded terrain maps. Home reloaded back to the authenticated greeting without reopening onboarding.
9. Compact discovery measured `clientWidth=320`, `scrollWidth=320`, `clientHeight=568`; no document-level horizontal overflow in that sample. No claim about all pages/native font scaling.

Screenshot files in `screenshots/` are local audit evidence, not cleared for publication. Images were saved and inspected in this audit; no earlier screenshots were substituted.

## Not performed / why

- Native compile/sign/install/store submission; exports alone cannot verify modules, OAuth callbacks, actual safe areas or push credentials.
- Physical GPS, walking progress, off-route/reroute in terrain, battery/locked-phone/background tests.
- Airplane-mode cold launch, process kill/restart, multi-device/cross-account cloud sync.
- Two-account shared groups/messages/reviews/alerts and real Nemotron inference: no functioning configured backend path was available.
- Fresh email/password/Google sign-in or verification-email delivery: existing session reused; audit does not change account setup.
- Rules emulator assertions and current dependency advisories: environment prerequisites/network limitations above.
- Load/penetration/complete secret-history testing, TalkBack/VoiceOver, full contrast measurement, font scaling or accessibility certification.
- Changing map library, dependencies, Firebase rules, keys, hosting or application source: excluded by Phase 1.

## External references checked

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and [Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/): version-matched reference for subsequent planning.
- [OSMF raster tile policy](https://operations.osmfoundation.org/policies/tiles/): best-effort public service, attribution/caching requirements, no offline prefetch facility.
- [Photon repository](https://github.com/komoot/photon): official project reference; demo capacity is not owned deployment capacity.
- [OSRM demo](https://routing.openstreetmap.de/): page fetch exposed no readable policy text; no invented numeric allowance claimed.
- [Open-Meteo API](https://open-meteo.com/en/docs) and [terms](https://open-meteo.com/en/terms): date horizon, non-commercial free usage and usage limits. No unlimited commercial-free claim.
- [DHM](https://www.dhm.gov.np/) and [Nepal Tourism Board TIMS](https://ntb.gov.np/plan-your-trip/before-you-come/tims-card): accessible official research starting points, not validation of app permit labels.
- DNPWC homepage timed out; OpenTopoMap about page failed web-tool decoding. Their current policies/content were not successfully verified in this audit.
