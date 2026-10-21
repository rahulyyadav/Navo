# Navo Phase 1 — prioritized risks

21 October 2026. Source baseline `4e525f9`. Each issue below includes evidence, impact, proposed remedy, dependencies and an acceptance gate. Recommendations are not changes made in this phase.

Severity: P0 = critical security/data integrity/navigation safety; P1 = broken core or essential reliability; P2 = important usability/quality; P3 = optional. **No confirmed exploitable P0 security or irreversible data-loss defect was established by this bounded audit.** This is not a security certification. Promoting illustrative routes or incomplete navigation as verified field guidance would be a P0 release risk; existing disclaimers reduce, but do not eliminate, that concern.

## P1-01 — shared features and AI cannot complete in the current configuration

- **Evidence:** `lib/api.ts` needs main API URL; release/service commands fail. Live Groups disables Create group. AI browser shows `ACCOUNT SYNC UNAVAILABLE`; unlike the shell probe, the browser reached enough service state to report model configured, but account storage readiness was not confirmed. `backend/app/auth.py` and `database.py` require working Firebase Admin and Firestore before authenticated chat. A console link or model key is not a server credential/configuration.
- **Impact:** users cannot create a real shared crew, message, publish/read shared feedback reliably, generate an authenticated itinerary or get a verified live AI response. Repeated email-verification taps cannot repair a missing backend.
- **Solution:** establish one documented HTTPS backend, least-privilege server credentials, Firestore database/rules/indexes, correct CORS, model endpoint and budget. Keep auth/revocation/membership guards. Gate unavailable functionality and distinguish setup, auth, quota and outage errors.
- **Dependencies:** hosting/project owner; approved credential handling and public URLs; two test accounts; model allowance. No new key or paid upgrade during audit.
- **Acceptance:** `/ready` succeeds; authenticated real Nemotron question returns source/model metadata; two accounts create/invite/accept/message; removed member is denied; moderation and deletion work; no keys in client bundle/logs. Test cold starts and backend loss with saved maps still accessible.

## P1-02 — route catalogue is approximate, not a verified hiking network

- **Evidence:** `data/treks.ts` explicitly labels geometry illustrative; four trek overviews. `backend/app/routes.json` is model planning input, not a surveyed network. `places/hiking-references.ts` links a small set of OSM landmarks; a peak/temple/suburb point is not a trailhead or path. `destinationForTrek` forwards approximate destination to routing. Live Mardi page shows static duration/difficulty/permits and sparse stop elevations with warnings.
- **Impact:** an attractive trek page can be mistaken for a checked itinerary; endpoint selection may choose inaccessible summit access, an unsuitable approach or wrong entrance. No evidence establishes full Nepal coverage.
- **Solution:** versioned trail records with lawful full geometry, verified trailheads/entrances, source/license/date/reviewer, permitted access and route variants. Separate reference landmarks from navigable verified trails. Never fabricate danger-free sections or “must visit” advice.
- **Dependencies:** local guide/park/land-manager review, route/imagery rights, field survey and dated source records.
- **Acceptance:** a small initial Kathmandu/Pokhara collection has source geometry, field-reviewed start/end, loop/return plan, uncertainty labels and correction workflow; catalogue-only geometry cannot silently become a verified track. Route records retain revision/provenance and access dates.

## P1-03 — offline basemap downloads do not exist

- **Evidence:** `offline.tsx` saves itinerary/checklist/contact/crew waypoints; warns tiles require internet. `FullRouteMap.tsx` renders `RouteSketch` offline. Leaflet JS/CSS comes from unpkg; raster tiles load online. No region-download/package/index/cancellation/quota/expiry manager identified.
- **Impact:** remote users may retain a line but lose surrounding paths, contours and landmarks precisely when mobile service disappears. Cached browser tiles are not a guaranteed download.
- **Solution:** an explicitly licensed offline tile/region solution, including renderer/style/glyph/sprite assets if applicable; retain local route geometry and text directions. Show downloaded area, size, version, limits and last refresh.
- **Dependencies:** map-provider offline rights and capacity, SDK57-compatible native renderer evaluation, storage design and real-device builds.
- **Acceptance:** fresh install → download region → terminate app → airplane-mode cold launch → route, terrain, labels, position and essential instructions work; partial downloads are detected; deletion/corruption/low-storage handled. Do not bulk-prefetch public OSM raster tiles: [OSMF policy](https://operations.osmfoundation.org/policies/tiles/).

## P1-04 — lock-screen/background hiking is unsupported

- **Evidence:** `hooks/useTrekLocation.ts` removes foreground watcher when AppState is inactive. `navigate.tsx` pauses/checkpoints. `record-hike.tsx` explicitly says locking/leaving pauses recording; only summary saved. No background TaskManager integration or background location configuration identified.
- **Impact:** continuous recording/navigation and timely deviation warnings stop when a hiker locks the phone. Keeping screen lit increases battery burden. Current copy is honest, but this is a major capability gap.
- **Solution:** choose whether Phase 2 promises foreground-only beta or background navigation. For background capability, implement version-matched platform permissions/tasks, foreground service where applicable, explicit consent, notifications and reliable resume.
- **Dependencies:** iOS/Android development builds, physical devices, platform policy review, power tests, approved location privacy policy.
- **Acceptance:** screen lock, background, GPS loss, OS kill/relaunch, deny/revoke permission and low-power scenarios measured on both platforms; show stale fixes and recording gaps; no covert restart or sharing. Document unavoidable OS limits. [SDK57 location reference](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

## P1-05 — production provider capacity and elevation pipeline are incomplete

- **Evidence:** `places/search.ts` and `routing/walking.ts` only use public fallbacks in development; release check fails without configured providers. Map document hard-codes public street tiles and loads CDN Leaflet. `map-providers.ts` defaults terrain tiles. OSRM decoder gives null ascent/descent. GPX stats sum raw positive/negative elevation deltas; no DEM sampling, smoothing/error metadata or independently verified trail surface grade.
- **Impact:** a development route can work while production routing/search fails. Public outages/limits break important features. GPX noise can inflate ascent; raster contour images do not supply trustworthy hiking duration or elevation analytics.
- **Solution:** provider adapters with approved service quotas, retry/backoff/cache/observability; versioned tested foot-routing profile; lawful elevation source with quality flags and carefully specified metrics. Keep numeric hiking ETA unknown until justified. Bundle renderer assets where appropriate.
- **Dependencies:** provider decision, terms/cost review, coverage benchmarking and GIS expertise.
- **Acceptance:** real Nepal route benchmarks test legal access/snap quality/geometry; release env checks pass; throttling/5xx/timeout do not erase plan; metric fixtures cover gaps/noisy elevations/return legs. Compare displayed distances/ascent with source tolerances. Do not claim a route is “best” simply because it is first.

## P1-06 — mapped facilities/hazards are incomplete and timed out live

- **Evidence:** live Overpass request returned “Mapped stops took too long…”; `trail/places.ts` filters certain OSM tags within 300 m and caps area/results. Its stale cache is memory-only. Straight-line proximity to a line does not establish a safe accessible detour; OSM absence is not absence of hazard.
- **Impact:** rest/water suggestions unavailable in the sampled flow; missing or stale facilities may create false confidence. No current hazard/closure feed or verified water quality.
- **Solution:** retain provenance/freshness; add reliable bounded service/cache and reviewer-maintained key facilities/access notes; order by along-route position and verify detours where possible. Separate mapped caution from verified active closure.
- **Dependencies:** P1-02 trail data, provider capacity, local observations and refresh ownership.
- **Acceptance:** timeout leaves route intact (already observed), retry/stale state works after restart, each POI shows source/date/access uncertainty, unavailable water is not labeled potable, “no results” never becomes “no danger.”

## P1-07 — native end-to-end and recovery evidence is absent

- **Evidence:** exports pass, but no installed native builds ran. Rules test suite fails its missing-emulator hook; advisory scan and two Doctor checks blocked by network. `navigation-draft.ts` has checkpoint tests; standalone recorder uses refs and writes summary, without restoring an active session. Push registration needs EAS project ID; app.json has no literal EAS project ID, and runtime linking/credentials are unverified.
- **Impact:** native map bridge, sign-in, GPS, push and restart failures can escape unit tests. A passing bundle is not a production-readiness signal.
- **Solution:** reproducible pinned CI/runtime; emulator assertions; two-device/native test matrix; staged failure-injection and release gate. Distinguish recorder summary from resumable path recording.
- **Dependencies:** network access, installed emulator tooling in approved environment, EAS project linkage, signed builds and real phones.
- **Acceptance:** rules assertions pass; package/SDK checks complete; signed iOS/Android login→search→plan→save→navigate→pause→restart→finish/export passes; no wrong-account data; push receipts and actual delivery distinguished; operator can roll back.

## P2-01 — fragmented trip concepts and long phone flows

- **Evidence:** Home exposes trips, day hikes, adventures, AI itinerary, copilot, recorder and offline essentials. Separate models in trip-library/adventure-store/routes/journey; catalogue describes out-and-back while provider plans are explicitly one-way. Weather and directions expand the details page substantially. Screenshots 02–09 show contrasting density between photographic overview, forms and utility navigation.
- **Impact:** a beginner may not know where a saved plan lives or how to include a return, rest stops and crew in one outing.
- **Solution:** one primary “Plan a hike” journey with named route/trip states, progressive disclosures, clear return/transport steps and persistent map/details switch. Preserve existing data with migration rather than replacing stores blindly.
- **Dependencies:** product lifecycle decision, P1-02 metrics, migration design.
- **Acceptance:** a first-time user can find Phulchowki, select start, review outward/return scope, save, reopen and find navigation without developer help; storage location and sync status are clear at every save.

## P2-02 — general POI search still adds noise and language inconsistency

- **Evidence:** Phulchowki appears correctly first, but search also shows unrelated café/fuel/neighbourhood entries. `PlaceSearch` uses Nepal-scoped Photon plus reference aliases; detailed catalogue contains only four treks. `services/discovery-search.ts` strips non-Latin text while hiking-reference matching preserves Nepali Unicode: inconsistent normalization between paths.
- **Impact:** users searching hike intent can still choose a similarly named settlement/business; Nepali queries may behave differently across screens.
- **Solution:** trail/trailhead/landmark sections, regional intent ranking and consistent Nepali/English aliases, with an explicit general-places fallback. Do not label every OSM peak/attraction a verified hike.
- **Dependencies:** validated Nepal catalogue, geocoder metadata and multilingual query corpus.
- **Acceptance:** representative partial/misspelled/Nepali queries for Phulchowki/Shivapuri/Dhap/Budhanilkantha/Kathmandu/Pokhara prioritize intended places; ambiguous entrances remain distinguishable; offline catalogue search and remote errors are explicit.

## P2-03 — mobile readability and accessibility require another pass

- **Evidence:** 390px Mardi screenshot truncates the essential `Unverified` metric; hero consumes considerable vertical space. Map attribution is forced to 10px in map document; profile footers and map caveats use 9.5–11px. FullRouteMap reserves a minimum 120px map and up to 48% details, but large-font/short-screen effects were not device-tested. Home/AI use floating dock; utility pages use Stack headers. Reduced-motion and many semantic button labels are positive existing controls.
- **Impact:** critical uncertainty or source text is easy to miss; long text/map gestures may be difficult with larger fonts or assistive tech.
- **Solution:** keep essential status untruncated, hierarchy/contrast checks on photos, scalable captions, keyboard/focus and screen-reader alternatives for maps; consistent back/navigation behavior.
- **Dependencies:** accessibility/phone matrix and primary flow decision.
- **Acceptance:** 320/390/430 widths, large Dynamic Type/font scale, VoiceOver/TalkBack, reduced motion and keyboard checks; actionable controls retain adequate targets; route instructions remain usable without reading map graphics. No claim of compliance from screenshots alone.

## P2-04 — privacy/operations controls need verification and retention decisions

- **Evidence:** AsyncStorage contains routes, emergency contact snapshots and optionally GPS paths; privacy screen states downloads remain after sign-out. Crew sharing pauses but last marker remains until hidden. Current rules are default-deny and backend auth checks revocation/membership (good). `TrekJourney.tsx` saves cinematic session summaries under `trek-session:<uid>:<trek>`, but the inspected privacy cleanup functions do not enumerate that prefix; `clearUserData` only removes profile/onboarding. This leaves session metadata outside the apparent cleanup inventory (no raw GPS is stored in that session). Server workers and deletion retries exist, but deployment/retention/restore practices unverified. Public support/privacy URLs fail release check.
- **Impact:** device handover, exported files and stale crew markers create privacy expectations to manage; failed background cleanup or undelivered alerts need operational ownership.
- **Solution:** documented retention/export/delete lifecycle, approved privacy/support endpoints, least-privilege credentials, redacted observability, backup/restore and deletion drills. Evaluate encrypted sensitive local storage against offline-access needs.
- **Dependencies:** owner decisions, hosting and verified backend; no auth weakening.
- **Acceptance:** account switch/sign-out/clear/delete tests cover all stores; last-location timestamp/visibility unambiguous; revoked member loses access; server deletion retries audited without private content logs; no rescue/delivery guarantee.

## P2-05 — static Nepal rules and weather licensing are not release-grade data

- **Evidence:** static `permit` and `bestSeason` strings have no per-fact freshness/reviewer; source pages advise confirming. Weather is real model data, not a mountain observation; no automatic official-warning ingestion. [Open-Meteo terms](https://open-meteo.com/en/terms) limit the free service to qualifying non-commercial use and bounded calls. Published map links in `PublishedMaps.tsx` are external references, not downloaded/licensed route verification.
- **Impact:** future access changes, permit eligibility and forecast uncertainty are not represented structurally. Commercial launch may violate a presumed free-provider model.
- **Solution:** park/permit/season/access records by jurisdiction, source/date/audience, validated transport/stay information; link official DHM warnings; forecast staleness and altitude limits; lawful provider plan before monetization.
- **Dependencies:** local authorities/NTB/DNPWC/park and conservation managers, legal/usage review.
- **Acceptance:** every operational claim has date/source/owner; stale records visibly expire; far-future dates never invent forecasts; water/hazard/emergency advice remains source-bound; business model fits provider rights.

## P3 — later improvements

After essential reliability: broader user photo contributions and moderation, personalized discovery based on verified trails, community route corrections, deeper elevation/surface charts, optional 3D presentation and animation polish. These must not precede map/data/offline verification. Evaluate unused dependencies and large asset/bundle costs with measurements; do not remove or upgrade packages just on appearance.
