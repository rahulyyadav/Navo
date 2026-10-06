# Group and day-hike phase validation — 3 October 2026

## Verified locally

- TypeScript and Expo lint pass.
- 20 client tests pass, including Nepal date rollover, encoded directions, finish-time calculation, invalid dates, forecast horizon and incomplete weather responses.
- 36 backend tests pass, including link ownership/approval, replay, expiry/rotation/revocation, declined-request suppression, capacity, custom meeting plans, position authorization/ordering and conservative proximity filtering.
- Production JavaScript/assets export succeeds for iOS, Android and web. This is not a signed native build or a physical-device test.
- Public Open-Meteo request for the approximate Godawari trailhead returned daily forecast data and Asia/Kathmandu timestamps for October 3–4. The in-app weather button also displayed the live response in a phone-width browser preview.
- Discover inspected at 390×844 using copied source in an isolated temporary UI fixture, with a synthetic profile and no backend credentials. Photographs render, inbox no longer stretches and all tab labels fit. This fixture does not test authentication or a live group.
- Local Firestore emulator run could not start because Java is absent. The repository CI has Java 21 and runs the rule suite, including leader-only join-request access and server-only invitation storage.

## Runtime checks still required

- Configure and deploy backend Firebase credentials and EXPO_PUBLIC_API_BASE_URL, then exercise invitation approval and location/alerts with two real accounts on separate devices.
- Deploy updated rules/indexes and operate push/check-in workers. A queued alert does not prove notification delivery, audible playback or a response.
- Build the native app for Google OAuth, GPS, permission denial, background/lock transitions, notification taps and audio-volume testing. No microphone permission is needed for alert playback.
- Share links use the installed app scheme unless EXPO_PUBLIC_INVITE_BASE_URL points to a deployed Navo web app. Universal/app link association and app-install fallback require the actual hosting domain.
- Day-hike road/transit routing opens Google Maps. Navo does not yet calculate live traffic ETA, bus services or a verified hiking path internally. The user enters the checked approach ETA; walking hours are an editable planning allowance.
- Forecast is for the selected approximate trailhead, not the summit. Free Open-Meteo API access is for noncommercial use; confirm commercial access/provider terms before a commercial release. Future dates beyond 16 forecast days show unavailable.
- Nemotron can be connected later using the existing backend adapter and the product brief. It must not replace live data or authorization checks.

## Evidence files

Local, ignored screenshots live in `output/audit/`. No real user accounts, precise user location, invitation tokens or credentials are included in published evidence.
