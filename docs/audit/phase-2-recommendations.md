# Phase 2A — findings and approval decisions

21 October 2026; source baseline `4e525f9`. Related deliverables: [backend-smoke-test](backend-smoke-test.md), [geographic-data-audit](geographic-data-audit.md), [offline-gps-readiness](offline-gps-readiness.md). All six Phase 1 reports were read before investigation; original application work and reports were preserved.

## Answers to the eight requested questions

1. **Backend ready? No.** Verified running health 200/model configured, readiness 503, unauthenticated chat/group 401, valid current-origin preflight. Fresh local Admin initialization fails 503; no usable configured Admin file/inline pair/standard local ADC was found. Main client API address is absent. No backend setting was changed.
2. **Two-account test status? Blocked, not executed.** No designated staging A/B pair or staging backend URL was available. One existing personal session and an extra same-browser public-route tab are not two independent accounts. Manual steps with separate profiles/devices are supplied; no production group/invite/member/message was modified.
3. **Is sample route backed by credible geometry? Yes as a provider-derived line, not a verified hiking trail.** Reproduced UI route/export has 269 points; every vertex matches the fresh OSRM response, which reports 6,756.6 m and 27 steps. Official OSM landmark lookup confirms the selected peak point. Current path/access validation was blocked by Overpass 406; no field or authority validation/return geometry exists.
4. **Elevation/time reliability? Incomplete.** Export has zero elevation samples; OSRM ascent/descent null. Provider baseline 5,405.3 seconds corresponds to effective 4.5 km/h in this sample, not calibrated mountain time. GPX elevation, if supplied by another file, remains source data with potential noise; catalogue elevations/days are approximate. Numeric hiking ETA remains unknown where required.
5. **Actually offline?** Local metadata/checklists/snapshots, saved walking geometry/text directions, GPX and optional navigation path/checkpoints. No downloaded terrain tiles or DEM; no full offline geocoder. Device GPS and local line matching may function foreground without internet, but cold-start/expiry/OS-kill behavior was not tested physically.
6. **Why GPS stops on lock?** Explicit AppState pause and foreground subscription teardown; no background task/update service. A permission-description string does not enable background tracking. Code establishes the behavior; physical device tests remain unverified.
7. **Top five fixes?** See prioritized sequence below.
8. **Approval decisions?** See explicit decisions below; nothing requiring a settings/credential/provider/billing/deployment change was performed.

## Phase 1 accuracy cross-check

The principal Phase 1 findings match the current implementation: illustrative catalogue data, real online walking adapter, unknown routed ascent, local persistence, foreground-only GPS and incomplete connected services. This run adds stronger evidence and two refinements:

- A sandbox CLI connection failure is **not** equivalent to a dead API: direct network-enabled probes show the server alive but database-unready.
- CORS is allowed by the running process, although fresh local settings differ. Do not call CORS the proven immediate blocker or edit it blindly.

The sample's rendered line is now tied to exported geometry and a reproducible provider response. That improves provenance evidence without upgrading it to a field-verified trail. Source geometry/revision/access evidence is still missing from normal GPX export metadata.

## Five highest-priority actions after approval

| Order | Priority / action | Impact addressed | Dependency and measurable acceptance |
| --- | --- | --- | --- |
| 1 | **P1: Firebase Admin/database readiness and client main API connection** | AI/groups cannot complete | Approved credential/IAM/hosting/startup configuration; readiness 200 and authenticated staging session succeed; no auth bypass |
| 2 | **P1: real independent A/B integration and failure tests** | Mock tests cannot establish shared privacy/persistence | Existing approved staging accounts, separate contexts/devices, rules/indexes; all 10 smoke steps plus removed-member denial and refresh pass |
| 3 | **P1: a locally reviewed starter route with versioned geometry/access/elevation** | Route can be plausible yet unsuitable/unlawful | Licensed full geometry, park/local reviewer, verified entrance/outward/return; evidence of distance/elevation method, dated access and explicit unresolved facts |
| 4 | **P1: honest offline and GPS lifecycle contract, then device tests** | Current line-only/foreground experience insufficient for remote promises | Choose scope first; prove cold offline launch, lock/pause/resume, OS kill, GPS loss and storage boundaries. No SDK migration required to define/test these. |
| 5 | **P1/P2: provider reliability and user-facing provenance** | 403/406 failures, missing production capacity, export lineage and planning ambiguity | Provider-approved endpoints/terms; outage/retry/cache tests; clear one-way/return/unknown-time states; portable source/license/revision records |

No confirmed P0 security exploit was demonstrated. Labeling this evidence as “verified safe Nepal trail navigation” without access/field validation would create a critical navigation-safety risk. Preserve existing safety disclosures and least-privilege authentication.

## Concrete approval/input decisions

- **Environment and test identities:** identify the non-production backend/database and two existing test accounts. Provide approved secure credential references/file paths, not secret contents. Do not use current personal production data as a convenient fixture.
- **Configuration/access:** approve the exact Admin identity/credential mechanism, needed IAM scope, main/chat URLs and repeatable runtime/CORS configuration before changes. A Firebase console link alone does not configure Admin access. Any new key/access expansion needs concrete action-time review.
- **Hosting/provider/billing:** approve changes separately. Current preference remains no-cost preview; no billing, provider settings, secrets, deployment variables, runtime restart or production rules were changed. No claim that a model key guarantees free inference or adequate provider capacity.
- **Trail validation scope:** choose one corridor and a qualified local reviewer/authority, legal geometry source and data rights. Candidate corridors remain research-only. Decide who owns update/closure review and permitted data retention.
- **Offline/background product promise:** decide foreground-only beta versus dependable background recording and lawful offline regions. Device permission/privacy/distribution work and any future dependency/SDK choice require a separately scoped implementation.

## Checks and artifacts completed

**Verified in this phase:** lint/typecheck passed; selected client suite 60/60; selected backend suite 59/59 with one existing TestClient deprecation warning; safe live health/readiness/auth-denial/CORS probes; local Admin initialization check; public OSM peak lookup; app route calculation and GPX export; independent 269-point geometry/distance comparison against fresh public OSRM response.

**Blocked/unverified:** real A/B flow, authenticated AI reply/provider-key validity/credits, live Firestore reads/writes and deployed rules, independent way-access comparison, field survey, native background/airplane-mode/cold-restart testing. Photon command-line lookup 403 and Overpass 406 are bounded observed request failures, not proof that every native/web deployment is permanently denied.

The browser GPX download event completed after a long tooling delay. It was successful, but no normal export-latency claim or app performance diagnosis is made from that delay. Exported route evidence contains public route coordinates, no personal GPS track. Opaque OSRM waypoint hints were removed from the stored API artifact; geometry/node annotations remain, with original-response and stored-artifact hashes recorded separately.

Changes are limited to these four Phase 2 documents and local audit evidence under `docs/audit/evidence/phase-2a/`. Existing Phase 1 documents were not rewritten. No application code, dependency, map renderer, service/provider setting, billing, authentication credential, production record or deployment was changed. No Git push was performed.

## Stop point

Investigation and documentation are complete. The next proposed implementation is a narrowly approved staging backend connection and independent A/B smoke run, not a map rewrite. Review these findings and supply/approve the required environment decisions before implementation proceeds.
