# Nemotron verification — 15 October 2026

The configured local server successfully called `nvidia/nemotron-3-super-120b-a12b` through the official Nebius Token Factory endpoint using public Budhanilkantha–Shivapuri route data. No personal GPS, user account information or secrets were included in the test output.

## Corrections
- “First-time hiker” no longer falsely triggers the built-in duration warning; it reaches Nemotron.
- Forecast snapshots older than six hours, future-dated snapshots and timestamps without a timezone are removed from model evidence. The six-hour limit is a freshness policy, not a forecast accuracy guarantee.
- Unknown ascent removes numeric duration and ETA before inference. The first live response repeated an unreliable baseline; the follow-up response correctly omitted that estimate after this change.
- Route excerpts are labelled as planned, not the next instruction at the user's current location.
- Route chat labels Nemotron responses separately from deterministic safety guidance.
- Prompts prohibit invented external verification, emergency contact numbers, and claims to have saved, booked, messaged or started tracking. Chat remains advice; actual app controls perform actions.

## Scope of verification
Provider inference is verified locally. This does not prove the public Render backend, Firebase authenticated mobile chat, shared groups or production phone connectivity. Those still require configured deployment and physical-device acceptance tests. Responses are generative and need ongoing evaluation; no claim of perfect accuracy, verified trail access or rescue capability is made.

Validation: lint/typecheck and 85 client tests pass; backend suite has 88 passing tests including freshness and response-source tests. Live provider checks returned successful Nemotron responses. No API keys are committed.
