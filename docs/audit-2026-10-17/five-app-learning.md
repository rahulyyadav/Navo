# Five-app REA investigation and Navo implementation

Completed 18 October 2026. Baseline Navo commit: `8f078c0`. The scope is public web artifacts and official documentation, not decompilation of five native mobile apps. REA 6.5.0 actually ran for each accessible artifact set; hashes, evidence IDs, counts and limitations are in [five-app-evidence.json](five-app-evidence.json). Exact selected script URLs are in [artifact sources](five-app-artifact-sources.json).

## Evidence ledger

| Target | Actual inspection | Finding and boundary | Application to Navo |
|---|---|---|---|
| [AllTrails](https://www.alltrails.com/) | Homepage HTML and two referenced JavaScript chunks; REA parsed 2 JS files, recovered 18 modules | Public page presents search and compact trail metadata. Selected chunks expose packaging, not the full discovery or mobile navigation implementation. Inline scripts were outside analysis | Saved-route cards now show geometry distance, elevation availability, segment count and explicit provenance |
| [Komoot](https://www.komoot.com/) | Homepage HTML and referenced main bundle; REA parsed 1 JS file and reported 1,812 modules | Large modular bundle; bounded semantic analysis is incomplete. This does not prove routing algorithms, elevation source or mobile behavior | Independent source-elevation chart supports route assessment; no competitor route data copied |
| [Wikiloc](https://www.wikiloc.com/) | Initial raw homepage request returned 403. Normal browser loaded publicly; two observed search script URLs downloaded and parsed by REA | Search script contains localStorage reads/writes. Focused inert-byte inspection shows duplicate handling/capped recent searches and arrow-key/Escape handling. No search API or authenticated operation was invoked | Navo already has bounded recent-place storage. Added searchable private GPX library, multiword matching, deterministic length/date sorting and clear empty results |
| [Gaia GPS](https://www.gaiagps.com/) | Homepage HTML, homepage module and plan-comparison module; REA parsed 2 JS files | Modules refer to a componentized web presentation; this limited landing-page selection does not establish the map renderer or offline engine. Official navigation/download docs are recorded in the earlier report | Preserve disconnected GPX segments in the profile; label incomplete elevation and raw ascent instead of pretending the line is verified terrain |
| [Organic Maps](https://organicmaps.app/) | Public HTML through REA; zero application JS files parsed | Marketing website only. Its native offline map/search/routing engine was **not** inspected. No native APK/IPA was downloaded or executed | Retain the existing device-local GPX workflow and explicit online-map distinction; do not claim offline-routing parity |

REA sometimes categorizes HTML as an `electron-renderer` graph node. That generic label is **not evidence** that these websites or their mobile apps use Electron. Static import names and filenames also do not establish runtime execution. All graph limits and unknown scopes remain explicit. No login, paywall bypass, private data access, proprietary source copying or bulk trail collection occurred.

## Implemented independently in Navo

1. **Elevation profile for imported GPX:** plots only supplied finite elevations; shows low/high values and along-track distance. Different segments remain separate. Missing elevations produce an unavailable state rather than invented heights. Large tracks are sampled for rendering; source statistics retain full geometry. More than 100 segments or unusable geometry declines the chart.
2. **Private trail library search:** case/diacritic-normalized multiword search; newest/shortest/longest ordering; stable ties; no mutation of stored route order.
3. **Useful route cards:** name, supplied geometry distance, raw ascent or missing-elevation status, segment count, and “not verified” provenance. No fabricated difficulty or reviews.
4. **Review flow:** selecting a route brings its details to the top; search controls wrap on small screens, keyboard taps remain usable, and no-results state offers clear search.
5. **Performance:** route statistics are memoized across search edits. Elevation chart point count is bounded; no new dependencies or native configuration changes.

## Validation

100 client tests passed, lint passed, TypeScript passed, and iOS/Android/web exports succeeded. Tests cover disconnected segments, missing elevation, 20,000-point tracks, endpoints, search normalization, ordering and non-mutation. Builds do not establish device performance or field accuracy. The authenticated GPX-screen phone interaction and visual review still need an authenticated test session; no auth gate was bypassed or fake user data seeded.

## Remaining scope

Native competitor artifact/device analysis, actual offline-map packs and routing data, verified Nepal trail conditions, review moderation/community infrastructure, production provider configuration and physical GPS tests remain open. The six release-configuration gaps in the preceding audit are not resolved by this work. This is an incremental implementation with traceable evidence, not a claim of complete feature parity or production readiness.
