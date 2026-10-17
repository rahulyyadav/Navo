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

## Detailed execution prompt: functional hardening

Work within the existing application, preserving routes, saved data, account boundaries and completed features. Follow each user journey through success, slow network, missing permission, expired authentication, invalid provider data and interrupted execution. Fix the cause of each failure and add a regression check for behavior that could mislead a hiker.

### Search and discovery acceptance
- Initial letters should return matching known landmarks promptly.
- Accept a landmark plus its region in either order, including saved spelling variants: “Shivapuri Kathmandu”, “Dhap dham Kathmandu valley”, “Pokhara Australian camp trek”.
- Require all meaningful search words to match the same place. Do not return Shivapuri as a Pokhara landmark or conflate Pulchowk with Phulchowki.
- Continue remote autocomplete for locations outside the reference catalogue. Offline references are a limited collection, not all Nepal destinations.

### Route acceptance
- Require valid coordinates, matching route endpoints and a leg for every requested stage.
- Missing or invalid turn instructions must be a visible calculation failure, never silently removed from an apparently complete navigation route.
- Keep the selected origin, destination and date available after failure so the user can correct or retry them.
- Preserve the existing distinction between provider estimates and verified hiking information.

### AI and online-service acceptance
- A successful HTTP response with an empty or malformed answer must produce a recoverable error.
- Preserve the user's question after failure. Never replace failed inference with fabricated AI output.
- Expired authentication should direct users to sign in. Rate limits should explain that waiting is required. Server/proxy failures should explain temporary online-service unavailability without exposing HTML or internal credential errors.
- Do not automatically retry group creation or other mutations: a response can fail after the server has already accepted the action.
- Keep model credentials server-side and verify authenticated inference from the deployed mobile build separately from local provider testing.

### Changes implemented in this pass
- Multiword landmark/region search and alias regression coverage.
- Reject missing routing legs, empty directions and invalid step locations or distances.
- Specific session/rate-limit/outage messages, including non-JSON proxy errors.
- Reject empty successful AI responses with a retry message.

These are code improvements, not evidence that the outstanding deployment and physical-device gates above have passed.
