# Navo launch audit — 12 October 2026

## Verdict and evidence limits

Not ready for an unrestricted public hiking/navigation launch. A small invitation-only web beta is achievable after the critical items below. This audit inspected the current working tree, not a newly published build. Ten existing UI/config files remain uncommitted; this audit did not deploy, merge or replace them.

Fresh checks: TypeScript and lint pass; 76 client tests pass; 71 backend tests pass (one TestClient deprecation warning). npm audit reports 23 findings: 20 high, 3 moderate, no critical. These include transitive/build dependencies and require reachability triage; the number does not mean 23 exploitable runtime vulnerabilities. Do not run force fixes that downgrade Expo/RN. Release configuration fails six checks. Public Render /health request received no response within 55 seconds; this alone cannot distinguish cold start, deployment failure, or network trouble.

Browser tested at 390×844, signed out. No account created, no private GPS requested, no group invitations sent. Physical iOS/Android, signed-in Home/gallery/preparation, real email delivery, two-account groups, notification delivery, field navigation and data recovery remain unverified. A full end-to-end audit cannot be claimed until those gates are tested.

## Fresh flow results

1. Destination search — partial pass. “Pulchowki” correctly ranks Phulchowki hill first. Unrelated restaurants/neighbourhoods and a Polish result remain below; hiking intent ranking needs work. Screenshot 01-search.png.
2. Origin and route — partial pass. Godawari Botanical Garden entry resolves. Routing returns 6.76 km, 90 minutes, one option, real instructions and endpoint offsets 6 m/28 m. Elevation/difficulty unavailable. The large duration/arrival can be mistaken for a reliable uphill hiking budget despite warning copy. Screenshot 04-route.png.
3. AI — functional locally, quality fail for launch. Asked whether 90 minutes covers ascent and return. AI correctly distinguishes one-way but suggests about three hours round trip, calls the baseline reasonable under ideal conditions, and adds unsupported 15–30-minute buffers. Missing elevation means it should not endorse this as a suitable hiking budget. Answer is lengthy and reintroduces seconds. Screenshot 02-ai.png.
4. Weather — browser pass, limited scope. Live hourly results, source, fetched time, sunset and rain alert appear. Forecast hours follow the short one-way estimate; extend to intended turnaround/return. Fetched timestamp needs explicit timezone consistency. This is a point forecast, not field verification.
5. Save/start/invite — blocked by signed-out state. CTA goes to login; browser Back preserves the plan. Successful authentication and return-to-save remain untested. Login screen is readable but has no obvious in-screen return-to-plan control. Screenshot 03-login.png.
6. Route export — button invoked; no success feedback observed in inspected page. Download contents/native share sheet not verified in this audit.
7. Home/gallery/preparation/groups/history — authenticated flow unavailable in this browser session. User screenshots show earlier failures; do not treat those older builds as proof of current behavior.
8. Live trek/completion — not field-tested. Source explicitly pauses sessions when backgrounded. Locked-phone tracking is not implemented as continuous background navigation.

## Critical fixes before sharing the public backend

- Protect POST /chat. backend/app/main.py:332 accepts requests without current_user or a request budget. CORS is not an abuse control. Add authenticated or tightly limited anonymous access, per-user/IP throttling, global daily token/spend budget, concurrency cap, timeout/cancellation and a kill switch before adding a billable public key.
- Complete Render startup and credentials. Root blank; build `pip install -r backend/requirements.lock`; start `PYTHONPATH=backend python -m app.serve`; health `/health`. Verify actual deploy logs. Privately configure Nebius key/model/base, Firebase Admin credentials, project ID, exact CORS origins, ENABLE_DEMO=false. Never put secrets in EXPO_PUBLIC variables.
- Configure frontend public API/chat URLs only after deployment succeeds. Current main API is unset and chat points to laptop localhost. LAN development is not public hosting.
- Add readiness checks. /health currently treats a project ID as firebaseConfigured; it does not establish credential validity, Firestore permissions or AI availability. Keep cheap liveness separate from dependency readiness and monitored smoke tests.
- Finish email/auth integration. Backend still requires verified email for cloud features. Test signup, resend cooldown, actual email receipt, link handling, token refresh, password reset, expired session and Google sign-in. Removing client verification UI alone cannot fix server rejection. Personal planning should remain available without cloud verification.
- Complete Firebase rules/index deployment and test groups with two real accounts: create, accept/reject invite, approve join, message, leave/remove, reject outsider access, revoke link, reconnect and duplicate-submit handling.
- Fix AI hike-time endorsement and test a fixed evaluation set: missing altitude, no return route, stale weather, closures, dangerous shortcuts, contradictory input and prompt injection. Use verified route facts; do not let model prose certify access or timing.

## Product improvements before wider beta

- Simplify planning into destination → start/date → route review → save/start. Current screen is a long stack with repeated sign-in buttons, technical paragraphs, map references, AI, crew, weather and instructions. Collapse secondary details; show one primary next action.
- Replace typed YYYY-MM-DD / HH:MM entry with accessible date/time selection plus validation. Show a prominent one-way/round-trip choice, planned return time, ascent when available, and daylight margin.
- Use “provider baseline; hiking duration unknown” when elevation is missing. Do not present unsupported precision as the primary arrival promise.
- Rank peaks, trailheads and curated hiking aliases above unrelated geocoder results; distinguish settlement versus summit versus trail entrance. Add region filters and useful empty/error states. Global place search does not mean every place has a usable hike.
- Map work should prioritize correct trails, full-screen route view, start/end/recenter, elevation profile, credible route source and offline behavior. More attractive satellite tiles do not repair routing data. Published paper-map links are reference material; they may differ from the selected route and do not grant redistribution rights.
- Offline packs currently do not establish offline basemap coverage. Show downloaded versus online-only content. Test airplane mode and reconnect. Do not bulk-download public tiles without permission.
- GPS needs denied/approximate permission, stale fix, drift, no-signal, battery saver, phone lock, restart, pause/resume, off-route and completion tests on real devices. Foreground-only behavior must be unmistakable.
- Local plans are account-scoped on the device, not a demonstrated cross-device backup. Add a deliberate backup/export or cloud-sync contract; test account switching, failed writes, reinstall and merge conflicts.
- Privacy screen clears local data; no complete cloud account deletion flow found. Implement reauthentication, profile/device-token/location cleanup, group ownership handling, retention policy and user data export. Publish a real privacy URL and support address.
- Remote notification delivery requires a running worker and native configuration; Free web hosting does not provide an always-on worker. Test duplicates, receipts, revoked tokens, opt-out, quiet hours and two-device delivery. Keep inspiration opt-in. Do not promise rescue/urgent delivery.
- Accessibility: test VoiceOver/TalkBack, large text, focus order, keyboard visibility, reduce motion, map-independent directions, contrast over every image and 44-point controls. One phone-size browser capture is insufficient to certify native responsiveness.
- Verify current Home image sizing, varied galleries, motion pause and preparation retry on the rebuilt phone app. The large hero should not hide search or useful actions below the fold.
- Add sanitized error reporting, uptime/dependency monitoring, version/build display, rollback procedure, support triage and restore drills. Avoid logging precise GPS, message bodies or tokens.
- Audit 23 dependency advisories with SDK-compatible fixes; distinguish build-time from shipped risk and document any justified deferral.
- Merge the pending readability/timeout/version changes only after review; rebuild with intended release env. Current local code and GitHub main differ.

## Free initial phase

Start with 10–20 invited testers and a limited set of locally reviewed day hikes. This tester count is a scope recommendation, not a promised hosting capacity. Offer discovery, route preview, personal preparation, saved plans and user-triggered forecast. Enable groups only after real two-account testing. Gate AI with small quotas and available credits; disable it when budget is exhausted. Do not market background tracking, offline maps, emergency monitoring or reliable mountain ETA yet.

| Component | No-cost starting option | Constraint |
| --- | --- | --- |
| Frontend | Expo web export on free static hosting | Configure deep-link fallback, Firebase authorized domain and backend CORS; web does not prove native behavior |
| Backend | Existing Render Free service | Sleeps after 15 idle minutes, wakes in about a minute, 750 free service-hours per workspace/month; Render says not for production |
| Accounts/data | Firebase Spark Auth + Firestore | Firestore free quota: 1 GiB, 50k reads/day, 20k writes/day, 20k deletes/day, 10 GiB outbound/month; usage patterns determine capacity |
| Photos | Existing bundled licensed assets | Keep individual attribution; avoid user uploads initially |
| Search/routes | Public providers only within their published policies | Photon demo has no SLA; FOSSGIS allows at most one request/second and no heavy usage; obtain suitable capacity for scale |
| Weather | Open-Meteo free API for eligible non-commercial testing | 10k calls/day, no uptime guarantee; commercial usage requires appropriate license |
| AI | Existing promotional/prepaid credits if available | API key is not unlimited free inference; exact account balance/expiry not verified |
| Notifications | In-app updates and optional local reminders | Remote worker delivery is separate; no guaranteed background alerts |
| Distribution | Web link first | Ordinary Apple membership $99/year; Play registration $25 once. A store launch is not strictly $0 unless applicable eligibility/waivers/already-paid accounts cover fees |

Avoid a new paid database, free Render Postgres for durable user data (expires after 30 days), adding card-backed overages, SMS sign-in, always-on live-location writes and unlimited AI. Keep Google project on Spark as requested. Read quotas regularly; free service may suspend at limits. Firebase managed backups/PITR require billing; a free beta still needs a tested, privacy-aware recovery/export procedure.

## Exit criteria

Before inviting testers: public health/readiness succeeds; chat abuse guard works; credentials configured; release checker passes; authentication/email works; privacy/support published; known limits shown clearly. Before wider public release: two-device groups/push proven, deletion/recovery tested, route data field-reviewed, real-phone navigation/accessibility tested, provider terms/capacity confirmed and monitoring/rollback operational.

## Screenshots

![1 Search](../output/audit/launch/01-search.png)
![2 AI answer](../output/audit/launch/02-ai.png)
![3 Login gate](../output/audit/launch/03-login.png)
![4 Route review](../output/audit/launch/04-route.png)

## Current official references

- https://render.com/docs/free
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/firestore/quotas
- https://open-meteo.com/en/pricing
- https://routing.openstreetmap.de/about.html
- https://github.com/komoot/photon
- https://tokenfactory.nebius.com/organization/prices
- https://developer.apple.com/programs/whats-included/
- https://support.google.com/googleplay/android-developer/answer/6112435
