# Team workflow

## First setup

```bash
git clone https://github.com/rahulyyadav/Navo.git
cd Navo
nvm use
npm ci
npm run start
```

Use Node.js 22.13 or newer. Keep personal secrets in `.env.local`, which is ignored by Git.

## Ownership

- Member A: AI workflow, FastAPI backend, deployment, and evaluation
- Member B: Expo application, maps, offline storage, and product experience
- Shared: route curation, safety language, user feedback, testing, README, and demo

Ownership identifies the primary driver, not the only contributor.

## Branches and pull requests

Create a short-lived branch for each task:

```bash
git switch -c feat/trip-intake
```

Use `feat/`, `fix/`, `docs/`, or `test/` prefixes. Keep pull requests small enough for the other teammate to review in one sitting. Do not commit directly to `main` after the initial scaffold.

Before requesting review:

```bash
npm run lint
npm run typecheck
npm test
npm run doctor
```

Every completed feature must include its loading, empty, error, and offline behavior where relevant.

## Daily integration

Spend 15 minutes each day on:

1. What changed since yesterday?
2. What can be demonstrated on a physical phone?
3. What is blocked?
4. Did the demo path or project scope change?
5. Are API credits and deadlines still healthy?

## Definition of done

A task is done when it is reviewed, type-safe, tested on its intended platform, honest about unavailable data, and reflected in the demo flow or documentation.
