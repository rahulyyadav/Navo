# Navo setup and this phase

## Credentials

Copy `.env.example` to `.env` in the repository root and fill in the Firebase web-app configuration plus the three Google OAuth client IDs. Restart with `npx expo start --clear` after environment changes.

The `EXPO_PUBLIC_FIREBASE_*` values identify the Firebase client app and are designed to be bundled. Security comes from Firebase Authentication and Firebase Security Rules, not from hiding this config. Never place a Firebase Admin SDK service-account JSON, private key, OAuth client secret, or other server credential in `.env`, app.json, source code, or Git.

## Firebase Authentication settings

In Firebase Console → Authentication → Sign-in method, enable **Email/Password** and **Google**. Add `localhost` plus every deployed web hostname under Authentication → Settings → Authorized domains. The app uses Firebase's auth-state observer and persists native sessions with AsyncStorage.

Create OAuth clients in Google Cloud for web, iOS, and Android, then place the web/iOS IDs in the matching `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` variables. The native application identifiers are `com.rahulyadav.navo`; the Android OAuth client also needs the signing certificate SHA-1. The native Google SDK uses the reversed iOS client-ID scheme configured by `app.config.ts`; Android requires the matching signing certificate. Google sign-in on native must be tested in a Navo development build; Expo Go is not a production OAuth callback environment.

Email/password signup signs the user in immediately and sends a verification email. Cloud invitations use only verified email addresses; after verification, sign in again or retry the cloud connection. Password reset uses Firebase's email template, which can be branded under Authentication → Templates. Enable email-enumeration protection and set a password policy before production.

## Maps

The app uses Leaflet 1.9.4 with OpenStreetMap standard tiles and an optional OpenTopoMap contour layer. Web uses an iframe; iOS/Android use Expo-compatible react-native-webview. No Google/Baato key is required. Leaflet CDN resources are pinned with integrity hashes. Attribution remains within the map, above the trek detail sheet.

These are online maps. Do not bulk-download or advertise offline storage of OpenStreetMap public tiles. For production scale or true offline packs, choose a provider with suitable service/offline terms or host tiles. Public services offer no availability guarantee. Waypoints in `src/data/treks.ts` are illustrative, not surveyed GPX tracks. Dashed approximate connections are explicitly labelled as illustrative geometry, not verified walkable trails. Remote trail completeness is not guaranteed.

Baato is worth evaluating for Nepal landmark search/addressing, but its free allowance is metered (5,000 credits/month at review), not unlimited. It was not integrated without a key or verified API contract. Local landmark quality does not establish mountain trail safety or offline coverage.

## Preparation and safety

Preparation decisions are saved per signed-in user and trek in a durable local outbox and synchronized to the account database when configured. The preparation screen keeps its selected trek fixed; open another route to prepare a different trek. Date and notes use the explicit Save details action. Sharing opens the system share sheet. It does not automatically send a message. GPS requests time out after 20 seconds, report permission/unavailable states, and show recorded time and accuracy.

Group rosters, invitations, messages and alerts now use the authenticated FastAPI backend and Firestore listeners. They require configured server credentials, deployed rules/indexes and connectivity. Push and overdue notices additionally require scheduled workers. They do not dispatch rescue. See `docs/PRODUCTION-SETUP.md` for configuration and remaining verification. Checklists do not certify a safe trip. Confirm altitude plans, current permits/guide rules, weather and closures with qualified local sources.

## References

- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://docs.expo.dev/guides/authentication/
- https://docs.expo.dev/versions/v57.0.0/sdk/webview/
- https://leafletjs.com/download.html
- https://operations.osmfoundation.org/policies/tiles/
- https://opentopomap.org/about
- https://baato.io/pricing
- https://ntb.gov.np/plan-your-trip/before-you-come/tims-card
- https://dhm.gov.np/
- https://himalayanrescue.org/altitude
