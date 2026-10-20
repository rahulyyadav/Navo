# Navo live-flow audit — 20 October 2026

## Decision

Navo can already search mapped places, generate a real walking route, open full-screen route directions, fetch selected-date weather, and save route geometry locally. It is not ready to market as a dependable AllTrails alternative. The largest gaps are reliable service deployment, verified trail data, offline basemaps, and field-tested mobile navigation. Changing the map renderer alone will not close them.

This audit changes no application code or account preferences. One walking plan was saved locally to verify the save action: garden entrance → Phulchowki, 21 October, 07:00 NPT. It was not shared. No invitations, public reviews, messages to people, or location-sharing sessions were sent.

## Scope and evidence limits

- Ran the current Expo web app on port 8115, inspected mobile layouts at 390×844 and discovery at 320×568, plus an initial desktop discovery screenshot. This is browser verification, not a native-device certification.
- Signed in successfully with the supplied account. It entered mandatory onboarding. The user chose to complete onboarding themselves, so Home, Groups, Profile, dedicated AI chat, recording and saved-library screens behind that gate were not runtime-audited. Their relevant source paths were reviewed separately.
- Used public places for route endpoints; did not request the user's precise location or simulate a GPS walk.
- Started the existing backend on its configured chat port 8114 with preview CORS enabled for this process. No environment files were changed. Health reports AI configured; account-storage readiness fails.
- Used REA controlled browser capture on the public AllTrails website. Homepage and search interface were captured. The deeper trail request yielded only an iframe, and a subsequent visual capture showed a verification challenge. No challenge was solved or bypassed. Native AllTrails navigation, offline internals, private APIs and backend architecture remain unverified.
- Fresh screenshots are in `screenshots/`. They contain no password. The onboarding screenshot and competitor challenge screenshot were excluded because they contain account/network identifiers.

## Numbered flow results

| Step | Action and observed result | Health |
|---|---|---|
| 1 | Open login at phone size; fields and login action render, submit succeeds | Working |
| 2 | Account lands on step 1 of 5 onboarding; Home redirects there until preferences are completed | Blocked for this audit by user-owned setup |
| 3 | Public discovery loads four trek overviews and region/difficulty filters | Working but very limited coverage |
| 4 | Search `Pulchowki` in catalogue: 0 of 4 results | Product gap |
| 5 | Open walking planner and type the same spelling: Phulchowki hill is suggested | Working |
| 6 | Search origin `Godawari`: three identical Godawari labels appear; refine to botanical garden to identify entrance | Working provider, ambiguous UX |
| 7 | Select Entry national botanical garden → Phulchowki; set 21 October, 07:00; request walking route | Working in this run |
| 8 | Automatically opens full-screen map: 6.76 km, 27 steps, terrain tiles and endpoint markers | Working |
| 9 | Expand directions and open trip details; one-way warning, endpoint offsets, missing hiking-time explanation appear | Working; information hierarchy needs work |
| 10 | Request hourly weather: departure-day forecast, source, fetch time, sunrise and sunset load | Working in this run |
| 11 | Request stops/viewpoints: provider-unavailable error; route remains visible | Failed dependency, graceful recovery |
| 12 | Save walking plan: local save confirmation appears | Save action working; cold-start/library recovery not runtime verified |
| 13 | Ask route assistant a beginner planning question: backend-unreachable error initially | Failed |
| 14 | Start configured local backend and retry assistant: service-unavailable error; `/ready` says account storage unavailable | Failed; root setup dependency identified |
| 15 | Open Everest detail: varied photographs and overview render; 44.3 km approximate length with Out & back label | UI works; misleading metric risk |
| 16 | Reviews section and Retry: still asks to connect account | Unavailable in this configuration |
| 17 | Discovery at 320×568: CTA wraps within bounds; filter strips require horizontal scrolling; first trail is below fold | Reflows, but task density poor |
| 18 | REA AllTrails homepage and Kathmandu search exercise | Partial comparator evidence; no validated trail results |

## Preserve these strengths

- Full-screen walking-route preview now exists and opened automatically after generation. Do not replace it with another small embedded map.
- Phulchowki spelling aliases work in the planner. The original complaint is not universally reproducible there anymore.
- Date-specific hourly weather is genuinely fetched, rather than a fixed demo value.
- Route geometry is validated; incomplete routes and distant endpoint snapping are rejected. The observed offsets were 6 m at the start and 28 m at the destination.
- Hiking duration is withheld when elevation/difficulty are unknown. The displayed 1h30m routing baseline is explicitly not a confirmed hiking time.
- Photos on the Everest gallery are now varied. The older screenshot showing repeated crops does not describe this current detail screen.
- Error states preserve the selected route and typed AI question.
- Account-scoped storage, recording/path validation, navigation checkpoints, review moderation and routing guards have automated coverage.

## Highest-priority problems

### P0 — Services are not deployable as configured

`npm run check:release` fails on six fields: public HTTPS API URL, privacy URL, Photon URL, walking-router URL, chat URL (currently loopback), and support email. The local backend `/health` returns `aiConfigured: true`, but `/ready` returns account storage unavailable. `/chat` depends on authenticated Firebase Admin verification and database checks before inference, so the presence of the Nemotron key cannot make the current user flow work by itself.

Implement a reachable HTTPS backend; valid server-side Firebase credentials and project access; deployed Firestore rules/indexes; allowed frontend origins; readiness monitoring; model timeouts and quotas. Keep model/Admin keys on the server. Prove a real authenticated `/session`, `/chat`, group creation and two-account read/write cycle. Do not remove authentication or mark a feature connected to hide setup failures.

### P0 — Overview metrics can look more authoritative than their data

Everest detail shows `Out & back` and `44.3 km`. Source `trekStats()` sums straight-line distances between eight approximate stops, which end at base camp; it does not measure the actual walked path or include a return trace. Ascent is likewise derived from sparse stop elevations, missing climbs between them. The lower-page disclaimers do not fully repair the first-screen impression.

Until a licensed/validated route track exists, replace the prominent distance/gain with `Route distance not verified`, or explicitly label the number `Straight-line span between planning stops`, outside the primary hiking metrics. Store route direction, geometry provenance, measurement method, version, date checked and reviewer. Derive navigable distance/elevation from the actual accepted track, never from an LLM or sparse stop list.

### P0 — Offline essentials are not offline maps

Current map rendering is Leaflet in a web iframe / native WebView using online raster tiles. Saved route geometry, GPX data and trip snapshots are useful, but do not guarantee a basemap after an airplane-mode cold launch. CDN-loaded map code and map tiles are additional availability dependencies. Navigation and recording use foreground location; recording pauses on background. Do not advertise screen-locked continuous tracking or complete offline navigation yet.

Implement a licensed offline map pack with geometry, style, glyphs/sprites and tiles, version/checksum, bounds, size, cancellable/resumable download, low-storage handling and explicit coverage. Distinguish offline viewing/following from offline rerouting. Prove both platforms in airplane mode after force-close and reboot before making the claim.

### P1 — Two search systems create a false “place missing” result

The catalogue searches only four overviews. The planner searches mapped landmarks and a live place provider. A user entering Pulchowki in one sees nothing; in the other sees the correct hill. Catalogue empty state suggests another search elsewhere rather than carrying the query there.

Use one primary search entry with grouped results: Trails, Places/trailheads, Regions. Support aliases, Nepali/English names, misspellings and nearby intent. Preserve the query when switching scopes. Deduplicate provider results and show type, district, distance from selected area and a small location preview. A hill coordinate is not a verified hiking trail: keep those result types distinct.

### P1 — Facility discovery cannot be relied upon

The real stops request failed. Add bounded server-side caching, dependency timeouts, backoff and explicit stale results. Curated facilities should have source, last checked, detour access, hours/seasonality, and potable-water status where known. A nearby water feature is not drinking water; no mapped hazards does not mean safe. Never ask AI to invent rest points, closures or danger zones.

### P1 — Sharing lifecycle needs correction/verification

Source review: `navigate.tsx` renders `TrekLocationSession` only in the details branch. Opening full-screen map returns a different tree, unmounting that component and losing its local sharing state. Its cleanup invalidates callbacks. Move the sharing session into a stable parent lifecycle, keep explicit consent/revocation, and test continuity with two accounts while toggling map/details and background states. This is a source-supported risk, not a completed two-device reproduction.

The end-confirmation concern was ruled out: the full-screen branch includes `!endConfirm`, allowing the details/modal branch to render. Do not file it as a confirmed defect.

### P1 — Mandatory onboarding and sync status obstruct trust

Successful authentication did not reach Home. With backend sync unavailable, existing cloud profile restoration cannot be assumed, and local setup may repeat across devices. Offer Skip for now for optional experience/goals; collect emergency details only when needed. Clearly distinguish signed in, saved on this device, syncing and synced. Do not imply cloud backup for local data. Re-test the actual Home after user completes onboarding.

## Precise UI/UX changes

| Surface | Current evidence | Recommended design |
|---|---|---|
| Discovery | Intro, large CTA, another search, two chip rows and disclaimers occupy almost the entire small screen before a trail | One visible search field first, compact region chips, filter button, result count, then first trail card; map/list toggle |
| Search results | Identical Godawari labels; hill found in only one search | Grouped result types, district/area and entrance labels, deduplication, preserve typed query |
| Planner | Single long scroll with pseudo-step indicators and manually typed date/time | Short destination → start/departure → route progression; native date/time controls; back preserves inputs; separate travel-to-trailhead from walking |
| Full-screen route | Large useful map; terrain is dense; route has 27 machine-style steps | Retain full map. Strong route contrast and directional arrows, clear start/end icons, recenter/heading controls, collapsible route sheet, readable maneuver wording |
| Route details | Multiple long warnings, actions and technical explanations compete | Compact summary: distance, verified ascent/time or unknown, one-way/return requirement; one primary Start action; secondary Save; collapsible source/limitations details |
| Weather | Hour cards load; long copy and horizontally hidden data | Show departure-window summary and daylight budget first; compact hourly strip; separate start/summit locations; unknown/out-of-range states; keep fetch timestamp |
| Trek detail | Attractive varied gallery; large hero; small stats and primary prep action | Keep imagery but prioritize route validity, distance method, difficulty and trailhead. Tabs for Overview, Map, Conditions. Avoid translucent information over busy photography |
| Reviews | Connection required with Retry, no feed in current build | Public published feedback if privacy/rules allow; dated conditions, clear pending own review, report/moderation path; distinguish service failure from no reviews |
| AI | Long context disclosure and server-oriented error | Brief consent summary with expandable data detail; useful question chips; status-aware retry; readable sourced answer sections and explicit unknowns |
| Global navigation | Source shows icon-only Home/AI/Map/Profile dock, Groups hidden from tabs | User-test labeled Explore, Saved, Navigate, Community/Profile structure; remove decorative chevrons; keep active trek reachable persistently |

Keep the existing slate/blue, lime and Satoshi identity. Use one spacing/type/radius system across forms, maps and cinematic pages. Color should not be the only route-status cue. Audit 44–48 point touch targets, 200% text size, VoiceOver/TalkBack focus, visible keyboard focus, reduced motion and contrast. No full WCAG compliance claim is made from screenshots.

## Map recommendation

Leaflet is the renderer, OpenStreetMap is map data, OpenTopoMap supplies the current terrain tiles, Photon supplies place search, and OSRM supplies walking routes. These are separate responsibilities. “Replace Leaflet” cannot repair missing routes, unavailable POIs, bad elevations or backend credentials.

Recommended direction: prototype **MapLibre Native on iOS/Android**, with a web renderer behind the same map adapter. Keep the existing working route/map interface until the replacement passes feature and device tests. MapLibre supports Expo/React Native integration and offline pack APIs, but production styles/tiles must be supplied separately. Compatibility, memory, gesture and offline behavior need validation in this SDK57 app; this audit did not install or certify it. [MapLibre setup](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/).

The adapter should support route geometry/selection, GPS accuracy circle, follow/heading, point selection, source attribution, terrain layers, route fit, offline state, and error recovery. Use Nepal trail styles with strong path hierarchy and restrained contours. Keep readable route instructions outside the map for accessibility. Use a hiking-capable routing provider with Nepal coverage and a reviewed corpus; validate representative Nepal routes before provider selection.

Do not bulk-download the standard OSM tile server for offline use: its policy prohibits that. Choose an explicitly permitted provider or licensed/self-hosted regional package. [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## What REA established about AllTrails

- A fresh public capture observed a search-first homepage, clear nearby/custom-route/trip entry points, a carousel with pause controls, and separate recording/offline feature descriptions.
- REA exercised typing Kathmandu. A search overlay with Clear, Cancel and a listbox appeared, but the only returned option in that capture was Trip Assistant; a page error was recorded. This does not prove successful Nepal trail autocomplete.
- The observed homepage linked to an Everest trail, but the deeper capture did not expose usable detail content. A subsequent screenshot showed a verification challenge. No competitor private implementation was extracted.
- Public web output contains Next.js assets. That says nothing conclusive about its native map SDK, GPS matching, offline storage, routing engine or backend. Do not copy private APIs, proprietary trail geometry, photos or bundles into Navo.
- Official help documents the product pattern worth adopting: open a selected route with current position, follow/record it, manage map/elevation information and download maps ahead for supported plans. Those are documented behaviors, not REA-verified native internals. [AllTrails Navigate help](https://support.alltrails.com/hc/en-gb/articles/37228358315668-Using-the-Navigate-feature).

Compete first on a smaller, accurate Nepal trail corpus and clear local logistics. Feature-count parity with AllTrails would be a weaker launch criterion than a beginner successfully completing a reviewed local hike with reliable recovery when connectivity fails.

## Viable initial no-cost phase

1. Start with a closed preview and a small set of locally reviewed Kathmandu Valley / Pokhara routes. Keep local saving, GPX import/export and an honestly labeled online map. Use licensed photos and route tracks with provenance.
2. Render Free can host a preview API, but it sleeps after 15 minutes of inactivity and can take about a minute to wake. Its filesystem is ephemeral; do not store user records or uploads there. Render explicitly advises against Free instances for production. [Render Free documentation](https://render.com/docs/free).
3. Retain durable external account/group storage within the chosen service's current no-cost quotas, with rules and access controls. Do not imply unlimited free storage or guaranteed availability. Configure Admin access through server secrets, never a client bundle.
4. The existing model integration still needs actual provider quota/credit verification and authenticated end-to-end testing. Add per-user/global limits, bounded context, timeouts, cost monitoring and an honest unavailable state. A free API key is not an unlimited production entitlement.
5. Open-Meteo loaded correctly in this run. Its hosted free service is for evaluation/non-commercial use; commercial licensing is separate. Forecasts have a limited horizon, so reject unsupported future dates instead of manufacturing weather. [Pricing](https://open-meteo.com/en/pricing), [forecast docs](https://open-meteo.com/en/docs).
6. Keep background push, continuous navigation, offline basemaps and wider discovery behind capability gates until tested and funded where necessary. A preview can be free; dependable public service with unbounded users cannot be promised free.

## Verification and release gates

Completed this run: lint passed; TypeScript passed; 124 client tests passed; 99 backend tests passed. Backend tests emitted one Starlette/httpx deprecation warning. Production configuration check failed with the six gaps above. Automated tests include fixtures/mocks and do not prove real service availability.

Before public release require:

- Two real accounts: onboarding sync, create/join/leave group, membership permissions, messaging, notification delivery, review submission/moderation/reporting, account removal and data isolation.
- Physical iPhone and Android: location denied/approximate/stale, forest GPS drift, out-and-back ambiguity, off-route recovery, pause/resume/end, app interruption and battery drain.
- Airplane-mode cold launch: exact advertised route/map/POI availability, low disk, corrupt downloads, restart recovery. No fabricated line across missing recorded segments.
- Field review of every launched route: access/permit/seasonality, start entrance, return logistics, measured geometry/elevation and dated facility references.
- AI adversarial and factual checks: no invented current closures, danger zones, potable water, forecasts or rescue promises; source/date citations and explicit uncertainty.
- Accessibility/device matrix: 320-wide small phone through large phones, landscape, text scaling, screen readers, keyboard, offline/slow network.

Application code was left unchanged. Remaining private-screen runtime audit depends on the user completing onboarding; real-world navigation/offline readiness depends on device and field tests, not this browser session.
