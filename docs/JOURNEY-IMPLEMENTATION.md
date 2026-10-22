# Journey flow implementation — 21 October 2026

## Owner walkthrough

1. Run `npm start` to start the local backend and Expo together, then reload the app.
2. Sign in, search a destination, choose a starting place, and confirm a departure
   date. Budget and expected finish are private planning notes.
3. Preparation runs Hank (dated source research), Julia (connected route), Thompson
   (current disruption check), and Paul (final evidence audit). The five-minute job
   allows up to six model calls, one closure-driven Julia revision, and one Thompson
   recheck. Stage and call-count checkpoints persist in Firestore.
4. If map search has similarly ranked place candidates, choose the correct checkpoint
   from the displayed list. If a credible disruption cannot be verified, explicitly
   keep that option or choose an alternative before saving.
5. Confirm. The backend connects the private starting point to the route; the
   signed-in journey and its history are saved in Firestore with an AsyncStorage
   offline cache. Exact origin coordinates never go into model prompts.
6. Play route preview (labelled simulated), or Start journey. GPS runs only while
   this screen is in the foreground. Confirm checkpoints manually, pause/resume,
   and undo the previous checkpoint if needed. Arrival at ABC is followed by return
   stages to Pokhara; it is not the final checkpoint.
7. Open a stage map to request available road/walking geometry. Unroutable stages
   remain checkpoint overviews, not invented trail lines.
8. Opening a saved journey queues Maya for a recheck when the prior check is older
   than 12 hours. The scheduled worker also reviews journeys 72 hours before
   departure. Possible closures become proposals; saved route and progress remain
   unchanged.
9. A starting point can be edited before
   travel; only approach legs are recalculated. Earlier plans remain accessible
   from Journeys → Earlier plans.
10. Search Mardi Himal or an external mapped destination. If source search is blocked
    or insufficient, retry rather than accepting a fabricated itinerary.

Interactive/user acceptance tests and live provider requests have deliberately
not been executed by the agent, following the owner's request. Static lint,
TypeScript and Python syntax checks are separate from that walkthrough.

## Code boundaries

- `backend/app/journeys`: typed contracts, public-source retrieval, map candidate
  choice, bounded Hank/Julia/Thompson/Paul stages, Firestore cache/job leases,
  per-user cloud storage, Maya review worker, approach routing and stage geometry.
- `src/services/journeys`: typed models, catalogue aliases and authenticated client.
- `src/lib/journey-store.ts`: account-scoped cloud journeys plus serialized local
  cache, drafts, progress and transport choices; integrates with device-data clearing.
- `src/components/journeys`: theme-preserving shell, search, Home and animated board.
- `journey-setup.tsx`: three-step origin/date/details flow and cancellable UI polling.
- `journey-levels.tsx`: inline transport choices, preview, foreground position,
  checkpoint progression, route/source sheets and starting-point editing.
- Main tabs: Home, Journeys, Profile. Existing map/chat/group routes remain reachable
  contextually, and legacy saved plans are kept. General profile onboarding is now
  optional through settings; new users proceed to destination-specific setup.

## Shared versus personal data

The shared itinerary contains destination checkpoints, cited transport choices,
source metadata and versioned plan information. It does not contain user origins,
budgets, trip dates, IDs, histories or GPS tracks. Shared research is keyed by
mapped destination, coarse origin area and departure date. Firestore leases
deduplicate work across backend processes. Completed itinerary versions are retained
so a refresh cannot silently change a saved journey.

User-specific approach requests are computed without persisting the origin on the
server in shared templates. Preferences, progress, overrides and review proposals are
stored under `users/{uid}/journeys/{journeyId}`. Only the authenticated backend writes
journeys; Firestore rules allow owners to read their records. Account deletion removes
journeys, their revision history and review jobs.

## Backend configuration and operational boundaries

The journey endpoints reuse the public-key Firebase sign-in lookup used by chat and
require a verified account. Durable job and per-user journey writes also require the
backend Firebase Admin credentials already used by the cloud account service. Server
keys stay on the backend.

- `JOURNEY_DAILY_RESEARCH`: default 20 fresh-research attempts per UTC day globally
  for this backend. Cached reuse does not consume fresh-research/model budget.
- `JOURNEY_SEARCH_KEY`: optional Brave Search key. Without it the public DuckDuckGo
  HTML fallback is attempted. HTML changes, challenges or throttling can interrupt
  research; failures are surfaced, not disguised as successful internet checking.
- Fresh model research also reserves the existing per-user chat AI allowance.
- Two research jobs run per process with a five-minute Firestore lease and timeout.
  Each stage reserves from existing provider limits; the complete run is capped at
  six model calls.
- Search and page requests have bounds, public-address validation, redirect checks,
  response-size limits and document text extraction. Documents are untrusted model
  inputs. Sources are cited and geocoding resolves checkpoint coordinates.
- Template freshness currently uses a seven-day policy. It does not establish live
  trail access, bus availability, weather or a current timetable.
- ABC no longer bypasses the research and review pipeline with static estimated
  durations. All destinations follow the same evidence gates.
- Road routing uses OpenStreetMap's routed-car service; walking geometry uses
  routed-foot on demand. Public routing/geocoding services have availability and
  production usage limits; provision appropriate hosted providers before scaling.
- The existing GitHub Actions maintenance workflow runs every 15 minutes when
  `NAVO_MAINTENANCE_ENABLED=true`, using `NAVO_API_URL` and the
  `NAVO_MAINTENANCE_TOKEN` repository secret. The endpoint is bearer-token protected.
- Geometric stage routes are cached per itinerary revision/mode. Flight legs do
  not display road geometry. A public map and a schematic journey require network
  tiles; saved checkpoints remain visible offline, downloaded basemap tiles are
  not supplied by this change.

## Intentionally deferred

Date-sensitive schedules, budget optimization, live fares, bookings, continuous
background GPS, automatic checkpoint completion, hosted research monitoring,
verified trail access, full offline tiles, and push notifications for changed reviews.

Future generalized planning should improve source freshness per claim, production
search/routing adapters, source adjudication, durable workers, and operational
quotas without changing the point-and-leg interaction model.


## Local connection follow-up — 20 October

The screenshot's `ERR_CONNECTION_REFUSED` was caused by no API process listening
on port 8000, before a database request could occur. `npm start` now supervises the
local API together with Expo, reusing an already-running Navo backend. Backend
startup errors are reported in the terminal rather than leaving Expo running with
an absent API. `npm run start:app` preserves the standalone Expo command.

Background itinerary preparation remains necessary. Its repeated status/error
card was removed from all three onboarding steps; only the final step exposes an
unavailable-plan notice with a Retry action. The general preferences screen no
longer displays an unrelated group-connection banner.

`GET /ready/journeys` now probes Firestore availability independently of whether an
AI itinerary has completed. Backend model tests and the app's lint/type checks cover
the staged workflow; a live provider preparation run was not part of local checks.
