# Phase 2B — local backend readiness

21 October 2026, Asia/Kathmandu. Source baseline `4e525f9`, branch `codex/onboarding-discovery-reliability`.

**Result: the missing local main API URL is corrected; credential-dependent readiness remains blocked.** The updated process starts and reports health 200, readiness 503 with `firebase_credentials_unavailable`, and protected routes reject missing authentication with 401. No real two-account functionality or live model inference was tested. A valid approved Admin identity and a designated non-production test environment are still required.

Read before investigation: Phase 1 architecture, current-state, feature-matrix, risks, test-results and upgrade-roadmap; Phase 2A backend-smoke-test, geographic-data-audit, offline-gps-readiness and phase-2-recommendations. Those reports and evidence were preserved. This phase is limited to local readiness code, ignored local client configuration, tests and documentation. No production data, credential, IAM/provider setting, billing, rules, hosting or deployment configuration was changed; no account was created and nothing was pushed.

## 1. Confirmed causes and initialization path

`backend/app/database.py::firebase_app()` initializes the Firebase Admin default app. `database()` obtains its Firestore client. Authentication calls `firebase_app()` before verifying a supplied bearer token, and `/ready` reaches it through `database()`. Missing bearer tokens are rejected before initialization. Client Firebase Auth/browser login does not provide server Admin credentials.

`backend/app/config.py::settings()` reads `backend/.env` through Pydantic, with process environment taking precedence. Both settings and successfully constructed Admin/Firestore objects are cached. The backend does not load the root client `.env.local` as its settings file.

Supported server credential mechanisms, now with explicit deterministic selection:

1. Complete `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` pair: existing compatibility mechanism, selected before a file path. Literal escaped newlines are converted for the SDK. A partial pair now fails explicitly instead of silently trying a different identity.
2. `GOOGLE_APPLICATION_CREDENTIALS`: in this application's settings path, an explicit **service-account certificate JSON path**, passed to `credentials.Certificate`. It is not a generic arbitrary ADC JSON loader. Do not point it at a user/impersonation ADC file.
3. With those fields empty, `credentials.ApplicationDefault()`: standard Google ADC discovery. `get_credential()` resolves the underlying credential before initializing the app with the explicit `FIREBASE_PROJECT_ID`.

Only presence and existence flags were inspected; no credential values or files were dumped. Fresh local inspection confirmed:

| Check | Result |
| --- | --- |
| Backend Firebase project configured | Yes |
| Explicit Admin file configured / present | No / no |
| Inline email / private-key fields present | No / no |
| Process ADC environment file exists | No |
| Standard local gcloud ADC file exists | No |
| Fresh `firebase_app()` attempts 1 and 2 | Both 503, `firebase_credentials_unavailable` |
| Failed initialization cached as success | No |

This establishes failure of the tested local credential discovery path. It does not prove remote IAM/Firestore permissions or inspect every possible externally supplied identity. No approved usable Admin credential source was available to reuse, so valid-credential verification stopped here. A Firebase console URL or the public Firebase web configuration is insufficient.

Exceptions are not cached by `lru_cache`: readiness/auth requests can retry initialization after a failure. Successful app/client creation is cached; it is not repeated on every request. Previously, simultaneous cache misses could both pass the private SDK registry check and attempt initialization. A lock now serializes default-app lookup/creation, uses the SDK's public `get_app()` API, and reuses an existing default app. Concurrent-request tests confirm one initialization. This race was a code-level defect, **not the observed cause** of this machine's missing credentials.

Previously, constructing a bad explicit certificate path could fail before an otherwise complete inline pair was selected. Selection now follows the intended pair-over-file precedence without trying the unrelated path. Explicit credential failure never falls back to another identity. These fixes do not supply credentials or weaken authentication.

## 2. Main API URL diagnosis and correction

`src/lib/api.ts` reads `process.env.EXPO_PUBLIC_API_BASE_URL` for `/session`, groups, preparation and the other main API actions. `CloudContext` gates its connected session/group flows on this value. `EXPO_PUBLIC_CHAT_BASE_URL` is an optional independent chat override; otherwise chat uses the main base. Setting chat alone does not configure the main API.

The ignored root `.env.local` had a chat address but no main address. Evidence for the local address was concrete: the existing backend listens on port 8114, its `/health` responds 200, and the existing chat configuration targets that same local process. This phase added only:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://localhost:8114
```

Other local entries were preserved. No production URL was inferred, and `backend/.env` was not edited. `git check-ignore` confirms the local files are ignored; tracked environment files remain the two blank/example templates.

Both API bases now trim surrounding whitespace and trailing separators. Browser and native request paths validate the base before fetching; main requests reject invalid configuration before refreshing a token. Only HTTP/HTTPS URLs without embedded credentials, query/fragment, internal whitespace or backslash ambiguity are accepted. Errors name the configuration requirement without echoing the supplied value. Existing release checks still require public HTTPS; accepting local HTTP for development is not a release approval.

`resolveBackendAddress()` retains its development-only loopback-to-private-Expo-LAN mapping for phones. It still rejects a phone build pointed at an unreachable laptop loopback without a suitable development host. The AI readiness hook previously probed raw loopback while chat resolved it to LAN; the hook now uses the same resolver. Tests cover this parity, but no physical-phone network test was performed.

Configuration delivery was checked in three ways: Expo's actual environment loader, the existing port-8115 public bundle, and a fresh temporary Expo process on port 8117. All matched the expected local main value. This SDK's development bundle uses an Expo virtual environment object: the API declaration references that object, and the delivered object's main URL matched. An initial literal-only search in the API declaration was inconclusive; it was not mistaken for an absent setting. No entire bundle or other configuration values were printed. A full app reload is needed for an already-open client to consume updated configuration; restart Expo if it remains stale. No authenticated browser action was submitted as part of this check.

Expo 57 was read from `package.json`, its [versioned reference](https://docs.expo.dev/versions/v57.0.0/) was fetched, and the [environment-variable guide](https://docs.expo.dev/guides/environment-variables/) was checked via its documentation index. Public environment references must remain static dot notation; public variables are bundled client configuration and must never contain Admin/model secrets.

## 3. Health, readiness and recovery

`GET /health` remains process liveness: it does not initialize Firebase or wait on Firestore. `aiConfigured` is configuration presence/validation, not proof of a model response or available credits.

`GET /ready` still requires a successful read of `_readiness/probe` through the real Admin Firestore client. The document need not exist: a successful absent-document read proves access. The probe does not create/update it. Firestore transport retry is explicitly disabled **for this probe only**, with a five-second RPC timeout, so the client's retry policy does not extend one probe through repeated RPCs. ADC discovery/token refresh may add time; this is not a hard five-second bound for every initialization stage.

Failure responses remain 503 with `ready:false` and static, secret-free diagnostics:

| Code | Meaning / action |
| --- | --- |
| `firebase_project_missing` | Configure the server project and restart |
| `firebase_credentials_incomplete` | Complete the existing inline pair or remove both fields and select approved ADC/file credentials |
| `firebase_credentials_unavailable` | Approved server credentials could not be loaded; public client configuration is insufficient |
| `account_storage_access_denied` | Check identity, project, Firestore and IAM; do not loosen client security rules |
| `account_storage_unavailable` | Check Firestore/network availability and retry |

No raw SDK exception, credential contents, filesystem path, token or private account detail is returned. Responses retain `Cache-Control: no-store`. A failed probe is not cached. Tests exercise failed ADC → successful initialization and denied Firestore read → successful subsequent probe without writes. These are adapter tests, not successful cloud credentials on this machine.

Changes to `backend/.env` or process settings require a controlled restart because settings are cached. Adding/fixing an ADC resource after a failed initialization can be retried, but restarting after identity configuration changes is the predictable procedure. Once initialized, the SDK manages credential refresh; a later Firestore outage still returns 503 and the next readiness read can recover. No hot credential-reset endpoint was added.

Readiness establishes account-storage access, not every feature's complete end-to-end health. It does not prove Firebase Auth revocation API permissions, Firestore write permissions, deployed client rules/indexes, model inference, quotas or two-account isolation. Keep the Phase 2A authenticated smoke plan as the next gate.

## 4. Verification performed

The original backend on 8114 and Expo on 8115 were left running. Updated backend code was started separately using:

```sh
PYTHONPATH=backend PORT=8116 CORS_ORIGINS=http://localhost:8115 backend/.venv/bin/python -m app.serve
```

This was a process-local exact CORS override, not a settings-file/deployment change. Fresh settings do not otherwise include port 8115; the existing process already allowed it. Do not assume a file-only restart reproduces that override. The port-8114 process still runs its previously loaded backend module and needs a controlled restart to load these source changes.

| Check actually run | Result |
| --- | --- |
| Temporary updated backend startup | Started successfully on 8116 |
| Existing and updated `/health` | 200 |
| Existing `/ready`, twice | 503, previous generic response |
| Updated `/ready`, twice | 503, `firebase_credentials_unavailable`, action present |
| Existing and updated no-bearer `/session`, `/chat`, `/groups/audit-placeholder` | 401 |
| Existing and updated preflight from `http://localhost:8115` | 200, exact allow-origin |
| Existing and updated preflight from an unapproved synthetic origin | 400, no matching allow-origin |
| Expo loader / existing and fresh public bundles | Correct local main configuration delivered |
| `npm run lint` | Passed, no final errors or warnings |
| `npm run typecheck` | Passed |
| `npm test` | 135 passed; 0 failed/skipped |
| `.venv/bin/python -m pytest -q` from `backend/` | 111 passed; one existing Starlette/HTTPX TestClient deprecation warning |
| `npm run check:services`, network-enabled | Exit 1 as expected: process responding, model configured, account storage NOT ready; missing-address error resolved |
| `git diff --check` | Passed |

New regression coverage includes credential selection/partial configuration, retry and concurrent initialization, safe readiness failures/recovery, absence of probe writes, stricter unauthenticated denial assertions, invalid URL rejection before token acquisition, normalized main/chat fallback and phone probe/request address parity. Existing auth revocation and verified-email tests still pass.

Local socket binding and HTTP probes were initially restricted by the execution sandbox. Narrowly scoped network-enabled execution then verified the endpoints. The restricted service checker could not distinguish that restriction from connectivity failure; the network-enabled check confirmed the actual dependency failure. One lint import-order warning was fixed and lint rerun cleanly. A shell wrapper also used zsh's read-only `status` variable; corrected wrappers used task-specific variables. Neither tooling failure is reported as an app defect.

Local logs: `/tmp/navo-phase2b-client.log`, `/tmp/navo-phase2b-backend.log`, `/tmp/navo-phase2b-lint.log`, `/tmp/navo-phase2b-typecheck.log`; temporary probe scripts and Expo output also remain under `/tmp/navo-phase2b-*`. Only allowlisted statuses/configuration-match flags were output by the probes. Temporary backend 8116 and Expo 8117 were stopped; listener verification confirmed only the original 8114/8115 servers remain.

**Blocked, not passed:** initialization with valid approved real credentials; successful real Firestore readiness; authenticated cloud session/write flow; live Nemotron response; two-account groups/invitations/messages/removal/persistence. Rules-emulator assertions remain unverified (Phase 1 documented the missing emulator prerequisite); this phase did not create/install an emulator, alter rules or run them against a real project. Native GPS/offline/map changes and production deployment were outside scope.

## 5. Files affected

- `backend/app/database.py`: safe setup diagnostics, deterministic credential selection and serialized default-app initialization.
- `backend/app/main.py`: categorized readiness responses and a read-only probe without transport retries.
- `src/services/backend-address.ts`, `src/lib/api.ts`: common runtime URL validation and normalization.
- `src/services/ai-status.ts`, `src/hooks/useAiStatus.ts`: same native address resolution for readiness and chat.
- `backend/tests/test_database.py`, `backend/tests/test_api.py`, `tests/backend-address.test.mjs`, `tests/api.test.mjs`, `tests/ai-status.test.mjs`: regression verification.
- `.env.example`, `backend/.env.example`: configuration comments only; no production value supplied/changed.
- Ignored root `.env.local`: main API entry only, backed by observed existing local server/chat configuration.
- This report. Earlier audit documents/screenshots were not rewritten or published.

## 6. Exact developer requirements and safe next steps

Before enabling authenticated tests, designate a non-production Firebase project/database and approve the identity allowed to access it. The currently configured project has not been designated as a disposable staging environment. Do not treat adding Admin credentials as permission to mutate its existing data: `/session` itself writes a user record. Align the client Firebase project and server project for the approved environment.

For local development, prefer ADC using an **already approved, appropriately scoped service account through impersonation**, avoiding a downloaded long-lived key. Python supports impersonation ADC, and the developer needs authorized Token Creator access on that identity. Only after that identity/access decision is approved, the developer can run:

```sh
gcloud auth application-default login --impersonate-service-account=APPROVED_SERVICE_ACCOUNT_EMAIL
```

`APPROVED_SERVICE_ACCOUNT_EMAIL` is a placeholder, not an identity discovered or provisioned here. Leave the backend's explicit file and inline credential fields empty for standard ADC discovery. Ordinary `gcloud auth login` is distinct from ADC. Plain gcloud user ADC has additional Firebase Authentication restrictions; a generic successful Google login is not sufficient proof of compatibility. See [Google's local ADC guidance](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment) and [Firebase Admin setup and Auth caveats](https://firebase.google.com/docs/admin/setup).

If keyless access is unavailable, supply the local path to an **existing approved** service-account JSON outside the repository, then set the server-only `GOOGLE_APPLICATION_CREDENTIALS` path. Do not paste its contents, generate a new key without approval, commit it, or put it in an `EXPO_PUBLIC_` field. Staging should use its hosting platform's approved workload identity where supported, otherwise approved secret injection and narrowly scoped credentials; no staging hosting/secret changes were made here.

The approved identity needs the actual Firestore and Firebase Authentication permissions used by Navo, including the revocation-aware Auth checks. A project owner must review the required access; do not grant broad Editor/Owner as a workaround or relax security rules. A ready read alone does not establish these broader permissions.

After those manual prerequisites are supplied, restart the local backend with the approved environment and an explicit actual Expo CORS origin, full-reload the client, and rerun health/readiness/service checks. Require real readiness 200 before proceeding to the separately authorized Phase 2A smoke plan with two existing approved staging accounts in independent browser profiles/devices. No account creation is implied.

**Controlled two-account smoke-test readiness: NO.** Still required: approved Admin credential mechanism/reference, designated non-production target and existing A/B identities. Changes to IAM, credentials, provider settings, deployment or production data require separate concrete authorization. No map migration, offline implementation or production deployment is part of this phase. Stop here.
