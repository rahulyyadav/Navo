# Navo: journey-first product and implementation plan

Date: 19 October 2026. Status: proposal, before implementation.

## Product promise

Choose a destination. Understand the whole journey. Follow the next step.

Navo should help people decide how to travel, prepare, and complete a journey.
The primary object is a journey owned by a user, rather than a collection of
independent maps, chats, hiking tools, and planners. ABC is the first complete
destination; the underlying system must support destinations outside our catalogue.

Keep the blue gradient, Satoshi typography, lime accent, photography, rounded
surfaces, and floating dock. Simplify hierarchy, navigation, content and actions.
No application code changes or tests are part of this planning pass.

## Findings from the current code

The route layouts, Home, profile, planning entry points, stores, journey renderers,
navigation, authentication/cloud providers, and backend planner reveal several
parallel product models:

| Current area | Finding | Product consequence |
| --- | --- | --- |
| `HomeScreen.tsx` | Search, filters, trek/group switch, preparation actions, carousel, and eight lower shortcut entries | The user must choose a tool before understanding the journey |
| `(tabs)/_layout.tsx`, `BottomNav.tsx` | Home, AI chat, Map, Profile; Groups hidden from tabs but surfaced elsewhere | Primary navigation represents capabilities rather than user goals |
| `plan.tsx` | Catalogue-specific preparation/checklist | Preparation is separate from route planning |
| `trek-plan.tsx`, `navigate.tsx` | Walking route planning, live GPS and checkpointed history | Useful navigation engine, currently assumes a walking plan |
| `day-hike.tsx`, `trip/[id].tsx` | Personal trip preferences, travel notes and expense planning | Another independent trip model |
| `copilot.tsx`, backend `planner.py` | Model itinerary generation and repair against known trek records | Catalogue-bound planner; technical model/audit details occupy user-facing space |
| `journey.tsx`, `TrekJourney.tsx` | Catalogue-driven cinematic overview/live/demo session | Different journey identity and progress path from saved walking navigation |
| `trips.tsx`, `adventures.tsx`, `routes.tsx` | Trip library, walking adventure library and imported GPX library | Users need to understand several kinds of saved items |
| `TripLibrary`, `Adventures`, preparation storage, navigation drafts | Separate account-scoped persistence and schemas | No authoritative active journey across the app |
| `CloudContext.tsx`, `NavoContext.tsx` | Shared services use a broad connection gate | Optional group/storage outages can dominate otherwise usable personal flows |
| Profile | Groups, updates, alarms, safety settings, setup, exploration links | Profile is carrying navigation and feature discovery responsibilities |
| Search | Catalogue and external place search both exist | Search selection must converge into a single destination identity |

This is an architecture and flow review, not a claim of a line-by-line audit of
every repository file or a real-device usability evaluation.

## Navigation

Three destinations in the existing floating dock, with visible labels:

1. **Home:** search, relevant destinations, and resume the current journey.
2. **Journeys:** current journey, drafts, saved destinations, and completed trips.
3. **Profile:** identity, preferences, privacy, accessibility and account settings.

AI becomes **Ask Navo**, available inside planning, journey review, and the current
stage. Maps open within journeys. Groups become optional travel companions inside
a journey. Safety/help stays accessible during travel; optional tools live under
journey details or a More menu. Do not place several independent planners in More.

Hide the global dock during full-screen journey travel. Provide back/close,
recenter, stage details and a consistent help action without crowding the canvas.

## The complete user flow

### 1. Entry and Home

Returning users land on Home, not a setup wizard. First-time users should be able
to browse/search before authentication; ask for sign-in when saving a personal
journey. This requires deliberately changing the existing signed-in route gates.
Defer nonessential onboarding; ask experience and preferences when they affect a
plan. Ask location permission only on Use my location or Start journey.

Home contains a compact header, a prominent Where do you want to go? search field,
one current-journey card when present, and a short destination collection. A draft
can show Continue planning. A ready journey shows View journey. A travelling
journey shows Resume journey. Do not put unrelated service connection errors in
the primary Home hierarchy.

### 2. Search and destination

Search catalogue destinations, aliases, external places and the user's saved
destinations through one input. Distinguish ABC from similarly named places with
region/country and destination type. A result outside the catalogue can enter the
same planner; missing itinerary evidence must remain explicit.

Destination detail answers: What is this place? What kind of journey is involved?
What are the key planning constraints? Show a photo, name, short description and
credible sourced highlights, with **Plan my journey** as the primary action and
Save destination as secondary. Open longer descriptions, sources and stories on
demand. Do not display unsourced default duration or prices as established facts.

### 3. A short, resumable planning flow

Use three steps, with autosaved drafts and Back preserving every answer:

1. **Start and dates:** origin/place or current location; departure date/time;
   available days or return date; flexible dates allowed.
2. **People and budget:** solo/group size; currency; amount; per-person/group
   basis; whole-trip budget scope including return. Budget can be undecided.
3. **Travel style:** transport preference, pace/experience, relevant constraints.
   Keep advanced options collapsed. Confirm a compact summary before generation.

Do not require raw latitude/longitude or daily-ascent thresholds from a typical
user. Allow manual starting places if GPS is denied. Capture the return endpoint;
reaching ABC and completing the whole trip are different milestones.

### 4. Planning in progress

Display real job states: Finding travel information, Comparing journey options,
Checking routes, Preparing your journey. Never fake progress percentages or claim
web research if no retrieval happened. The user can leave and resume a job.

Missing evidence yields specific questions or a partial draft. Provider failures
preserve preferences and offer retry/manual planning. Requests are idempotent;
repeated taps or reconnection must not duplicate plans or model charges.

### 5. Review and decision

The review screen starts with the animated journey overview, followed by a compact
summary: dates, estimated budget range, modes, overnight stops, return and open
questions. Recommend one feasible option. A Compare options sheet may show up to
two meaningful alternatives, such as cheaper transport or fewer transfers.
Explain the actual tradeoff. If none meets the constraints, say what must change.

Primary action: **Use this journey**. Secondary actions: Edit preferences and
Compare options. This saves a confirmed revision and sets the user's current
journey; it does not start location tracking or mark departure.

Quotes, estimated costs and actual expenses remain separate. Show transport,
accommodation, meals, applicable permits/guide costs, return and contingency in
the expanded budget, with exclusions and unresolved costs. Never invent a current
fare. Currency conversion, if added, needs its own dated rate source.

### 6. Journey hub before departure

One journey screen becomes the home for overview, daily plan, budget, preparation,
downloaded information, companions and research. The overview and next useful
action stay visible; the other sections open in sheets/details.

Offer Play preview separately from **Start journey**. A small preparation summary
can show outstanding essentials and Download journey. Saved itinerary/geometry
does not mean offline map tiles exist; communicate download coverage precisely.

### 7. Travel mode

The default canvas is a custom route with major stops, recognizable vehicle/walking
icons, completed segments, the current segment and the next checkpoint. Show one
bottom card answering: Where am I going next? How am I getting there? What should
I do now? Expand it for boarding details, sources, cost estimates or instructions.

Example structure, not a verified itinerary:

Your chosen origin → selected bus pickup → Pokhara → selected trailhead → daily
walking stages → ABC → return stages → chosen finish.

The overview is schematic and must be labelled as such. A geographic map uses
actual leg geometry, retains attribution, and remains one tap away. Small road
junctions are omitted from the overview, not removed from navigation geometry.
Bandipur or any sightseeing stop is optional unless actually on the chosen route.

Animation has three distinct modes:

- Preview: intentionally simulated playback with a visible Preview label.
- Live: marker movement follows recent, sufficiently accurate location fixes;
  interpolate only between observed positions, not toward an assumed destination.
- Manual: user confirms a stage/checkpoint when GPS is unavailable or unnecessary.

Persist pause/resume, route revision and current stage across restarts. GPS loss
freezes measured progress and shows the last update; it does not generate an ETA.
Support reduced motion, screen-reader stage lists and a battery-conscious mode.
Background tracking is a separate later capability; current foreground tracking
must not be presented as continuous tracking with the app closed.

### 8. Changes on the journey

The user can miss a bus, change the pickup, stay an extra night, exceed the budget,
or choose a different trail. Replan remaining stages, preserve completed stages
and actual expenses, and show the proposed changes before applying them.

Refreshing research must not silently rewrite an accepted itinerary. Explain what
changed, its evidence/date, and cost or timing impact. Closure reports or disputes
can mark a stage Needs confirmation rather than generate an invented detour.

### 9. Completion

Arrival at ABC celebrates a destination milestone while keeping the return journey
available. Whole-trip completion is explicit and reversible if tapped by mistake.
Show a restrained celebration, route recap, user-confirmed milestones, measured
and manual data distinctions, estimated versus logged spend, and optional notes.
Archive it in Journeys. No compulsory public sharing or review.

Game-like enjoyment comes from chapter progression, route reveals, meaningful
arrival animations and a completed journey story. No speed rankings, penalties
for pausing, or rewards for ignoring conditions or skipping rest.

## Consolidation and removal map

| Existing entry | New home/action |
| --- | --- |
| Standalone AI tab and AI copilot entry | Ask Navo within the journey; model diagnostics leave normal screens |
| Standalone Map tab | Journey map and stage detail |
| Home groups switch and group shortcut | Optional Companions in the journey |
| Add a trek / Ready to go / Plan any destination / Plan a day hike | One Plan my journey flow |
| Preparation page | Journey preparation section |
| Trips / walking adventures / activity history | One Journeys library |
| Separate imported-routes screen | Optional Import route under journey tools |
| Separate offline packs / safety essentials entry points | Download journey and contextual help |
| Record a hike shortcut | Record walking stage, with optional standalone recording later |
| Auto-rotating catalogue hero | Stable, intentionally browsed destination cards |
| Decorative dock chevrons | Remove while retaining dock styling and accent |
| Profile group/update/alarm statistics | Journey context or settings, not identity overview |

Remove duplicate entry points first. Retire old screens only after replacing their
needed behavior and migrating saved data. Existing deep links should open the new
equivalent. Emergency/help access must survive navigation cleanup.

## System architecture

### One authoritative journey model

Introduce an account-owned Journey with destination identity (catalogue reference
optional), origin and finish, preferences, plan revisions, stages, budget,
preparation, evidence, offline coverage and progress events.

Journey lifecycle: draft → planning → review → ready → travelling ↔ paused →
completed. Cancellation/archival are explicit. Planning job failure is separate
from lifecycle; it must not erase an existing ready journey.

Each stage has mode, endpoints, day/time window, geometry reference and provenance,
transport/operator details where known, cost/time ranges, evidence references and
status. Modes include walk, taxi, bus, jeep, flight, transfer, stay and rest.
Evidence verification status is separate from stage completion status.

Support many drafts/future trips and one current journey per account. Store
activeJourneyId separately from journey lifecycle. Starting another trip requires
a clear choice about pausing/replacing the current one. Stage and revision IDs
must remain stable enough to reconcile offline progress and updates.

Keep detailed geometry and evidence separate from the lightweight journey summary;
load them when needed. Persist local edits before syncing. Use money in integer
minor units with explicit currency and budget basis.

### Backend planning pipeline

1. Resolve destination identity and disambiguate the intended place.
2. Resolve origin/finish and planning constraints.
3. Retrieve relevant official, operator and firsthand travel information.
4. Extract structured claims with source, retrieval and publication/travel dates.
5. Build candidate stage sequences with mode-specific routing or reviewed tracks.
6. Let AI compose/explain candidates using supplied evidence and explicit unknowns.
7. Validate stage connectivity, return coverage, geometry, budget math, dates and
   source support outside the model.
8. Save a versioned draft and return useful differences between options.

Research, routing and AI are distinct adapters. A newer blog is not automatically
more authoritative; several copied pages are not independent corroboration. Use
official/operator claims for the facts they can establish and blogs for experience
and itinerary context. Store source excerpts/claims within permitted usage, not
copied full articles. Treat fetched pages as untrusted data, never instructions.
Fetch through a bounded service with URL validation, SSRF protection, timeouts,
size limits and source policy. Private coordinates should not be sent to web search
when a locality or confirmed pickup is sufficient.

Freshness depends on the claim: departure/availability, fares, weather, access and
general itinerary knowledge need different refresh rules. Store fetchedAt and
validFor explicitly; old publication dates cannot establish today's access.
Refresh on planning, before departure, and on user-requested checks. Scheduled
monitoring is a later hosted service, not implied by having a model API key.

A routing polyline proves neither a bus service nor a safe hiking itinerary.
Missing geometry stays unresolved or schematic; never promote straight lines to
verified navigation. Unknown destinations can yield a useful partial draft, not
a claim that every destination is fully navigable.

### Persistence and service boundaries

Personal journeys must not depend on group-service readiness. Create independent
journey storage/planning capability states instead of a single cloud.ready gate.
Use the existing user sign-in identity without requiring a Firebase Admin file for
the new journey service. Local development can use durable SQLite; hosted sync
needs an authenticated durable datastore, ownership enforcement, migrations,
backups and account deletion integration. PostgreSQL is a candidate, not an
already provisioned service. Do not promise cross-device sync from local storage.

Research jobs need bounded model/search budgets, deduplication, caching,
cancellation and retry. Precise GPS remains device-local unless a selected feature
needs transmission. Do not record tokens, private coordinates or keys in logs.

### Reuse from the existing app

Keep theme tokens, typography, imagery/credits, map renderer, place search, GPX
parsing, route progress utilities, foreground GPS, checkpoint persistence, expense
math, weather decoding and reduced-motion support where their assumptions fit.

Adapt the cinematic renderer to the shared Journey rather than a second session
identity. Adapt walking navigation as a stage engine. Replace catalogue-only
planner constraints with a destination/stage contract; keep the useful schema
validation and bounded model transport. Do not stretch WalkingRoute into bus,
stay and walking stages by adding unrelated flags.

Migrate TripLibrary, Adventures, preparation, GPX attachments and navigation
drafts through versioned adapters. Preserve originals until migration succeeds;
keep unmatched records accessible as imported legacy plans. Deduplicate using
stable source IDs, not titles. One migration must not discard another user's data.

## Delivery sequence

1. **Flow and screen specification:** agree on navigation, ABC end-to-end screens,
   exact copy, empty/failure states, keep/remove map and motion behavior. Review
   clickable screens with the existing theme before wiring complex backend work.
2. **Journey foundation and shell:** shared model, local persistence, Home,
   Journeys library, current-journey selection and migration adapters. Repoint old
   entry points only as their replacements become usable.
3. **Complete ABC planning:** dates/origin/budget, sourced itinerary variants,
   road/transfer/walking stages, return, review and durable planning jobs. Separate
   known facts, estimates and unresolved information throughout.
4. **Animated travel experience:** schematic overview, stage maps, preview/live
   separation, manual checkpoints, foreground progress, pause/resume and recap.
5. **Research refresh and change handling:** source retrieval, claim freshness,
   route revisions, missed connections and user-approved remaining-stage updates.
6. **Generalize through a second contrasting destination:** demonstrate the same
   interfaces without catalogue IDs or ABC screen logic, then broaden coverage.

ABC geography belongs in evidence/content templates, not hardcoded UI components.
Before broad release, validate at least one non-catalogue destination and an
unroutable/insufficient-evidence case. Designing a general model does not make
unavailable transport/trail data appear.

## User review criteria

The owner will perform interactive testing when implementation is ready. This
document does not initiate tests.

- A new user can identify where to start without choosing among multiple planners.
- ABC can be selected, planned, accepted and resumed through one continuous flow.
- The review explains the entire trip, budget basis and unresolved decisions.
- During travel, the next action is understandable without opening another tool.
- Accepted plans and progress survive restart; switching accounts stays isolated.
- Denied GPS, lost connection and failed research preserve the current plan.
- Preview never appears live; arrival at ABC does not remove the return stages.
- Old saved plans remain accessible; optional group failures do not block travel.
- The existing visual theme is recognizable and accessibility has not regressed.

Measure planning completion, time to a useful plan, next-action comprehension,
resume success and decision-related support errors. Do not optimize for time spent
in chat or speed of completing mountain stages.

## Research references and interpretation

- GetYourGuide's itinerary guidance emphasizes ordered highlights, transfers,
  modes and precise meeting points, with details following the overview:
  https://supply.getyourguide.support/hc/en-us/articles/14198451690525-Itineraries-Frequently-Asked-Questions
- Google Maps documents destination/origin/mode selection, route alternatives and
  transit availability limits:
  https://support.google.com/maps/answer/144339?hl=en
- Nepal Tourism Board identifies Pokhara as a gateway to Annapurna treks:
  https://trade.ntb.gov.np/tourist-destination/annapurna-region/
- Operator ABC itinerary example; evidence of an offered itinerary, not universal
  current trail/road access:
  https://www.havenholidaysnepal.com/blogs/annapurna-base-camp-trek-from-pokhara
- OSRM profiles depend on the prepared routing dataset:
  https://project-osrm.org/docs/v5.24.0/api/

The proposed three-tab navigation, screen sequence and architecture are Navo
recommendations derived from this review, not claims about Google's internal
design decisions or a copy of GetYourGuide's full product.
