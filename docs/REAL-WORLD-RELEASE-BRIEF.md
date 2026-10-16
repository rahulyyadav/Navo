# Navo real-world release brief

## Implementation brief
Preserve the existing Expo app and its blue, white and lime visual language. Make the primary journey discover → choose destination → plan → inspect route → navigate → save summary understandable to a first-time hiker. Keep the map dominant during navigation, with readable directions and reachable controls. Preserve saved plans and tracking when switching views or losing connectivity. Clearly distinguish downloaded geometry from online terrain maps.

Use actual coordinates, provider routes and dated weather. Treat routing duration as a provider estimate, not a mountain walking guarantee. Show mapped facilities with their source; never invent safe stops, hazards, water safety, closures or rescue coverage. AI should explain supplied evidence, disclose missing information, and never claim to perform an action it did not perform. Support spelling aliases and regional discovery without claiming a complete Nepal trail inventory.

Keep foreground GPS permission explicit. Show accuracy and stale-fix states. Keep pause, finish, route recovery and saved summaries accessible. Respect large text, narrow screens, reduced motion, safe areas and keyboard input. Do not hide failed services behind endless spinners or simulated success.

## This iteration
- Retain full-screen navigation when internet is lost, using saved geometry and fresh GPS rather than returning to the smaller trip page.
- Let users open that full-screen overview while offline or deliberately using the geometry view.
- Keep route directions and trek controls available; hide online layer/follow controls in the static offline overview.
- Label the absence of terrain tiles and online recalculation explicitly.

## Release gates still required
1. **Public backend:** Render readiness timed out after 20 seconds on October 16. Configure and verify the deployed service, its start command and branch. Local provider inference is not evidence of a working public app connection.
2. **Credentials:** provision Firebase Admin and the model key server-side only. Confirm authenticated mobile AI, two-account group creation/invitations/messages, access rejection and account deletion against the deployed environment.
3. **Client configuration:** replace localhost API/chat endpoints; configure public privacy URL and support email. Run `npm run check:release` with the intended release configuration.
4. **Provider capacity:** establish permitted geocoding/routing/tile/weather capacity for the intended audience. Public demo routing/geocoding and free sleeping hosting are preview dependencies, not an availability guarantee. Facility lookup has experienced provider failures.
5. **On-device navigation:** walk a known route on iOS and Android. Check permission denial, poor GPS, stale fixes, offline transitions, off-route recovery, pause/resume, app backgrounding, finish and persisted summary. Current tracking is foreground-only.
6. **Security and notifications:** run Firestore emulator rules tests and cross-account tests. Verify notification delivery and opt-out on physical devices, including group message privacy.
7. **UX acceptance:** test small phones, large system text, screen reader labels, long destination names, keyboard avoidance and slow connections. Verify saved plans survive restart and account switching.
8. **Trail evidence:** field-check sample Kathmandu Valley and Pokhara routes. Mapped paths and generated instructions are not certification of current trail access or safety.

## No-cost initial phase
Use the existing Render Free preview and Firebase no-cost project for a small, explicitly labelled pilot, within their current quotas. Keep AI request budgets and usage monitoring enabled; an API key does not guarantee free inference. Do not enable paid billing automatically. Gather field-test results before opening registration widely. Expand hosting/provider capacity only after a separate cost decision.

## Completion criteria
A release is ready only when the configuration gate, automated checks, deployed integration checks and physical-device acceptance tests all pass. Until then, distribute as a preview and state the remaining limitations. Do not mark blocked external services as completed by changing button text or substituting fabricated data.
