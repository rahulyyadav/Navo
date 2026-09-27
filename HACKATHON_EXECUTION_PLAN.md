# Navo: Nebius x NVIDIA Global AI Hackathon Plan

Prepared for a two-person team on September 25, 2026. Submission deadline: October 30, 2026 at 10:00 AM PDT (October 30, 2026 at 10:45 PM Nepal time; verify the converted time before submitting).

## 1. Executive decision

**Recommendation: build it, but narrow and reposition it.**

Do not pitch this as "the first Nepal trekking app" or as a general travel planner. That claim is already contradicted by products such as TrekGuard, Lekaly, EkTrek, TrailConnect, and Nepal Travel Guide, which advertise overlapping combinations of offline maps, GPS, route plans, altitude guidance, emergency information, and local contacts.

Pitch it as:

> **Navo is an evidence-grounded AI trek copilot for Nepal that turns a trek request into a route-linked, altitude-aware plan, audits the plan against deterministic safety rules, and packages the critical route and emergency information for offline use.**

The winning demo should prove one complete workflow for three curated treks, not claim nationwide coverage.

Recommended track: **Best Apps and Agents**.

## 2. Honest score

### Current broad idea: 6.0/10

| Criterion | Current score | Main reason |
|---|---:|---|
| Technological implementation | 5/10 | Many features are named, but Nemotron is not yet essential and the offline/satellite scope is technically unclear. |
| Design | 7/10 | A map-first trek experience can be visually compelling. |
| Potential impact | 8/10 | Remote connectivity, altitude, unfamiliar routes, and fragmented information are real problems. |
| Quality/originality | 4/10 | Existing Nepal-focused apps already make substantially similar claims. |

### Focused proposal: 8.0/10 potential

| Criterion | Target score | What must be demonstrated |
|---|---:|---|
| Technological implementation | 4/5 | Nemotron performs a visible multi-step tool workflow; deterministic code verifies every plan; offline fallback works on a real phone. |
| Design | 4/5 | A coherent request -> plan -> map -> safety audit -> offline pack experience. |
| Potential impact | 4/5 | Specific users, Nepal-specific evidence, a realistic safety boundary, and feedback from at least 5 trekkers/guides. |
| Quality/originality | 4/5 | Route-linked plan auditing and provenance are clearer than a generic itinerary chatbot. |

This is competitive for a track award and could reach the overall shortlist if execution and the video are excellent. It is not automatically a top-three idea: the event has over 11,000 registered participants, the four judging criteria are equally weighted, and organizers explicitly say a multi-step autonomous workflow stands out more than a single API call.

## 3. What Nemotron does

Nemotron must be part of the product's core decision loop, not a decorative chat box.

### Agent workflow

1. **Intake agent:** converts free text into a strict `TripRequest` object: trek, dates, experience, daily walking tolerance, group size, previous altitude exposure, preferences, and constraints.
2. **Route retrieval tool:** returns only curated route segments, elevations, distances, lodging/waypoints, permits, seasonal notes, and source metadata.
3. **Plan composer:** Nemotron proposes a day-by-day itinerary using retrieved facts.
4. **Safety validator (ordinary code):** calculates daily elevation gain, walking load, missing acclimatization, route discontinuities, stale records, and unavailable emergency details. The LLM cannot override hard failures.
5. **Repair loop:** Nemotron receives validator failures and revises the itinerary, up to two attempts.
6. **Explanation agent:** produces short reasons, alternatives, caveats, and citations for each day.
7. **Offline pack generator:** saves the validated itinerary, GPX/polyline, waypoints, source timestamps, and emergency checklist locally.

Use an available Nemotron model served by **Nebius Token Factory** for the runtime calls. Start with the hackathon-recommended everyday model (Nano or Super) for intake and plan repair; evaluate Ultra only for complex planning if its latency and credit use are justified. Confirm exact model IDs in your Token Factory account on day one because catalog names and access can change.

Gemini/OpenAI should not be in the judged production path unless there is a clear, documented reason. They weaken the sponsor story. They are acceptable for internal comparison tests, but the demo should visibly show Nemotron on Nebius doing the work.

### Why this is genuinely agentic

The model selects and calls tools, creates a plan, receives machine-checkable failures, repairs its work, and returns an artifact grounded in route data. This matches the organizer's guidance that stronger Best Apps and Agents entries chain tools end to end.

## 4. MVP and scope boundary

### Must ship

- Three routes only: choose routes for which the team can legally obtain and manually verify data. A sensible set is Mardi Himal, Annapurna Base Camp, and Langtang Valley, but change this if your local expertise is stronger elsewhere.
- Natural-language onboarding plus a structured edit form.
- Generated day-by-day itinerary with distance, approximate duration, start/end elevation, ascent, difficulty explanation, rest/acclimatization flags, and source links.
- Route displayed as a verified GPX/polyline with user GPS position.
- Offline trip pack downloaded before departure.
- Route-deviation warning based on distance from the corridor, clearly labeled as an aid rather than a guarantee.
- Cached emergency contacts and a button that prepares a phone/SMS message containing coordinates, timestamp, route, and medical note.
- A visible "AI plan audit" panel showing checks passed, warnings, evidence freshness, and any unknowns.
- Public repository, open-source license, setup instructions, hosted/testable build, and a public demo video under three minutes.

### Stretch only after the must-ship path is stable

- Weather-driven re-planning with cached last-updated timestamps.
- Shareable trip plan and overdue check-in for a trusted contact.
- Tavily-powered current advisory search as a separately labeled, source-cited tool; never silently merge web claims into safety facts.
- A fourth route.

### Explicitly out of scope for this hackathon

- Booking flights or hotels.
- A marketplace or hiking-group matching system.
- Cross-platform Bluetooth/Wi-Fi mesh rescue.
- Automatic rescue dispatch.
- Direct satellite messaging from the app.
- "All Nepal" trail coverage or guaranteed live trail conditions.

These are credible roadmap items, but attempting them now will reduce completeness and create safety claims the team cannot validate.

## 5. Satellite, offline, and nearby-device reality

- Phone GPS can provide position without mobile data, but maps and route data must be downloaded in advance.
- On iPhone, Emergency SOS and Messages via satellite are system capabilities on supported hardware/regions. Do not claim your Expo app can send arbitrary satellite distress messages. At most, detect/display instructions and hand off to supported system experiences.
- On Android, satellite capabilities vary by device, carrier, OS, country, and privileged APIs. Treat them as a future integration, not an MVP dependency.
- Bluetooth/Wi-Fi teammate discovery requires native platform code, permissions, background behavior, battery testing, and separate Android/iOS implementations. It will require an Expo development build rather than Expo Go and is not a reliable substitute for a personal locator beacon or satellite communicator.
- The MVP emergency flow should work honestly: cache essential information, show current/last GPS fix and its age/accuracy, sound a local alarm, prepare a call/SMS when service exists, and teach the user how to use the phone's native emergency features.

## 6. Technical architecture

### Mobile

- Expo + React Native + TypeScript
- Expo Router
- Development builds with EAS; do not depend on Expo Go for native mapping/background features
- `expo-location` + `expo-task-manager` for foreground/background tracking, tested for battery use
- MapLibre React Native or another provider that explicitly permits your offline use case
- GPX/GeoJSON route overlays; Turf.js for corridor/deviation calculations
- `expo-sqlite` for route packs, plans, waypoints, sources, and queued events
- Zustand for small client state; TanStack Query for server state
- Sentry/Expo observability only if setup is quick and privacy-safe

Do not choose Google Maps merely because its online road coverage is familiar. Hiking routes, offline tiles, licensing, and custom overlays must be evaluated separately. Never bulk-download Google map tiles. For the hackathon, use pre-curated route geometry and an offline-capable map provider with a compliant license/plan.

### Backend and AI

- Python 3.12 + FastAPI + Pydantic
- Nebius Token Factory inference API with an NVIDIA Nemotron model
- Plain Python orchestration first; add NVIDIA NeMo Agent Toolkit only if it is working by the end of week 1. Using the toolkit can strengthen observability/evaluation, but the event requires an NVIDIA open model on Nebius, not unnecessary framework complexity.
- PostgreSQL + PostGIS for route/waypoint geometry; a small deployed MVP may use a single managed database
- Redis only if a queue or rate limiter is actually needed
- Background job for offline pack generation; Nebius Serverless Jobs is a good sponsor-aligned option
- Backend deployment on Nebius AI Cloud or a Nebius serverless service if feasible; regardless, make actual runtime calls to Token Factory
- JSON Schema/Pydantic validation on every model response

### Core records

- `TripRequest`
- `Trail`, `TrailSegment`, `Waypoint`, `Lodging`, `EmergencyContact`
- `SourceRecord` with URL/owner, license, fetched/verified time, and confidence
- `DayPlan`
- `SafetyRuleResult` with rule ID, severity, evidence, and remediation
- `OfflinePackManifest` with version and data freshness

### API surface

- `POST /plans` - start the agent workflow
- `GET /plans/{id}` - retrieve structured plan and audit trail
- `POST /plans/{id}/revise` - change a constraint and re-run only affected steps
- `GET /routes/{id}/pack` - versioned offline package
- `POST /telemetry/demo` - optional, consented demo metrics
- `GET /health` - model/backend/data status

## 7. Data and safety policy

The product is only as credible as its data.

- Use licensed/open route geometry and preserve attribution. Do not scrape hotels or maps without permission.
- Manually inspect each GPX route for continuity and compare it with at least two sources or a knowledgeable local reviewer.
- Store `verified_at` on every contact and operational fact. Show stale/unknown state in the UI.
- Keep time-sensitive facts (weather, closures, permit rules, phone numbers) separate from stable route geometry.
- Never let Nemotron invent coordinates, contacts, prices, permits, or medical thresholds. It can select and explain retrieved facts; code rejects unsupported fields.
- Medical/safety language must say the tool supports planning and awareness, not diagnosis, rescue, or guaranteed safety.
- Include a pre-departure reminder to share plans, check official/local advice, carry appropriate equipment, and use a licensed guide where required.
- Minimize location retention, encrypt secrets, and let users delete trip data.

## 8. Five-week implementation plan

### September 25-28: proof and scope lock

**Both:** choose the three trails, final pitch, success metrics, license, repository structure, and issue board.

**Member A (AI/backend):** make one successful Nemotron call through Token Factory; confirm structured output/tool calling behavior; create FastAPI skeleton and schemas.

**Member B (mobile/data):** create the Expo app and development build; render one route polyline and current position on a physical Android phone.

**Exit gate:** a recorded 30-second spike showing request -> Nemotron JSON -> route on phone. If either side fails, reduce scope immediately.

### September 29-October 5: vertical slice

**A:** implement retrieval tools, plan generation, deterministic validators, repair loop, and logs showing model/tool steps.

**B:** implement onboarding, trip summary, day cards, map, route selection, and the local database.

**Both:** curate and attribute one complete route; define 15 golden test requests.

**Exit gate:** one route works end to end on a real phone with no mocked AI response.

### October 6-12: offline and safety

**A:** offline pack endpoint, source/freshness records, emergency-contact data model, failure handling, and request rate limits.

**B:** download/manage offline pack, tracking UI, deviation calculation, SOS preparation screen, stale-GPS indicator, and local alarm.

**Both:** add two routes; test airplane-mode behavior and corrupt/partial downloads.

**Exit gate:** after downloading a pack, kill network access and demonstrate map/route/plan/emergency information from local storage.

### October 13-19: evaluation and product polish

**A:** automated evaluations for schema validity, unsupported facts, route continuity, constraint following, latency, and repair success.

**B:** accessibility, loading/error/empty states, battery-conscious tracking settings, visual polish, and a one-tap demo reset.

**Both:** interview at least five target users or guides using the working build; log feedback and changes. Run 30+ requests including adversarial and impossible requests.

**Exit gate:** no critical failure in the scripted demo and a documented evaluation table in the README.

### October 20-24: deployment and freeze

- Deploy the backend and create shareable Android test build (iOS only if already provisioned and stable).
- Add monitoring, budget caps, secret handling, sample/demo account, and health checks.
- Freeze features on October 24. Only bug fixes afterward.
- Draft Devpost text, architecture diagram, data/license acknowledgements, and explicit Nebius/NVIDIA usage.

### October 25-28: submission assets

- Record the demo on a real phone.
- Keep the video around 2:30-2:45, with captions and clear audio.
- Finalize public repository, top-visible license, setup steps, test instructions, screenshots, limitations, evaluation results, and feedback on sponsor tools.
- Ask two people uninvolved in development to install/test from the submitted instructions.

### October 29: submit one day early

- Submit all links and re-open them in an incognito browser.
- Verify public YouTube visibility, repository access, build download, credentials, and backend health.
- Use October 30 only as emergency buffer.

## 9. Team ownership

| Area | Member A | Member B |
|---|---|---|
| Primary | AI workflow, backend, deployment, evaluation | Expo app, mapping, offline storage, UX |
| Secondary | Data validation, README architecture | Route curation, physical-device QA, video |
| Shared | Product decisions, interviews, safety language, submission | Product decisions, interviews, safety language, submission |

Use short pull requests, daily 15-minute integration, and a single shared definition of done: tested on a physical device, error state included, and demo path updated.

## 10. Evaluation plan

Track and publish these numbers:

- 100% response-schema validity across the test set
- 0 invented coordinates or emergency contacts
- 100% route segment continuity for the three curated routes
- Constraint-following rate for dates, max walking time, experience, and group needs
- Safety-rule catch rate on deliberately unsafe test itineraries
- Repair-loop success rate
- Median and p95 plan-generation latency
- Offline pack success and cold-start behavior in airplane mode
- Route-deviation detection on recorded/simulated tracks
- User task completion: request to saved plan without help

Include failures. A small, honest evaluation is more persuasive than claims such as "AI guarantees the safest route."

## 11. Three-minute demo story

1. **0:00-0:15 - Problem:** a visitor has six days, limited high-altitude experience, and scattered/conflicting trek information.
2. **0:15-0:40 - Request:** enter the constraints in natural language.
3. **0:40-1:15 - Agent:** show Nemotron calling curated route/source tools, drafting, failing one altitude/load rule, and repairing the itinerary.
4. **1:15-1:50 - Product:** show day cards, route map, evidence, difficulty, and warnings.
5. **1:50-2:15 - Offline:** download the pack, enable airplane mode, reopen the route, and show GPS/last-fix behavior.
6. **2:15-2:35 - Emergency UX:** show cached contacts and a prepared coordinate message while explicitly stating network/satellite limits.
7. **2:35-2:55 - Proof:** evaluation results, architecture, Nebius Token Factory + Nemotron, and user feedback.
8. **2:55-3:00 - Close:** one sentence on impact and roadmap.

## 12. Stop/go checkpoints

- **September 28:** stop if Token Factory access or physical-device map rendering is not working.
- **October 5:** stop adding features if the one-route vertical slice is incomplete.
- **October 12:** drop offline basemap tiles if licensing/native implementation is unstable; retain offline GPX, plan, waypoints, and a clearly labeled simplified route canvas.
- **October 19:** drop iOS and all stretch features if Android is not submission-stable.
- **October 24:** feature freeze without exception.

## 13. Submission checklist

- Best Apps and Agents track selected
- Working public demo/test build, free for judges through the judging period
- Public repository with source/assets and a top-visible MIT or Apache-2.0 license
- Reproducible setup and test instructions
- Public YouTube video under three minutes
- Exact NVIDIA model and Nebius runtime calls identified
- Feedback on Nebius/NVIDIA tools included
- Third-party data/API licenses and attributions documented
- If any code predates August 26, 2026, a clear list of significant in-period changes
- English materials and test credentials
- Limitations and safety disclaimer

## 14. Research sources

- [Hackathon overview, requirements, prizes, and judging](https://nebiusglobalaihackathon.devpost.com/)
- [Official rules and dates](https://nebiusglobalaihackathon.devpost.com/rules)
- [Organizer guidance on stronger multi-step workflows](https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works)
- [NVIDIA's official NeMo Agent Toolkit winner announcement](https://developer.nvidia.com/blog/?p=103461)
- [NVIDIA NeMo Agent Toolkit overview](https://docs.nvidia.com/nemo/agent-toolkit/latest/)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Apple SafetyKit](https://developer.apple.com/documentation/safetykit)
- Competitor examples: [TrekGuard](https://trekguard.app/), [Lekaly](https://lekaly.com/), [EkTrek](https://ektrek.ekrasunya.com/), [TrailConnect](https://trailconnect.app/)

Research links are starting points, not permission to reuse data. Re-check API terms, map-tile licenses, operating-system capabilities, permits, emergency contacts, and the official rules immediately before release/submission.
