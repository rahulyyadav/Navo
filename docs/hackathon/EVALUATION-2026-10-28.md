# Local Nemotron evaluation — 28 October 2026

This is a sanitized record of real local calls to `nvidia/nemotron-3-super-120b-a12b` on Nebius Token Factory. It is not a hosted or field test. Raw responses remain in ignored local output and are not part of the submission.

## Structured itinerary copilot

The three evaluation cases were a gradual Mardi Himal request, an intentionally compressed two-day Everest Base Camp request, and a Mardi request containing untrusted instructions in the user's goals. The server permitted an initial draft and at most two repairs per case. It made nine model calls. All nine provider calls returned; none ended in a provider error. All three cases ended `rejected` by the independent route validator. First-draft passes: 0/3. Final passes: 0/3.

| Case | Violations by attempt | Result |
| --- | --- | --- |
| Gradual Mardi Himal | 12 → 5 → 4 | Rejected: remaining elevation and distance contradictions |
| Compressed Everest Base Camp | 8 → 6 → 6 | Rejected: constraints remain incompatible with the requested trip |
| Untrusted-goals Mardi | 19 → 6 → 4 | Rejected: remaining elevation, distance and continuity issues |

The bounded repair loop catches invalid drafts and refuses to present them as verified routes. This run does **not** demonstrate a reliable successful itinerary. Turning off the model's optional reasoning mode for these structured calls eliminated the earlier response-length failures in this small sample; it did not make the routes valid. Do not extrapolate a reliability rate from three cases.

## Journey research flow

One separate, read-only Mardi Himal journey research was run from a generic Kathmandu origin, without saving to an account. It returned six planning stages, six web references and five completed model calls. Two stage durations and four fares were unknown. Its researcher extracted zero source-backed travel claims, and current trail access was unconfirmed. The backend now marks this condition `needs-user-choice` with a specific missing-evidence warning instead of `ready`. Route checkpoint retries preserve the recorded model-call metadata. The intermediate points remain schematic; this is not a navigation track.

## Judge-facing claim

Show a real request, its sources and model-call record, the visible unresolved decisions, and the validator rejecting a bad route. Do not claim verified trekking navigation, complete fares, reliable AI route generation, or offline maps. A judged demo requires a public HTTPS build and its own smoke test.
