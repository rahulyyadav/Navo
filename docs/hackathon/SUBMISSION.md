# Navo submission package
Status: prepared draft. Do not submit until the live model, hosted demo and video evidence exist.

## Track and one-sentence pitch
Best Apps and Agents.
Navo helps small groups plan Nepal treks by making Nemotron's proposals inspectable: draft, deterministic check, bounded repair, human review, then a shared plan.

## Project description draft
Planning a group hike means coordinating route expectations, departure, transport, conditions and people across disconnected tools. Navo puts this journey into a mobile-first experience for Nepal.

Our central AI feature is an inspectable itinerary loop. NVIDIA Nemotron, served through Nebius Token Factory, proposes a structured itinerary from a curated route and the user's limits. Independent Python checks inspect route continuity, known stops, return travel, elevation consistency, planning thresholds, and impossible distance estimates. Detected issues go back to the model for up to two repairs. The interface shows the violations and revised days, rather than presenting an unexamined chatbot answer as advice.

The surrounding product includes Kathmandu day-hike planning, requested-day weather, external road/transit directions to the trailhead, group invitation approval, explicit foreground location sharing and offline plan snapshots. Curated waypoints are approximate; Navo does not claim verified navigation or emergency dispatch.

Architecture: Expo 57 / React Native and Firebase identity; authenticated FastAPI / Firestore service; NVIDIA Nemotron inference through Token Factory's OpenAI-compatible endpoint; schema validation and route checks outside the model. Model keys stay on the server. Each completed inference run records model identity, measured latency, reported token usage, prompt/route hashes and audit outcomes.

Before submission, replace future/implementation claims with only what the recorded live build proves. Specifically, the adapter currently exists but a successful real Token Factory run has not yet been recorded in this workspace.

## Why this can stand out
- Technical: independent validation and bounded repair, not just a prompt wrapper.
- Design: an end-to-end decision flow from constraints to a reviewed trip.
- Impact: a specific audience and problem; validate with local hiking groups rather than claiming broad adoption.
- Idea: show a believable failure being caught and explained. Rejection of an impossible request is a useful outcome.

These map to the four equally weighted judging criteria. No award outcome is guaranteed.

## What to demonstrate
1. A real request with a real selected NVIDIA Nemotron model on Token Factory.
2. The initial issues, repair changes and remaining limitations.
3. A constraint change that has a visible effect on the result.
4. The downloaded plan readable after connectivity is removed.
5. Optional group invitation on a second device only after deployed verification.

Use the existing multi-day AI copilot for the model demonstration. The separate day-hike wizard does not yet call Nemotron. Do not cut between the two in a way that implies it does.

## Existing-project disclosure draft
Navo's existing mobile foundation was extended during the submission period with Firebase-backed authentication and group services, an authenticated Token Factory planner with deterministic draft–audit–repair checks, custom day-hike planning, weather, invitation approval, foreground group positions, proximity filtering, offline snapshots and test/evaluation tooling.
Verify this statement against the actual project start and Git history. Include dates and commits for the team's work; do not claim work from before August 26, 2026 as new. Relevant recent commits include 5ebde99 and bf9b360, plus the final hackathon-preparation commit.

## Submission inventory
- [ ] Public working demo URL or installable test build; keep it available for judging.
- [ ] Public repository with detectable MIT LICENSE (already present); confirm source attribution for photos.
- [ ] README setup tested from a clean checkout.
- [ ] Real NVIDIA model ID, successful runtime response and evaluation report.
- [ ] Public YouTube demonstration shorter than 3 minutes.
- [ ] Specific provider feedback based on actual usage.
- [ ] Existing-project disclosure checked against history.
- [ ] Team/representative information and eligibility reviewed by the entrants.
- [ ] City award entry only if actually attended.
- [ ] No secrets, personal GPS or user data visible in the recording or repository.

## Feedback template — fill after real runs
- Exact model / date / request size:
- What worked (structured output, latency, integration):
- What failed (error category, reproducible sanitized request):
- Workaround:
- Suggested improvement and why it matters:
- Supporting run report:
Do not invent praise, outages or benchmarks before using the service.

## Sources checked 3 October 2026
- Official rules: https://nebiusglobalaihackathon.devpost.com/rules
- Token Factory setup: https://docs.tokenfactory.nebius.com/quickstart
- Structured outputs: https://docs.tokenfactory.nebius.com/ai-models-inference/json

Official deadline displayed: October 30, 2026 at 10:00 am PDT (22:45 Nepal time). Confirm the event page before submitting. Entrants must accept the official rules themselves; this document does not submit an entry.
