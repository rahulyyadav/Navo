# Navo UI/UX plan

## Visual direction

Navo should feel like a quiet, capable expedition companion: cinematic but restrained, premium without looking like a booking app, and serious about uncertainty.

The first onboarding reference translates into these reusable rules:

- Full-bleed, location-led imagery with generous negative space
- White typography over cool, low-contrast mountain scenes
- One warm environmental accent rather than a bright UI palette
- Short headlines with editorial line breaks
- Lightweight route/path motifs used sparingly
- One dominant circular action in the thumb zone
- Translucent secondary controls that do not compete with the main action

## Onboarding flow

### 01 - Discover

**Message:** Find your path. Your journey begins here.

Establish emotion and explain that Navo converts natural-language constraints into a route-linked plan.

### 02 - Verify

**Message:** A plan that shows its work.

Introduce the plan audit: route continuity, workload, elevation change, sources, and warnings. Avoid claiming that AI guarantees safety.

### 03 - Carry

**Message:** Prepared beyond the last signal.

Explain what the offline pack stores and distinguish offline GPS/information from actual communication capability.

## Interaction rules

- Primary circular button advances one screen; its position stays stable across all slides.
- Back is disabled on slide 1 and enabled afterward.
- Skip enters the main trip-planning experience.
- Progress is always visible as both `01 / 03` and a compact progress track.
- Motion should be subtle: 250-350 ms fade/translate, no parallax that harms readability or battery life.
- Respect Reduce Motion and screen-reader settings.

## Copy rules

- Human, compact, and concrete
- Never say "safest route," "guaranteed," "live" without verified capability, or "rescue dispatched"
- Separate what is stored offline from what requires connectivity
- Label demonstration or stale data visibly

## Next implementation pass

1. Add slides 2 and 3 with shared reusable layout.
2. Persist onboarding completion locally.
3. Add custom typography and test Dynamic Type.
4. Validate contrast against every background crop on small and large phones.
5. Replace symbolic route/plane marks with a small project-native vector icon set.
6. Test VoiceOver/TalkBack labels, Reduce Motion, and one-handed reach.
