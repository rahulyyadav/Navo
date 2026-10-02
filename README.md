# Navo

Navo is an evidence-grounded AI trek copilot for Nepal. It turns a traveler's constraints into a route-linked itinerary, validates the proposal with deterministic rules, and keeps the critical trip plan available offline.

This repository is the shared workspace for our two-person submission to the **Nebius x NVIDIA Global AI Hackathon**.

## Product principle

> Nemotron proposes and explains. Deterministic software retrieves, calculates, and verifies.

Navo is not a rescue service, medical tool, replacement for a licensed guide, or guarantee of trail safety.

## Current implementation

Expo SDK 57 mobile app with animated onboarding, Firebase authentication, trek discovery, online maps, trip preparation and local trip packs. The FastAPI backend verifies Firebase identity and provides Firestore group invitations, chat, check-ins, alerts and a bounded Nemotron draft–audit–repair planner. Background workers handle overdue check-ins and Expo push jobs.

**This is not yet a verified production release.** Server secrets, Firebase rules/index deployment, native OAuth/push credentials, real model calls and two-device acceptance still need configuration and verification. The supplied route waypoints are approximate; offline maps and verified trail navigation are not implemented.

Read [Production setup](docs/PRODUCTION-SETUP.md) for credential locations and deployment prerequisites, and [QA checklist](docs/QA-CHECKLIST.md) for tests and the two-phone walkthrough.

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm
- Expo Go for the first UI iteration, or an Android/iOS simulator

```bash
git clone https://github.com/rahulyyadav/Navo.git
cd Navo
npm install
npm run start
```

Then scan the QR code with Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

## Validate changes

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
```

Run both commands before opening a pull request.

## Repository map

```text
src/app/                 Expo Router onboarding, product screens, and navigation
src/components/          Reusable product UI
src/data/                Typed demonstration data
src/theme/               Shared visual tokens
docs/ARCHITECTURE.md     Planned mobile/backend/AI boundaries
docs/TEAM_WORKFLOW.md    Branches, reviews, and daily coordination
docs/UI_UX_PLAN.md       Onboarding flow and product design rules
HACKATHON_EXECUTION_PLAN.md
output/pdf/              Shareable PDF version of the plan
```

## Configuration

Use root `.env.local` for public client configuration and `backend/.env` for server secrets. Never commit credentials. The mobile app must call our backend; it must not contain a Nebius API key.

## Near-term milestones

1. Confirm one Nemotron call through Nebius Token Factory.
2. Render one legally sourced route on a physical Android phone.
3. Connect request -> structured plan -> validation -> repair -> mobile UI.
4. Add versioned offline packs and test them in airplane mode.
5. Evaluate, deploy, freeze, and record the final demo.

See [HACKATHON_EXECUTION_PLAN.md](./HACKATHON_EXECUTION_PLAN.md) for the complete schedule and [docs/TEAM_WORKFLOW.md](./docs/TEAM_WORKFLOW.md) before contributing.

## License

MIT
