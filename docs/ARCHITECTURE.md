# Navo architecture

## System boundary

Navo is split into a mobile client, an API/backend, a curated geospatial data layer, and a Nemotron planning workflow.

```text
Expo mobile app
  -> Navo FastAPI backend
      -> curated routes, waypoints, and source records
      -> deterministic itinerary validator
      -> NVIDIA Nemotron through Nebius Token Factory
      -> versioned offline pack builder
```

The mobile client never receives the Nebius API key. Model calls, safety-rule evaluation, source retrieval, and pack construction belong on the backend.

## Planning workflow

1. Parse natural-language trip preferences into a strict `TripRequest`.
2. Retrieve only curated route facts and their source metadata.
3. Ask Nemotron to compose a structured itinerary.
4. Validate route continuity, daily workload, elevation change, acclimatization, stale facts, and unsupported fields in ordinary code.
5. Give validation failures back to Nemotron for at most two repair attempts.
6. Return the final plan together with its audit results, sources, and unresolved uncertainty.

## Initial mobile structure

- `src/app/index.tsx`: cinematic onboarding entry point
- `src/app/discover.tsx`: trip-planning entry point and product story
- `src/app/plan.tsx`: sample day plan and visible AI audit
- `src/app/safety.tsx`: offline-pack and emergency-boundary experience
- `src/components/`: shared visual components
- `src/data/demo.ts`: typed, explicitly non-production demonstration data
- `src/theme/`: color, spacing, and typography tokens

## Data policy

- Coordinates, contacts, permits, prices, and medical thresholds must not originate from the language model.
- Every operational fact needs a source, license/permission record, and verification timestamp.
- Time-sensitive facts stay separate from stable route geometry.
- The UI must expose stale, missing, or uncertain data.
- Route and map providers must explicitly permit the intended online and offline use.

## Backend

- Python 3.12, FastAPI, and Pydantic
- PostgreSQL/PostGIS for route and waypoint geometry
- Nebius Token Factory for NVIDIA Nemotron inference
- Optional Nebius Serverless Job for offline-pack generation
- JSON Schema validation for every model response

The backend is implemented in `backend/app/`. Firebase Admin verifies client ID tokens and writes cloud data to Firestore. PostgreSQL/PostGIS and offline pack generation remain planned. Live cloud and Nemotron integration still require credentials and physical-device verification.
