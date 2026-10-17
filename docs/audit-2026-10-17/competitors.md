# Competitor evidence and Navo gap matrix

Reviewed 17 October 2026. Documentation describes intended behavior; it is not a field test. No competitor mobile binaries, paid accounts or device sessions were supplied. No proprietary code or assets were incorporated into Navo.

| Product / evidence | Useful pattern | Navo comparison and next action |
|---|---|---|
| [AllTrails offline troubleshooting](https://support.alltrails.com/hc/en-gb/articles/37214062033172-Why-can-t-I-view-my-map-when-I-m-offline) distinguishes synced from downloaded maps | Explicit local availability and storage feedback | Navo saves route geometry, not a map pack. Separate these statuses instead of one “offline ready” claim |
| [Komoot offline downloads](https://support.komoot.com/hc/en-us/articles/360024969212-Region-not-available-for-download) and [saved-route navigation](https://support.komoot.com/hc/articles/10207935661338) document downloaded routes and pause/resume | Deliberate preparation, clear navigation lifecycle | Navo has pause/recovery in code; expose essential lifecycle controls directly on the full map and verify native interruption behavior |
| [Gaia route-area downloads](https://help.gaiagps.com/hc/en-us/articles/115003524987-Download-Maps-for-a-Track-Route-or-Area-in-Android) documents a route corridor and resolution/source choices | Download the useful area with explicit data choices | Navo needs a licensed source, size/quota and cancellable/resumable download design before implementing this |
| [Gaia Guide Me](https://help.gaiagps.com/hc/en-us/articles/1500011258802-Guide-Me-Turn-by-Turn-Directions-for-Driving-Cycling-and-Hiking-Routes-in-the-Android-App) documents next-turn, direction list and offline limitations | Separate following an existing route from creating new directions | Navo must distinguish saved line following from online recalculation; add distance to upcoming maneuver |
| [Wikiloc route downloads](https://help.wikiloc.com/article/520-how-to-download-trails-from-the-web) documents GPX/TCX and waypoint export | Portable user-owned tracks | Navo already imports/exports GPX; retain provenance and distinguish imported track geometry from provider instructions |
| [Organic Maps](https://organicmaps.app/) advertises offline maps, search and navigation using OSM | Region-based offline independence | This is a product claim, not verified here. Navo currently lacks local routing data and region packs; changing renderer alone cannot create parity |
| [JamNepal public site](https://www.jamnepal.com/) observed in browser | Nepal destination cards, interest/day/budget planner, optional nearby-location prompt | Relevant discovery structure; do not import its ratings, generated plans or photographs as verified trail facts |

## JamNepal observation and artifact evidence

The public homepage exposed destination cards for Kathmandu Valley, Pokhara, Everest, Chitwan, Annapurna and Lumbini, an onboarding question with Skip, and planner choices for interests, duration, difficulty and budget. Location was an explicit action. No location permission was granted and no account or AI generation was exercised. Offline/PWA claims were not tested. A transitional screenshot was rejected rather than used as visual proof.

Three script URLs were observed from the loaded page and analyzed as inert text with REA:

- `https://www.jamnepal.com/assets/index-CSh9xywv.js`
- `https://www.jamnepal.com/assets/vendor-offline-DERGHL6x.js`
- `https://www.jamnepal.com/assets/vendor-maps-BOh8k5PU.js`

REA parsed three files with no parse failures, but reports incomplete graph coverage. Bundle filenames and static references do **not** prove functional offline downloads, real routing, persistence quality or runtime behavior. Only metadata/hashes/limitations are committed in [artifact-evidence.json](artifact-evidence.json); downloaded competitor source remains outside the repository.

Navo's previously exported web artifact was separately analyzed. Its large entry bundle exceeded the semantic worker heap, so its semantic graph is explicitly incomplete. This is not native binary reverse engineering and does not establish iOS/Android behavior. Source inspection remains the primary implementation evidence for Navo.

## Synthesis

Prioritize a trustworthy small feature set: discover a destination, verify the start, review provider-backed geometry and limitations, save preparation, show a clear full-screen route, pause/recover correctly, and finish with retained history. Offline coverage, unknown GPS progress, provider errors and unavailable dates need explicit states. Competitor feature lists are not justification for fabricated safety information or a broad rewrite.
