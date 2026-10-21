# Navo Phase 1 — proposed upgrade roadmap

21 October 2026. This is a proposal for review, not authorization to begin implementation. No mapping migration or deployment has been performed.

## Verdict and five priorities

Navo is an advanced development preview with working online search/routing/weather and considerable tested local persistence. It is **not ready to promise dependable Nepal-wide field navigation**. Prioritize:

1. Restore authenticated backend readiness and prove AI/groups with real accounts (P1-01).
2. Establish a small, versioned, licensed, locally verified Nepal trail dataset (P1-02).
3. Provide lawful offline basemaps and prove restart/recovery in airplane mode (P1-03).
4. Decide and implement a truthful background-navigation capability, with real-device validation (P1-04/07).
5. Contract/configure reliable routing/search/elevation capacity, then simplify the primary planning UI (P1-05/06, P2-01/02/03).

## Leaflet decision

**Retain Leaflet for the current web preview; evaluate replacing the native WebView renderer through a bounded proof of concept after approval.** Current evidence does not justify rewriting the entire map system immediately: online full-screen preview and directions worked in this audit. The biggest deficiencies are route provenance, provider readiness, offline regions and background operation. A renderer swap does not repair those.

Separate contracts for basemap display, route engine, elevation, geocoder, POIs and GPS before selecting another renderer. Native MapLibre is a candidate for a comparison, not a drop-in fix or a free data supplier. Its current documentation URL could not be fetched during this audit; compatibility/API claims require fresh version-matched validation before implementation. A licensed raster/native alternative should be compared rather than assumed inferior.

Evaluate on SDK57 native builds using identical routes: render startup, 20–30k-point geometry, GPS updates, pan/zoom, memory, battery, screen-reader text directions, region downloads, style assets, low storage, cold offline launch and migration cost. Keep the existing Leaflet path until an alternative passes. OSM public raster policy forbids bulk offline prefetch; an offline-capable library does not grant tile rights. [OSMF policy](https://operations.osmfoundation.org/policies/tiles/).

## Phase 2A — make the existing core reproducibly work

Scope: resolve P1-01 and verification infrastructure; no cosmetic rewrite.

- Confirm public backend URL and Firebase Admin project access without exposing credentials. Verify database/rules/index deployment and ownership. Use a dedicated non-production environment/test accounts.
- Configure exact frontend main/chat URLs and CORS; preserve verified-email, token-revocation and membership checks. Verify email delivery separately from server setup.
- Run rules emulator assertions, complete Doctor/advisory checks with network access, add an environment readiness runbook and production release checks to the release process.
- Execute real model request, create/join/message/leave group, review moderation and account-deletion retry drills. Prove no paid inference occurs unexpectedly; record counts/costs without user content.
- Acceptance: all P1-01 criteria; no fake success, retry doesn't duplicate group creation or erase local plans, native email/Google sign-in works in signed development builds.

## Phase 2B — trustworthy Nepal starter collection

Choose an initial region rather than claiming all Nepal. Suggested research targets: Phulchowki/Godawari, Shivapuri/Budhanilkantha, Sundarijal/Dhap and selected Pokhara day walks. These are candidate topics, **not approved routes or verified accessible trails**.

Define route schema: source/license/revision, full track, entrances, travel direction/return geometry, measured distance/ascent method/error, difficulty basis, access conditions and seasonal exceptions, permit authority/audience, important facilities, verified date, correction/report workflow. Publish separate planning references when geometry is unverified. Review by local guides/authorities and field-test records before promoting navigation.

Official research starting points:

| Need | Authority / validation needed |
| --- | --- |
| Parks, opening/access/closures | DNPWC and individual park offices; DNPWC site fetch timed out in audit. Confirm current rules directly, including Shivapuri-Nagarjun trail entrances and protected-area constraints. |
| Trekking registration/guide requirements | [Nepal Tourism Board TIMS](https://ntb.gov.np/plan-your-trip/before-you-come/tims-card); route/visitor applicability needs checking, not copying a generic label. |
| Conservation areas | Relevant conservation/park authority, including NTNC-managed areas where applicable; research current permits and lawful data reuse. |
| Weather/warnings | [DHM](https://www.dhm.gov.np/) official bulletins plus attributed model forecasts. No blanket mountain accuracy guarantee. |
| Paths/trailheads/POIs | OSM objects/revisions plus licensed GPX from consenting surveyors/local guides; cross-check access/bridges and field geometry. |
| Food/water/stay/transport | Local operators/municipalities/park offices and recent dated observations; no inferred availability, prices, safe water or timetables. |
| Emergency information | Park/local authority and operator-verified contacts, geographic scope and dates. No invented numbers; crew alert is not rescue dispatch. |

Acceptance: reviewed dataset, permission/provenance records, reproducible metrics, representative Nepal/English spelling tests and explicit low-confidence classifications.

## Phase 2C — map and offline reliability

Choose provider-approved production tiles/search/foot routing. Test multiple real Nepal routes and inaccessible endpoints. Implement lawful offline packages and resumable downloads with size/space/version/deletion. Include nonvisual text directions and cached key facilities with age, not only an attractive map.

After approval, run renderer comparison and migrate only if justified. GPS/session state must be independent of map mount/unmount. Preserve local saved plans; write migration and rollback tests before consolidating stores. Acceptance includes offline cold start, restart, corrupt/incomplete package, no network, stale weather, provider failure and account switch.

## Phase 2D — navigation and mobile usability

Unify primary flow: search → select real trail/entrance → outward/return and transport → date/pace → reviewed route → save/download → navigate → finish/history. Keep map prominent and route controls compact. Use one clearly named saved-plan library and explain local versus cloud sync. Retain photographic discovery and varied bundled gallery assets.

Provide clear current instruction, GPS age/accuracy, uncertainty, remaining distance and conservative ETA only with a valid method; avoid confidently snapping across switchbacks/overlapping return routes. Validate background behavior and local session journaling on physical devices. Navigation must continue independently of chat availability.

Accessibility acceptance: small phone widths and large font scales, readable uncertainty labels (currently truncated on sampled overview), contrast on imagery, focus return after map/details transitions, VoiceOver/TalkBack alternatives and reduced motion. Consolidate duplicate navigation/recording models only with preservation/migration tests.

## Phase 2E — measured beta and operational release gate

Invite a small consenting test group; label unverified trails, offline scope and foreground-only limits if not yet resolved. Collect redacted crash/performance/service-failure metrics and correction reports. Establish dataset/closure refresh ownership, moderation, incident response, rollback and backup/deletion drills. Do not market AI as field authority.

Release only after real device journeys, field-reviewed starter routes, provider rights/capacity, privacy/support endpoints, signed native builds, rules assertions, key handling and measured offline recovery pass. A clean lint/test/export is necessary but insufficient.

## Initial no-cost approach and its limits

- Keep current local development and unit tests; use the existing Firebase Spark project's eligible no-cost services within quotas. Do not enable billing automatically. Spark is explicitly a no-payment-information plan, but product-specific restrictions still apply. [Firebase plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
- Render Free can preview the backend over HTTPS, while Firestore remains the data store; do not put persistent data on its ephemeral filesystem. Render explicitly discourages production use of Free instances; idle sleep and cold starts affect AI/groups. This is a **demo/beta tradeoff**, not dependable hiking infrastructure. [Render Free](https://render.com/docs/free).
- Use lawful local/consented GPX and bundled credited photographs. Free data licenses still impose attribution/reuse duties. Public endpoints are not unlimited hosting.
- Open-Meteo's free API is for qualifying non-commercial usage with limits; choose a permitted service arrangement before ads, subscriptions or other commercial use. [Terms](https://open-meteo.com/en/terms).
- Nemotron/provider API keys do not prove a free inference entitlement. Confirm the account's allowance; retain user/global request limits and disable AI gracefully if budget is exhausted.
- Keep offline maps, continuous push/worker operation, storage/bandwidth and native distribution costs as explicit decisions; no credible promise of all features at unlimited zero cost.

## Decisions needed after review

1. Approve Phase 2 scope and starter region; foreground-only beta versus background field-navigation promise.
2. Select provider capacity/offline licensing and approve any costs; existing preference remains no-cost preview, not a billing upgrade.
3. Approve a concrete map-renderer comparison before any dependency/library migration.
4. Provide/authorize secure backend project access and hosting configuration. Any new Admin credential or expanded access requires separate concrete review.
5. Select authoritative trail reviewers and rights to source geometry; approve product privacy/retention and support policy.

Recommended first implementation step after approval: **Phase 2A backend readiness plus a reproducible two-account smoke test**, while defining the verified trail schema before adding more route claims. Stop here until the user reviews this audit.
