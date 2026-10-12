# Implementation brief: hiking discovery and reachable services

Preserve Navo's existing authentication, Home layout, local data and group security. Resolve the phone failures using real data rather than simulated success.

1. Search: distinguish Phulchowki/Phulchoki/Pulchowki hill from Pulchowk neighbourhood. Add a sourced OpenStreetMap peak reference, spelling aliases and trekking-intent normalization. Merge it with live global results; preserve cancellation and show sourced references when the search provider is unavailable. Never invent a route from a place name.
2. Maps: focus the map on Kathmandu Valley initially, surface place search and a direct planning action, and make terrain/contour and street layers obvious. Support a production outdoor tile provider. Retain real routed geometry, explicit approximate catalogue waypoints, GPS confidence and offline route sketch. Offer route export and external published map references. Do not copy an operator's copyrighted paper map without a reuse license, or present old published maps as current guidance.
3. Photos: replace three crops of the same photograph with genuinely distinct attributed photographs per trek; show only available photographs. Bundle licensed images to avoid remote-load dependency. Use the actual selected photo for hero/thumbnail and link its author/source/license.
4. AI: keep Nebius credentials server-only. Detect phone-inaccessible localhost endpoints before submitting, preserve user messages, and show a truthful setup error. Validate a live reply on the connected endpoint. Missing service connectivity must not be described as a bad API key.
5. Shared groups: deploy the existing authenticated backend with Firebase service identity, rules and indexes. Verify two-account creation/invite acceptance and membership rules. Until reachable, offer useful personal preparation instead of a disabled-only dead end. Never claim a local group is shared.
6. Verification: run client/backend tests, lint, typecheck, Expo Doctor and exports; exercise the actual public search/planner/AI UI. Document native and deployed-service checks still outstanding. Do not equate passing tests with public launch readiness.

Deployment input currently supplied: an account email. Hosting provider/project confirmation and service credentials/identity access still need resolution. An email alone is not a deployment target.
