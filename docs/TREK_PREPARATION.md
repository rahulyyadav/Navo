# Swipe preparation

Updated 6 October 2026. The selected trek is fixed from the route parameter; changing treks requires leaving and opening another trek. Missing/unknown route parameters offer a return to trek discovery.

## Interaction

The page uses the home screen's blue gradient, translucent blue cards, Satoshi typography and lime accents. No photograph is rendered. A stacked card deck shows one essential at a time. Swipe right or tap Prepared; swipe left or tap Not yet. Horizontal gestures leave vertical scrolling available; short drags spring back. Reduced motion skips the card exit animation. Undo restores the previous decision and card. All items and the final overview let users revisit choices.

`checked` contains prepared item IDs. `reviewed` contains both prepared and explicitly not-prepared item IDs. Unreviewed is distinct from not-prepared. Old local checklists migrate by adding their checked items to reviewed.

Departure date and notes remain available under Details. Save details validates a real YYYY-MM-DD date. The compact Share action uses the native system share sheet with trek, date, prepared items, not-yet items, remaining review count and saved notes. No automatic friend/group message is sent. Start trek and permit/weather/altitude resources remain available.

## Persistence

Authenticated `GET /preparations/{trekId}` and `PUT /preparations/{trekId}` store the checklist at `users/{verifiedFirebaseUid}/preparations/{trekId}`. The backend derives the owner from the Firebase ID token; the request cannot choose another owner. It validates the route, allowed essential IDs, lengths, calendar date and checked/reviewed consistency. Firestore client writes remain disabled; these mutations use the existing trusted backend.

Every decision and undo updates a local outbox immediately and schedules a serialized cloud write. Later choices cannot be acknowledged by an older response. Saved to account appears only after server acknowledgement and local cache persistence. Failed writes remain pending and can be retried or retried on reopening. When the initial account read fails and no cache exists, editing is disabled to avoid replacing an unknown remote checklist with an empty one.

Preparation sync currently uses the last saved snapshot; concurrent edits across devices are not merged. Sharing is a plain text snapshot, not a collaborative checklist.

## Local setup limitation

At verification, `EXPO_PUBLIC_API_BASE_URL` pointed to localhost:8000, with no backend listening. Backend settings reported no configured Firebase project/Admin credentials; dotenv also reported malformed initial lines. No secret values were printed or changed. Supply valid server credentials through the existing backend setup and run the API to enable real account saves. A physical phone also needs an API URL reachable from that phone; localhost addresses the phone itself.

## Validation

- Frontend tests cover distinct decisions, undo, share content, migration, durable pending writes, retry, rapid choices and preventing empty writes after a failed remote read.
- Backend tests cover authentication, schema validation, owner/trek isolation and storage roundtrip using a mocked database.
- Phone-sized isolated preview verifies both swipe directions, tap alternatives, undo, review list, date validation and local reopening. It uses test-only local storage and deliberately displays Sync pending; it does not claim a live Firestore save.
- Lint, typecheck and iOS/Android/web exports are required. Actual Firestore writes and physical-device behaviour require the running configured backend and device testing.
