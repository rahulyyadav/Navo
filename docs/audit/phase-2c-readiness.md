# Phase 2C — controlled development restart and readiness verification

21 October 2026, Asia/Kathmandu. Repository: `<repository>`; branch `codex/onboarding-discovery-reliability`; source baseline `4e525f9` plus the preserved, uncommitted Phase 2B changes.

**The development backend was safely restarted on port 8114 and is using the Phase 2B code.** Health returns 200. Readiness correctly remains 503 with `firebase_credentials_unavailable`: usable approved Firebase Admin credentials are still missing. The main API URL is valid. Lint, type-check, 135 client tests and 111 backend tests passed again. Real two-account testing remains blocked and was not attempted.

## Scope and Git preservation

Reviewed [Phase 2B](phase-2b-readiness.md) and the earlier architecture, test results, backend smoke-test and Phase 2A recommendations. The geographic/offline findings remain unchanged and outside this restart's implementation scope.

The initial working tree was **not clean**. It contained 12 tracked modified files, the untracked `backend/tests/test_database.py`, and the untracked `docs/audit/` tree. The tracked Phase 2B diff was 175 insertions and 25 deletions. No reset, checkout, stash, configuration overwrite, commit or push was performed.

The Phase 2B changes present at the start were:

| Files | Existing changes retained |
| --- | --- |
| `backend/app/database.py` | Serialized default-app initialization, public SDK app lookup, credential selection and safe setup diagnostics |
| `backend/app/main.py` | Categorized readiness failure responses and real Firestore read without transport retries |
| `src/services/backend-address.ts`, `src/lib/api.ts` | Shared address validation, trimming and rejection before main token refresh |
| `src/services/ai-status.ts`, `src/hooks/useAiStatus.ts` | Same phone address resolution for AI probes and chat |
| `backend/tests/test_api.py`, untracked `backend/tests/test_database.py` | Readiness/auth/credential/recovery/concurrency regressions |
| `tests/backend-address.test.mjs`, `tests/api.test.mjs`, `tests/ai-status.test.mjs` | URL normalization, rejection, fallback and native probe parity |
| `.env.example`, `backend/.env.example` | Configuration comments; no new real credential values |
| Ignored root `.env.local` | Main URL previously set to the observed local backend |
| `docs/audit/phase-2b-readiness.md` | Phase 2B evidence and remaining setup requirements |

Content hashes were recorded privately under `/tmp` for 26 existing source/configuration/report files before the restart. Subsequent comparison found **zero changes** to those files, including ignored root `.env.local` and `backend/.env`. No hashes or sensitive file contents were printed. Phase 2C adds this report only; it does not change application code, dependency locks or configuration files.

## Process identification and restart

The existing port-8114 listener was PID **60776**, owned by the current user. Its argument list was checked privately and reported only as flags: exactly a Python executable with `-m app.serve`. Its working directory was this repository, and lsof tied that same PID to the local API listener. The existing API returned Navo health 200 and the old generic readiness 503. Together these identified the relevant development backend; a process name or port alone was not used as authorization to terminate it.

The Expo listener on port 8115 was PID **59735**. It was not restarted or signaled. No full process environment or unredacted argument list was output. Initial sandbox restrictions prevented `ps`; a narrowly scoped permitted process inspection established identity before any termination.

The restart script rechecked ownership, exact module arguments, working directory and the port immediately before sending **SIGTERM only to PID 60776**. It waited for the listener to release, checked that no unrelated process had taken the port, and then launched the documented `app.serve` entry point. There was no force-kill or process-name-wide termination. The repository's Phase 2B report documents this entry point; the README also documents the underlying Uvicorn launch.

Equivalent command from the repository root:

```sh
PYTHONPATH=backend PORT=8114 CORS_ORIGINS=http://localhost:8115 backend/.venv/bin/python -m app.serve
```

The replacement started as PID **481** and listens on 8114. It runs independently of the short verification command, with server output in `/tmp/navo-phase2c-backend-server.log`. Startup completed without a bind error. The original Expo process remained PID 59735 on 8115.

`PORT`, `PYTHONPATH` and the exact current Expo CORS origin were process-local launch overrides. No `.env` or deployment setting was rewritten. The old process was known to allow the current origin, while file/default settings alone omit port 8115. The new launch explicitly reproduces that needed development access; it does not claim to reconstruct every unknown old process environment value or additional old origin. The current approved origin and an unapproved origin were both tested after restart. No wildcard or authentication bypass was introduced.

## Evidence that updated code is loaded

Before restart, the running `/ready` response had `ready:false` but no diagnostic code/action. After restart, **the same port 8114** returned `firebase_credentials_unavailable` and an action matching the current Phase 2B implementation, on two successive requests. The listener PID also changed to the newly launched process. This verifies loaded behavior, rather than inferring success from an on-disk edit or startup log alone.

## Live verification results

Only unauthenticated/read-only local probes were submitted. No real bearer token, account mutation, model inference or two-account action was used.

| Verification | Actual result |
| --- | --- |
| Backend startup | Successful; new process owns port 8114 |
| `GET /health` | **200**, `status: "ok"`, `aiConfigured: true`, `Cache-Control: no-store` |
| `GET /ready`, twice | **503**, `ready: false`, `code: "firebase_credentials_unavailable"`, safe current action present, no-store |
| Firebase Admin initialization | **Not successful**; readiness fails at credential loading, before a successful Admin/Firestore connection |
| `POST /session`, no bearer | **401** |
| `POST /chat`, no bearer | **401**; no model request |
| `GET /groups/audit-placeholder`, no bearer | **401**; no group data returned |
| `/session` preflight, current Expo origin | **200**, exact matching allow-origin |
| `/session` preflight, unapproved synthetic origin | **400**, no matching allow-origin |
| Main API URL | Configured and passes the application's actual validator; matches `http://localhost:8114` |
| Chat URL | Resolves to the same local base in the inspected configuration |
| Existing Expo bundle on 8115 | **200**; delivered public virtual environment contains the correct main URL and API implementation references that environment |
| `npm run check:services` | **Exit 1**, truthful dependency failure: process responding/model configured, account storage NOT ready |

The health model flag establishes configuration only; it does not prove provider access, credits or a real Nemotron response. Readiness still requires a real Firestore read and was not weakened to manufacture 200. The successful CORS check is browser access evidence, not a successful authenticated session. Main HTTP loopback is appropriate to this local web setup, not a production URL or proof of physical-phone connectivity.

The README has historical claims that `/chat` does not require backend token verification. Those claims do not match current code or the live 401 result. This report follows the current guarded implementation; no authentication was removed to match stale documentation. README cleanup is not included in this verification-only phase.

## Regression checks rerun after restart

| Command | Result |
| --- | --- |
| `npm run lint` | Exit 0; no lint warnings/errors |
| `npm run typecheck` | Exit 0 |
| `npm test` | Exit 0; **135 passed**, 0 failed/skipped |
| `.venv/bin/python -m pytest -q` from `backend/` | Exit 0; **111 passed**, one existing Starlette/HTTPX TestClient deprecation warning |
| `git diff --check` | Passed |
| Existing-file hash preservation comparison | 26 files checked; zero changed |

The regression suites include credential selection, failed initialization retry, concurrent initialization, safe readiness failure/recovery, no readiness writes, token revocation/verified-email behavior, URL validation before main token acquisition and phone status/request address parity. Adapter/mock passes do not prove real cloud integration. No emulator against production or new dependency installation was attempted.

Logs are in `/tmp/navo-phase2c-lint.log`, `/tmp/navo-phase2c-typecheck.log`, `/tmp/navo-phase2c-client.log` and `/tmp/navo-phase2c-backend-tests.log`. The local restart/probe helpers and sanitized process record are also under `/tmp/navo-phase2c-*`. Verification output contains status/configuration-match flags, not credentials or account content.

## Exact remaining Firebase requirements

Fresh settings inspection confirmed a configured server project, but **no explicit Admin file, no inline email/private-key pair, no existing process-selected ADC file and no standard local gcloud ADC file**. Live readiness independently confirmed credential unavailability after restart. These findings cover the inspected local paths; they do not establish IAM rights or rule out every externally managed identity mechanism.

No approved usable credential was available to install/reuse. Repeating the restart cannot resolve that missing prerequisite. The developer must complete the following outside chat, without pasting secrets:

1. Designate the non-production Firebase project/database and approve the server identity allowed to access it. Align server `FIREBASE_PROJECT_ID` and the client's Firebase project. The existing configured project has not been designated disposable staging; adding credentials is not permission to write its production records. `/session` itself writes profile data.
2. Prefer the already reviewed keyless local ADC mechanism using an approved service account and authorized impersonation access. With the backend's explicit file and inline fields empty, the developer may establish standard ADC using the approved identity:

   ```sh
   gcloud auth application-default login --impersonate-service-account=APPROVED_SERVICE_ACCOUNT_EMAIL
   ```

   The email above is a placeholder, not an account created/discovered here. Required access must be approved by the project owner; this task did not grant IAM roles or create credentials. A browser Firebase login or ordinary gcloud CLI login is not an Admin setup. Plain end-user ADC has Firebase Authentication caveats; retain the [Phase 2B credential guidance](phase-2b-readiness.md#6-exact-developer-requirements-and-safe-next-steps) and its official references.
3. If keyless access is unavailable, provide the **local path only** to an existing approved service-account JSON kept outside the repository. Configure the server-only `GOOGLE_APPLICATION_CREDENTIALS` path manually. This application's explicit path uses `credentials.Certificate`, so it expects service-account JSON, not an arbitrary user/impersonation ADC file. Do not generate a new key or paste/upload its contents as a workaround. No Admin/model secret belongs in `EXPO_PUBLIC_*`.
4. Ensure the approved identity has the Firestore and Firebase Authentication access Navo actually requires, including revocation-aware Auth checks. A successful read-only readiness probe alone does not prove write permissions or Auth API access. Do not loosen client rules or grant broad owner privileges merely to pass the probe.
5. After approved setup, restart only this development backend with the command above, reload the client, and rerun health/readiness/service checks. Require readiness 200 before the separately authorized authenticated smoke test.

**Ready for the controlled two-account smoke test: NO.** Real Admin initialization, real Firestore readiness, live AI and group flows remain blocked/unverified. The next test also needs two existing approved staging identities and independent browser profiles/devices; no test-account creation was authorized or performed here. Credentials, IAM/provider changes, production access or deployment require separate concrete authorization.

The restarted development backend is left running. No production service was restarted, no map library was migrated, and no production deployment was performed. Stop after this verification.
