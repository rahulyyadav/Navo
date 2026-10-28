# Navo submission package
Status: prepared draft. Local live model calls and their failed validation outcomes are documented; a judge-accessible hosted demo and public video are still unverified.

## Track and one-sentence pitch
Best Apps and Agents.
Navo helps small groups plan Nepal treks by making Nemotron's proposals inspectable: draft, deterministic check, bounded repair, human review, then a shared plan.

## Project description draft
Planning a group hike means coordinating route expectations, departure, transport, conditions and people across disconnected tools. Navo puts this journey into a mobile-first experience for Nepal.

Our central AI feature is inspectable journey research and itinerary review. NVIDIA Nemotron, served through Nebius Token Factory, researches public references and proposes structured stages. Independent Python checks inspect endpoint coverage, source IDs, route continuity, elevations, planning thresholds and distance estimates. Detected itinerary issues can go back to the model for up to two repairs. The interface shows missing evidence and decisions for human review instead of presenting an unexamined answer as navigation advice.

The surrounding product includes Kathmandu day-hike planning, requested-day weather, external road/transit directions to the trailhead, group invitation approval, explicit foreground location sharing and offline plan snapshots. Curated waypoints are approximate; Navo does not claim verified navigation or emergency dispatch.

Architecture: Expo 58 / React Native and Firebase identity; authenticated FastAPI / Firestore service; NVIDIA Nemotron inference through Token Factory's OpenAI-compatible endpoint; schema validation and route checks outside the model. Model keys stay on the server. Completed inference runs record model identity, measured latency, provider-reported usage, prompt/route hashes and audit outcomes where the provider supplies them.

The [28 October local evaluation](EVALUATION-2026-10-28.md) records nine completed structured copilot calls and three final validator rejections. Separate journey research returned a planning outline but no supported travel claims, so it now requires human review. This does not prove hosted availability, a reliable completion rate or verified trail access. Before submission, show the actual deployed build and update all claims to match its observed behavior.

## Why this can stand out
- Technical: independent validation and bounded repair, not just a prompt wrapper.
- Design: an end-to-end decision flow from constraints to a reviewed trip.
- Impact: a specific audience and problem; validate with local hiking groups rather than claiming broad adoption.
- Idea: show a believable failure being caught and explained. Rejection of an impossible request is a useful outcome.

These map to the four equally weighted judging criteria. No award outcome is guaranteed.

## What to demonstrate
1. A real request with a real selected NVIDIA Nemotron model on Token Factory, visible in the judge-accessible build.
2. The initial issues, repair changes and remaining limitations.
3. A constraint change and the actual validator outcome, including rejection if it remains invalid.
4. A saved plan reopened after connectivity is removed, only if that behavior is tested on the demo build.
5. Optional group invitation on a second device only after deployed verification.

Use journey research and its per-call model record for the main model demonstration. The structured copilot can demonstrate a caught invalid itinerary, but the current evaluation does not support a successful-itinerary claim. The separate day-hike wizard does not yet call Nemotron.

## Existing-project disclosure draft
The visible repository history begins on September 27, 2026, after the August 26 submission-period start. If an earlier Navo project existed outside this repository, explain the substantial updates made during the period. Do not claim a pre-existing feature was created during the competition. Recent journey improvements are on `codex/journey-agent-evidence` and must be included in the public default branch or explicitly linked in the submission.

## Submission inventory
- [ ] Public working demo URL or installable test build; keep it available for judging.
- [ ] Public repository with detectable MIT LICENSE (already present); confirm source attribution for photos.
- [ ] README setup tested from a clean checkout.
- [x] Local real NVIDIA Nemotron response recorded in the repository documentation.
- [x] Local live evaluation report with actual outcomes.
- [ ] Judge-accessible runtime response and smoke test.
- [ ] Public YouTube demonstration shorter than 3 minutes.
- [ ] Specific provider feedback based on actual usage.
- [ ] Existing-project disclosure checked against history.
- [ ] Team/representative information and eligibility reviewed by the entrants.
- [ ] City award entry only if actually attended.
- [ ] No secrets, personal GPS or user data visible in the recording or repository.

## Provider feedback based on the local run
- Model: `nvidia/nemotron-3-super-120b-a12b`, tested 28 October 2026 through Token Factory.
- Worked: all nine structured calls in the final three-case run returned, and the API supplied model identity and usage data for the app's review record.
- Failed: none of the three itinerary cases passed the independent validator after two repairs. Earlier calls using the optional reasoning mode reached response-length failures.
- Workaround: disable optional reasoning for short structured itinerary calls, retain bounded repairs, and reject plans that still violate constraints.
- Requested improvement: clearer structured-output length budgeting and examples for long constrained JSON itineraries. This is product feedback from a small local sample, not a service-level benchmark.
- Supporting report: [local evaluation](EVALUATION-2026-10-28.md).

## Sources checked 3 October 2026
- Official rules: https://nebiusglobalaihackathon.devpost.com/rules
- Token Factory setup: https://docs.tokenfactory.nebius.com/quickstart
- Structured outputs: https://docs.tokenfactory.nebius.com/ai-models-inference/json

Official deadline displayed: October 30, 2026 at 10:00 am PDT (22:45 Nepal time). Confirm the event page before submitting. Entrants must accept the official rules themselves; this document does not submit an entry.
