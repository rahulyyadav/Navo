# Navo

Navo is an evidence-grounded AI trek copilot for Nepal. It turns a traveler's constraints into a route-linked itinerary, validates the proposal with deterministic rules, and keeps the critical trip plan available offline.

This repository is the shared workspace for our two-person submission to the **Nebius x NVIDIA Global AI Hackathon**.

## Product principle

> Nemotron proposes and explains. Deterministic software retrieves, calculates, and verifies.

Navo is not a rescue service, medical tool, replacement for a licensed guide, or guarantee of trail safety.

## Current starter

- Expo SDK 57 + React Native + TypeScript
- Expo Router with a cinematic onboarding screen plus Home, Plan, and Safety screens
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
nvm use # if you manage Node with nvm
npm ci
npm run start
```

Then scan the QR code with Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

## Validate changes

```bash
npm run lint
npm run typecheck
npm test
npm run doctor
```

Run these checks before opening a pull request.

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

Copy `.env.example` to `.env` for Firebase client configuration and the backend URL. Never commit credentials. The mobile app must call our backend; it must not contain a Nebius API key.

## Near-term milestones

1. Confirm one Nemotron call through Nebius Token Factory.
2. Render one legally sourced route on a physical Android phone.
3. Connect request -> structured plan -> validation -> repair -> mobile UI.
4. Add versioned offline packs and test them in airplane mode.
5. Evaluate, deploy, freeze, and record the final demo.

See [HACKATHON_EXECUTION_PLAN.md](./HACKATHON_EXECUTION_PLAN.md) for the complete schedule and [docs/TEAM_WORKFLOW.md](./docs/TEAM_WORKFLOW.md) before contributing.

## License

MIT

## Local backend

Authentication uses Firebase throughout: the mobile app sends a Firebase ID token, and FastAPI verifies it with the Admin SDK. Clerk is no longer required. Cloud profiles, groups, invitations, and alerts use Firestore; the AI copilot calls Nebius from the backend.

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env # only when .env does not already exist
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Set `FIREBASE_PROJECT_ID` to the same project as the mobile client. Provide Firebase Admin credentials through `GOOGLE_APPLICATION_CREDENTIALS` (an untracked service-account file path), Application Default Credentials, or the server-only email/private-key fields. Configure `NEBIUS_API_KEY` and the exact `NEBIUS_MODEL` for AI planning. Never put server credentials in an `EXPO_PUBLIC_*` variable.

Set `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000` for local web development. On a physical phone, use your computer's LAN address and put `http://localhost:8081` or the actual web origin in backend `CORS_ORIGINS`. Restart Expo after editing client environment variables. Deploy the checked-in Firestore rules and indexes to the matching project before testing cloud features.

```bash
cd backend
.venv/bin/python -m pytest tests -q
```

`GET /health` works without external credentials; authenticated cloud operations require valid Admin credentials, and AI planning also requires Nebius credentials. Native Google sign-in needs the three OAuth client IDs described in [AUTH-AND-MAPS.md](./AUTH-AND-MAPS.md) and a development build.

Dependency overrides pin patched gRPC and UUID versions within Firebase and Expo tooling. Keep these overrides until upstream dependencies include the security fixes; verify Expo Doctor and exports after changing them.
