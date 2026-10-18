# Navo map and mobile readiness — 15 October 2026

## Implemented

- Thirteen curated OSM landmark references for Kathmandu Valley, Pokhara and Annapurna, with regional browsing and spelling aliases. General place search remains available; this is not a complete catalogue of Nepal trails.
- Walking route review with terrain/street layers, larger map, whole-route framing, start/end markers, and numbered selectable instructions. Selected instructions now get a visible labelled marker.
- Nearby rest, water, toilet, viewpoint and mapped hazard lookup within 300 metres of the route. Private locations are excluded. Records link to OSM and do not imply live access, drinking-water quality or safety. Provider errors retain the route; 406/429 responses impose a 30-second cooldown. Provider runtime errors are not displayed as an empty successful result.
- Configurable HTTPS Overpass endpoint via EXPO_PUBLIC_OVERPASS_URL. Public instance requests currently fail: primary returned HTTP 406; Private.coffee timed out. No claim of reliable facility delivery until a provider is verified.
- Weather cards use existing Open-Meteo hourly data for the selected date. Forecast horizon remains bounded; distant dates must not receive invented weather.
- Sign-in handoff preserves an explicitly staged walking plan for one hour, isolated after account claiming.
- Shared AI request ceilings cover chat and itinerary requests. Recent-login account deletion queues durable cleanup. Message notifications use generic push text and open group chat.

## Verified and remaining gates

A browser route test returned Budhanilkantha Temple to Shivapuri Peak: 6.05 km, eight instructions. Provider walking time is not a verified mountain hiking duration. Open-Meteo returned hourly data in the 14 October test. These tests do not establish real trail safety, current access or GPS reliability.

Before a public release:
1. Configure Firebase Admin credentials and Nebius credentials on the reachable Render backend, verify /ready and authenticated two-account groups/chat. Never put server keys in EXPO_PUBLIC variables.
2. Configure public support/privacy details and the API URL in the phone build.
3. Deploy Firestore rules/indexes and run emulator security tests (local Java runtime is missing).
4. Enable maintenance only after configuring a random 32+ character MAINTENANCE_TOKEN on the backend and matching NAVO_MAINTENANCE_TOKEN GitHub secret. Set NAVO_API_URL and NAVO_MAINTENANCE_ENABLED=true repository variables. The scheduled workflow is best effort, not a rescue/check-in guarantee.
5. Verify account deletion retries against a disposable account; test message delivery on two physical devices. Test GPS accuracy, off-route behavior, permission denial, backgrounding and reconnecting on iOS and Android.
6. Verify tile/routing/weather/Overpass terms and capacity for the intended commercial use. Free preview services and sleeping hosts are not a production availability guarantee. Do not enable bulk tile downloads against public servers.
7. Field-check priority Nepal trails with knowledgeable local reviewers. Do not fabricate danger areas, rest guarantees, route alternatives or mandatory attractions.

No paid services were enabled. The map renderer remains Leaflet/OpenStreetMap-based terrain tiles; this pass does not claim a MapLibre migration or offline basemap support.
