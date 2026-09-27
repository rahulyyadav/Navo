# Navo

Navo is an evidence-grounded AI trek copilot for Nepal. It turns a traveler's constraints into a route-linked itinerary, validates the proposal with deterministic rules, and keeps the critical trip plan available offline.

This repository is the shared workspace for our two-person submission to the **Nebius x NVIDIA Global AI Hackathon**.

## Product principle

> Nemotron proposes and explains. Deterministic software retrieves, calculates, and verifies.

Navo is not a rescue service, medical tool, replacement for a licensed guide, or guarantee of trail safety.

## Current starter

- Expo SDK 57 + React Native + TypeScript
- Expo Router with three initial screens: Home, Plan, and Safety
- A polished static vertical slice for the initial product direction
- Full execution plan and architecture notes for both teammates
- MIT-licensed public repository structure

The route, itinerary, audit, and emergency information currently shown in the app are clearly labeled demonstration data. They will be replaced by validated records and live application state as the backend is implemented.

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
npm run doctor
```

Run both commands before opening a pull request.

## Repository map

```text
src/app/                 Expo Router screens and navigation
src/components/          Reusable product UI
src/data/                Typed demonstration data
src/theme/               Shared visual tokens
docs/ARCHITECTURE.md     Planned mobile/backend/AI boundaries
docs/TEAM_WORKFLOW.md    Branches, reviews, and daily coordination
HACKATHON_EXECUTION_PLAN.md
output/pdf/              Shareable PDF version of the plan
```

## Configuration

Copy `.env.example` to `.env.local` when API work begins. Never commit credentials. The mobile app must call our backend; it must not contain a Nebius API key.

## Near-term milestones

1. Confirm one Nemotron call through Nebius Token Factory.
2. Render one legally sourced route on a physical Android phone.
3. Connect request -> structured plan -> validation -> repair -> mobile UI.
4. Add versioned offline packs and test them in airplane mode.
5. Evaluate, deploy, freeze, and record the final demo.

See [HACKATHON_EXECUTION_PLAN.md](./HACKATHON_EXECUTION_PLAN.md) for the complete schedule and [docs/TEAM_WORKFLOW.md](./docs/TEAM_WORKFLOW.md) before contributing.

## License

MIT
