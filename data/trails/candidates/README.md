# Annapurna Base Camp source candidate

Retrieved 6 October 2026 from the official OpenStreetMap API. This folder is research data, **not imported into the app or approved for navigation**.

## Source and reuse

- [Annapurna Base Camp Trek, relation 17548991](https://www.openstreetmap.org/relation/17548991), version 3, last modified 18 November 2025.
- [Original XML download](https://www.openstreetmap.org/api/0.6/relation/17548991/full), preserved as `annapurna-base-camp-17548991.osm`.
- Data attribution: **© OpenStreetMap contributors**. Data is available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); see [OSM copyright and licence guidance](https://www.openstreetmap.org/copyright). Preserve attribution and licence notices when distributing these files. Adapted databases must comply with the licence's share-alike requirements. Navo's code licence does not replace the data licence.
- [OSM Nepal mapping project](https://wiki.openstreetmap.org/wiki/WikiProject_Nepal#Treks) identifies this ABC relation and describes incomplete relation coverage requiring verification.

## Audit result

The snapshot contains 56 ways and 1,696 nodes. The ways form two connected components (53 and 3 ways), separated by at least **203.6 metres**. Total source-way length is **23.90 km**, not a certified itinerary distance. None of these nodes includes an elevation sample.

`annapurna-base-camp-candidate.gpx` preserves each source way as a separate track segment. It does not invent a bridge across the gap, choose travel direction, merge branches or add elevations. `annapurna-base-camp-audit.json` records provenance, checksum and metrics. The GPX is usable for inspecting mapped trail geometry, but it is **not a continuous verified ABC itinerary**.

## Required before navigation use

1. Choose the actual approach/start and return itinerary. The existing Navo preview includes Nayapul/Ghorepani, while this source covers another, smaller geographic extent; do not silently substitute it.
2. Review way ordering, intersections and direction; resolve the disconnected section using independently validated trail geometry, without straight-line interpolation.
3. Confirm coverage to ABC and all intended approach/return checkpoints with a current local guide or recorded field track. A continuous map line alone does not establish trail safety or current accessibility.
4. Add an appropriately licensed elevation profile/DEM and document its resolution and uncertainty.
5. Validate route matching on a device with representative GPS noise, forks and out-and-back sections. Mark the approved route with version, review date and source attribution.

The [Great Himalaya Trail GPS page](https://www.greathimalayatrail.com/guides-maps-and-gps/) is a possible supplementary source, but availability of a personal download does not establish permission to redistribute a track inside Navo. No purchase or contact was made.
