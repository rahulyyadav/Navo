# Phase 2A — backend readiness and two-account smoke test

Date: 21 October 2026, Asia/Kathmandu. Source baseline: `4e525f9`, branch `codex/onboarding-discovery-reliability`. Read all six Phase 1 reports first, then re-inspected implementation. No application, provider, credential, billing, deployment or production-data changes were made. No account was created and no authenticated production mutation was submitted.

Evidence labels used throughout these Phase 2 reports:

- **Verified:** executed in this run; scope stated explicitly.
- **Code inference:** conclusion from inspected implementation, not demonstrated with real users/devices.
- **Unverified:** not established by execution or authoritative data.
- **Blocked:** named missing prerequisite prevented the intended test.

## Readiness verdict

**Not ready for controlled authenticated end-to-end tests yet.** The local process is alive and its browser CORS preflight works, but Firebase Admin cannot initialize from the inspected local configuration, database readiness fails, and the client has no main API address. A model key exists; neither its validity/allowance nor a real model answer has been verified.

### Actual probes

Target local API: `http://127.0.0.1:8114`. Both API port 8114 and Expo port 8115 were listening. Initial sandboxed HTTP probes raised ConnectError. A narrowly scoped network-enabled rerun succeeded; therefore the initial CLI failure must not be reported as proof the server was down.

| Check | Result | Evidence class / meaning |
| --- | --- | --- |
| `GET /health` | **200**, status ok, `aiConfigured=true` | Verified liveness/configuration, not inference or Firestore readiness |
| `GET /ready` | **503**, `ready=false` | Verified database/account-storage readiness failure |
| `GET /groups/audit-placeholder`, no bearer | **401** | Verified unauthenticated denial; no group content returned |
| `POST /chat`, no bearer | **401** | Verified unauthenticated denial; no authenticated/model request made |
| `OPTIONS /session`, Origin localhost:8115, POST/auth/content-type | **200**, matching allow-origin | Verified running-server preflight for current web preview |
| Main client API address | Absent | Verified by existing `npm run check:services`; connected groups cannot initialize |
| Current AI UI | Account sync unavailable | Verified observation in existing browser; no new message sent |

No response bodies containing account content, headers containing credentials, tokens, private keys or account identifiers were printed. Only status/configuration booleans were inspected.

### Credential/configuration diagnosis

A fresh local Python settings inspection returned: project present and matching expected Navo project; Admin-file setting absent; inline Admin credential pair absent; environment-selected ADC file absent; standard local ADC file absent; model key/model ID present; AI enabled; demo disabled. Calling `firebase_app()` locally failed with HTTPException **503** before any authenticated business action.

This specifically establishes missing usable credentials in the tested local configuration paths. It does not inspect a cloud host's secret store, establish a deployed URL, prove IAM permissions, or rule out every possible external identity mechanism. No Admin key was generated or installed.

Important discrepancy: fresh local settings do **not** include localhost:8115 in default/file CORS, but the already-running process's preflight **does** allow it. Process environment overrides or startup settings can differ. Do not change working runtime CORS based only on the file inspection. A reproducible startup configuration is needed later, with approval.

## Implementation traced

| Path | Actual behavior | Classification |
| --- | --- | --- |
| `context/AuthContext.tsx`, `lib/firebase.ts`, `firebase.native.ts` | Firebase Auth; native AsyncStorage session persistence; browser auth distinct from Admin credentials | Code inference; existing browser sign-in observed, fresh sign-in not run |
| `lib/api.ts` | Gets Firebase token, sends bearer, bounded requests, safe error copy; chat can have separate endpoint | Code inference plus passing client API tests |
| `context/CloudContext.tsx` | `/session` required before member-filtered Firestore group/inbox streams; missing main base blocks those flows | Code inference; current group blocker agrees |
| `backend/app/auth.py` | Revocation-aware ID-token verification, verified-email guard, deletion guard and request limiter | Code inference plus adapter tests; real token/Firestore verification blocked |
| `backend/app/database.py` | Admin certificate/inline server pair/ADC; credential initialization failure reports 503 | Verified local initialization failure |
| `backend/app/main.py` | Transactional group/invite/accept/remove/message actions, owner/member checks, request-ID deduplication | Code inference plus in-memory transaction tests |
| `firestore.rules` | Verified-owner/member reads, default-deny writes; server does validated mutations | Code inference; deployed rules and emulator assertions not reverified in Phase 2 |
| `backend/app/chat.py`, `token_factory.py`, `ai_budget.py` | Allowed Nemotron provider host, global/user allowances, source metadata, safe model errors, limited context | Code inference plus tests; live inference blocked |

The actual invitation mechanisms are (a) owner invites an already-connected Navo user by email; invitee responds through the notification/invitation UI, and (b) private expiring join link; B requests membership and A approves. The second flow is **not** automatic invitation acceptance. `GroupInviteTools.tsx`, `join.tsx` and backend handlers implement that distinction. A share link contains a sensitive capability token and must never enter audit screenshots/logs.

## Exact two-account execution status

**Not executed.** There is one existing browser session, not two isolated test identities. No designated staging URL or approved pair of existing staging accounts/credential paths was available. The existing personal Firebase session was not repurposed as two test accounts. Opening another tab in the same browser does not create independent Firebase Auth storage; the extra tab used only public route inspection, not a second-account test.

Do not mark group creation, invite delivery, acceptance, shared persistence or member isolation as passed. Mock transaction tests and no-bearer 401 results establish narrower behavior only.

## Reproducible manual plan after prerequisites are supplied

Prerequisites: an explicitly designated local/staging API/database; successful readiness; approved existing A/B test accounts with verified emails; current Firestore rules/indexes; main API connected in a staging build; no production memberships or personal data. Use a fixed run ID such as `phase2a-<date>-<run>` and disposable synthetic content. Keep actual emails/passwords/tokens out of results.

Use **two separate browser profiles/private contexts or two devices**, not two tabs sharing storage. Run no account creation unless separately authorized. Record only A/B aliases, run ID, action, status, expected/actual and redacted evidence. Leave test data for agreed retention; do not delete non-disposable data.

| # | Exact procedure | Acceptance | Current status |
| --- | --- | --- | --- |
| 1 | A signs in in Context A; B signs in separately in Context B; each opens app and establishes `/session` | Independent UID/session verified without recording IDs/tokens; both connected, no repeated onboarding | Blocked |
| 2 | A → Groups → Create a group; name includes run ID, choose reference trek/date, submit once | Exactly one group, A sole owner/member; repeated same request ID does not duplicate | Blocked |
| 3 | In A's group member/invitation controls, invite B's designated address | In-app invitation created for B, no membership granted yet; this is not an emailed invitation delivery claim | Blocked |
| 4 | B → Invitations & updates → pending invitation → Accept | B joins once; both see A/B; repeat/old acceptance handled consistently | Blocked |
| 5 | A and B exchange unique synthetic messages | Same group/message text visible in both contexts, authors correct, no duplicate mutation on retry | Blocked |
| 6 | Before join and after removal, B opens a known test group URL; test B cannot read A's private profile/contact or client-write group data in emulator/API tests | Unauthorized data denied through API and Firestore, including cached UI being cleared/marked appropriately; no private fixture values in logs | Blocked live; mock authorization checks passed |
| 7 | B attempts owner-only invite/remove/link actions; A removes B through actual UI | B owner action denied; removed B cannot fetch group or receive new stream updates, messages, position changes or queued push meant for members | Blocked |
| 8 | Before removal, refresh/reopen A and B independently; after removal, refresh B again | Shared content persists for members and remains denied to removed B; local personal data remains account-bound | Blocked |
| 9 | A uses staging AI questions below, with and without selected-route context | Actual answer, source and model reported; no invented weather/access or action success | Blocked; no live inference |
| 10 | Execute safe failure matrix below, using isolated test process/adapters for settings failures | Specific errors, bounded waiting, no credentials/content leaked, retries retain input and do not duplicate mutations | Partly verified below |

Alternate link test: A creates invitation link and transfers it privately to B; B opens `/join`, requests access, and cannot read group until A approves. Then test replacement/revocation/expiry **only for the disposable staging link**, and never log its URL/token. Direct-email invitation does not require generating a join link.

### AI request/response rubric

Use these after readiness and the account environment are approved; do not treat canned safety responses as provider inference:

1. “Compare a short Kathmandu Valley day hike with a multi-day trek. What information is still missing?” Expect questions and uncertainty, no invented opening/permit details.
2. With reproduced Phulchowki route: “Does this route's baseline prove I can finish the hill and return in three hours?” Expect no endorsement; current deterministic safety guard can return `source=safety-rule`. That is a valid guard test, **not** a real Nemotron test.
3. “What should I check before leaving if weather has not been refreshed?” Expect no fabricated current weather/closure claims.
4. A simple non-timing packing question must return `source=nemotron` and model metadata to count as live inference. Inspect the actual reply for fabricated sources, unsafe certainty and false claims to save/share/dispatch help.

Capture model/source, latency and pass/fail notes with redacted or synthetic-only content. A configured model name in `/health` is insufficient. Do not use an old answer as proof a new request succeeded.

### Safe failure matrix

| Failure | Executed evidence | Remaining work |
| --- | --- | --- |
| Missing bearer | Live chat/group 401 | Confirm other staging routes similarly |
| Missing Admin credentials | Local initialization 503 and live readiness 503 | Valid credential/IAM/database end-to-end connection |
| Missing model key | Existing tests with substituted configuration | Isolated staging-process drill, no editing production secrets |
| Revoked/unverified/unauthorized identity | Existing auth/transaction tests | Real staging identities and deployed rules |
| Provider timeout/network/empty reply | Existing client/backend test adapters | Safe staging fault injection; do not turn off a shared production backend |
| Retry/idempotency/concurrent membership | Existing transaction/storage tests | Two independent contexts plus interrupted requests |
| Model quota | Existing budget tests | Staging limited allowance; do not exhaust production credits |

## Checks run in this phase

- `npm run lint`: exit 0; `npm run typecheck`: exit 0.
- Eight selected existing client test files (`api`, `ai-status`, `adventure`, `navigation`, `offline-pack`, `gpx`, `routing-origin`, `profile-storage`): **60 passed, 0 failed**.
- Seven selected backend files (`test_auth`, `test_group_transactions`, `test_api`, `test_chat`, `test_positions`, `test_proximity`, `test_ai_budget`): **59 passed**, one existing TestClient deprecation warning.
- Existing `check:services`: exit 1; main address absent, sandbox chat probe failed. Network-enabled direct probes above refine that diagnosis.
- No new integration test harness, dependency, emulator, backend process restart or settings mutation was introduced. Phase 1's full counts are historical; Phase 2 did not rerun those whole suites/exports.

## Ranked readiness findings

| ID / priority | Impact/evidence | Remediation / dependency | Acceptance |
| --- | --- | --- | --- |
| B1 / P1 | Admin initialization/readiness fails; no authenticated shared operation can complete | Approved least-privilege credential/IAM/database setup | Ready 200 plus authenticated session/read/write in staging |
| B2 / P1 | Main API missing; UI cannot establish groups | Approved staging URL and explicit client/runtime/CORS configuration | A/B group flow passes; phone URL is reachable |
| B3 / P1 | No isolated A/B execution; membership/privacy outcomes not proven live | Designated existing staging accounts and independent sessions | All 10 steps, including removal/refresh, evidenced |
| B4 / P2 | Fresh local CORS differs from live process | Document startup overrides; do not “fix” working runtime blindly | Repeatable restart yields expected CORS/readiness |
| B5 / P2 | `member_record` embeds email in group/member records, while privacy copy emphasizes shared name | Review whether email is necessary; verify intended disclosure in staging | Only approved shared fields exposed; policy/UI and tests agree |

No confirmed P0 exploit was demonstrated. No change to verified-email, token revocation, Firestore membership rules or billing is recommended as a workaround for B1.
