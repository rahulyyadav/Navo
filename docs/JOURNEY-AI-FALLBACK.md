# Journey AI fallback

Set `OPENROUTER_API_KEY` in `backend/.env` (server only). Restart the backend after changing environment values. The default fallback model is `nvidia/nemotron-3.5-super-vl:free`; override with `OPENROUTER_MODEL`.

Journey research normally uses Nebius/Nemotron. Reaching its local daily allowance selects OpenRouter instead. A Nebius HTTP 402/429 also allows one OpenRouter attempt. Authentication failures, malformed output, search failures and geocoding errors do not trigger model fallback. Responses still pass the same itinerary/source validation.

OpenRouter has separate persistent limits: `OPENROUTER_DAILY_REQUESTS=100` globally and `OPENROUTER_USER_DAILY_REQUESTS=10` per user, using UTC days. The AI pause switch, minute rate limit and destination research limit still apply. Failed provider attempts consume their reserved allowance. Existing general chat and legacy planner flows are unchanged.

Watch server logs for `stage=provider_selection` and `AI provider=openrouter`. No API keys or provider response bodies are logged. A successful model response alone does not establish successful journey creation: search, checkpoint geocoding, itinerary validation and origin routing must also succeed.

Structured output request format follows https://openrouter.ai/docs/guides/features/structured-outputs.

## Journey web search

Set `JOURNEY_SEARCH_KEY` in `backend/.env` to enable Brave Search as the structured primary search provider. Keep it server-side. Without a key, Navo uses DuckDuckGo HTML/lite and Wikipedia API fallbacks. Searches are split into short destination, gateway/transport, and current-access queries; current access claims still require dated, segment-specific evidence. A missing provider key or unavailable search service must be visible in `search_configuration` and `search_provider` logs, and must never be interpreted as an open road or a verified transport option.

## Diagnostics and deadlines

Every backend request logs a generated request ID, method, matched route template, response status and elapsed milliseconds. Route parameters, query strings, request bodies, authorization headers and raw model/reasoning output are excluded. Journey stages additionally share the public itinerary cache ID.

Model requests log response headers/status, received byte count, validated token usage, and a waiting heartbeat every 10 seconds. Each model attempt has a hard 90-second wall-clock deadline as well as connection/read timeouts. OpenRouter reasoning is disabled for this structured extraction task. The total research deadline is 210 seconds, below the existing 240-second cache lease and client polling deadline. Invalid checkpoint/leg structure or citations may receive one correction request, charged against the selected provider allowance, with the same validation applied again. There are no unlimited retries.
