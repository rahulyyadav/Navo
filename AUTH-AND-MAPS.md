# Navo setup and this phase

## Credentials

Put `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…` in `.env.local` in the repository root (next to `package.json`). Use the key from the Clerk application you are configuring. Restart with `npx expo start --clear` after environment changes. `.env.example` has the current template; this app now uses Clerk, not the older Supabase setup.

Only the publishable key is read by app code. A `CLERK_SECRET_KEY` is a server/admin credential and is not needed by the mobile app. Never give a secret key an `EXPO_PUBLIC_` prefix or put it in app.json, source code, or git.

## Clerk settings

In Configure → User & authentication, enable email + email verification code. Phone number, username and password must not be required for this passwordless flow. First/last names are optional. The screenshot's “verified but needs details” problem came from all three additional fields being required. The public application configuration was rechecked on 2026-09-28 and now requires email only.

Google must be enabled as a Clerk social connection. Native OAuth must be tested in a Navo development build with its own application identifiers and `navo` URL scheme, including the redirect URL required by Clerk. Expo Go is not a substitute for a standalone OAuth callback configuration. The installed experimental Clerk Expo SSO helper activates completed sessions itself. Production requires production Clerk/Google configuration; do not ship test keys.

“My Application” and “[Development]” in the screenshot are Clerk application/email branding. Change the application name/email templates in the Clerk dashboard; the mobile UI cannot rename an email that Clerk sends.

## Maps

The app uses Leaflet 1.9.4 with OpenStreetMap standard tiles and an optional OpenTopoMap contour layer. Web uses an iframe; iOS/Android use Expo-compatible react-native-webview. No Google/Baato key is required. Leaflet CDN resources are pinned with integrity hashes. Attribution remains within the map, above the trek detail sheet.

These are online maps. Do not bulk-download or advertise offline storage of OpenStreetMap public tiles. For production scale or true offline packs, choose a provider with suitable service/offline terms or host tiles. Public services offer no availability guarantee. Waypoints in `src/data/treks.ts` are illustrative, not surveyed GPX tracks. Straight connectors were removed to avoid presenting them as walkable trails. Remote trail completeness is not guaranteed.

Baato is worth evaluating for Nepal landmark search/addressing, but its free allowance is metered (5,000 credits/month at review), not unlimited. It was not integrated without a key or verified API contract. Local landmark quality does not establish mountain trail safety or offline coverage.

## Preparation and safety

Preparation is saved per signed-in user and trek on this device, including browser reloads. Save before leaving the screen; changing trek saves the current checklist first. Sharing opens the system share sheet. It does not automatically send a message. GPS requests time out after 20 seconds, report permission/unavailable states, and show recorded time and accuracy.

Group rosters/alerts remain local; they do not synchronize between phones, deliver invitations, notify teammates, or dispatch rescue. The UI now states this. Checklists do not certify a safe trip. Confirm altitude plans, current permits/guide rules, weather and closures with qualified local sources.

## References

- https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp
- https://clerk.com/docs/guides/development/testing/test-emails-and-phones
- https://docs.expo.dev/versions/v57.0.0/sdk/webview/
- https://leafletjs.com/download.html
- https://operations.osmfoundation.org/policies/tiles/
- https://opentopomap.org/about
- https://baato.io/pricing
- https://ntb.gov.np/plan-your-trip/before-you-come/tims-card
- https://dhm.gov.np/
- https://himalayanrescue.org/altitude
