# REA follow-up: offline data and readiness

17 October 2026. Target: the public JamNepal JavaScript artifacts captured in the preceding audit. No authenticated/private data or competitor code was added to Navo.

## Questions and evidence

- **Does the shipped site contain persistence mechanisms? Answered statically.** Existing REA graph `ev_2a0108f6d634df60ded418a6e2006fe70ba920085a29936a75bba6a568cd05cf` records localStorage reads/writes for preferences, location consent and home base. Representative consent node: `jag_node_145330f6df250db50b6a98a349bd3a52c2b18f159db2809df50857a2719be4e1`. This is syntax evidence, not proof of successful runtime persistence.
- **What is in the offline dependency? Partially answered.** Ran installed REA 6.5.0 against the exact selected module `vendor-offline-DERGHL6x.js`, obtaining evidence `ev_2643f722f34f6318fa5a3aa5a5e1c26048c55d76e2c15a808534bd3d7c308a31`. One JavaScript file parsed, 94,765 bytes; supporting React import unavailable in the supplied snapshot. Semantic coverage reached the 8,000-node ceiling and remains partial. Independent inspection of those same inert bytes found Dexie-related identifiers, IndexedDB configuration, object-store creation and version-change handlers. These support a browser database dependency inference, not a claim that the app has working offline terrain maps.
- **Are region download, offline rerouting and airplane-mode cold start working? Unresolved.** No such runtime scenario was executed. Do not infer these from a bundle filename or database library.
- **What should Navo adopt? Design decision.** Separate saved trip information from navigation-map availability; show snapshot age; reject corrupt nested data; prevent saving before existing storage has loaded. This applies the broader saved-versus-downloaded distinction documented in the competitor report without copying implementation.

## Navo implementation

The offline screen now has an explicit essentials card describing the locally saved snapshot, snapshot freshness, absent offline terrain maps, and online-only services. A reminder appears after 24 hours; this is a refresh policy, not a guarantee of safety or data validity.

`validOfflinePack` checks fields used by rendering: date, trek identity, waypoint coordinates/elevation, roster positions, contact, meetup, checklist and itinerary days. Invalid stored values no longer reach `.toFixed`, `.map` or `.includes` unchecked. New snapshots are also checked before replacement, preserving the previous snapshot on invalid source data or failed writes. Save remains disabled until the initial device read settles.

## Verification and limits

97 client tests passed, including corrupt nested snapshots, wrong trek/version, and invalid/future/stale timestamps. Lint and TypeScript passed; iOS, Android and web exports completed. Browser inspection encountered the normal unauthenticated onboarding gate; authenticated offline-screen rendering was not verified and the gate was not bypassed. No native offline map downloader, routing graph or background GPS was introduced. Navo's documented deployment and physical-device release gates still apply.
