# Navo Nemotron integration

Navo uses `nvidia/nemotron-3-super-120b-a12b` at `https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions`. The backend `/chat` sends conversation history plus the existing Navo trekking system prompt and returns only the assistant reply. The supplied Chat Completions API fits this existing flow; a second Responses implementation is unnecessary.

The API key stays in the untracked `backend/.env` as `NEBIUS_API_KEY`. The pre-existing `Nebius_Token_Factory_API_KEY` setting was renamed so the backend can load it. `NEBIUS_MODEL` is set to the exact supplied model; it is also the server default and the model used by the existing itinerary generator. Settings now load backend/.env regardless of the shell's working directory.

On 6 October 2026, a live request through the actual chat service successfully returned a Navo introduction. No private user messages or locations were sent in the test. Automated tests cover the app request payload, history validation, exact provider model/prompt construction and sanitizing provider failures. The itinerary generator's structured-output flow was not live-tested in this change.

The AI tab remains available only in the app's signed-in routes and checks the locally loaded signed-in state. At the owner's explicit request, `/chat` no longer verifies a Firebase token or uses Firebase Admin. Requests include the loaded profile email (falling back to the loaded account email) as optional client-provided metadata. This email is not an authenticated identity, is not stored as an account record, and is not sent to Nemotron in its prompt.

The client-side gate does not authenticate direct API callers: anyone who can reach this development chat endpoint can submit requests. The Nebius secret remains server-only. Firebase verification and revocation checking still apply to profile, groups, preparation and other protected endpoints.

A running reachable backend and Nebius configuration are enough for chat. A physical phone must use the Mac's LAN address rather than localhost.

## Physical-phone connection repair — 6 October 2026

The local app URL was changed from localhost to the Mac's current LAN address, and the authenticated API was started on port 8000 at that address. `/health` responds over the LAN interface. The backend project ID now matches the configured Firebase client project. A diagnostic request with a dummy token confirms the remaining blocker is missing Firebase Admin credentials (HTTP 503), not a provider failure. Authentication and revocation checking remain enabled.

After editing the app .env, fully Reload Expo Go/development client to use the updated URL. The phone must be on the same reachable network as the Mac. The LAN address may change when networks change; do not use this development address for a production build. Backend startup remains documented in README.md.

Network, token-refresh and malformed-server-response errors now use clear messages without displaying native Swift exception internals. The original chat draft remains available for retry.


## Chat access update — 6 October 2026

Firebase verification was removed from `/chat` only. The previous credential error described above no longer blocks chat. Signed-in UI access and optional profile-email metadata are handled by the app. The request no longer refreshes or sends a Firebase ID token. Protected database routes still require Firebase Admin configuration.
