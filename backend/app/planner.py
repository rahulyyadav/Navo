import json
from pathlib import Path
import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from .config import settings
from .schemas import Itinerary, PlanRequest

ROUTES = json.loads((Path(__file__).parent / 'routes.json').read_text())

def route_by_id(identifier):
    route = next((r for r in ROUTES if r['id'] == identifier), None)
    if not route:
        raise HTTPException(404, 'Trek not found.')
    return route

def audit(plan: Itinerary, request: PlanRequest, route: dict) -> list[str]:
    issues = []
    if len(plan.days) != request.days:
        issues.append('Trip duration does not match the requested number of days.')
    places = {point['name']: point['elevation'] for point in route['route']}
    previous = None
    since_rest = 0
    for index, day in enumerate(plan.days):
        if day.day != index + 1:
            issues.append('Days must be consecutive and start at one.')
        if day.start not in places or day.end not in places:
            issues.append(f'Day {day.day}: stop is not in the curated route.')
        if previous and day.start != previous.end:
            issues.append(f'Day {day.day}: route is discontinuous.')
        if day.end in places and abs(day.sleepingElevationM - places[day.end]) > 100:
            issues.append(f'Day {day.day}: elevation does not match the route stop.')
        if day.ascentM > request.maxDailyAscent:
            issues.append(f'Day {day.day}: ascent {day.ascentM} m exceeds {request.maxDailyAscent} m.')
        if day.distanceKm > request.maxDailyDistance:
            issues.append(f'Day {day.day}: distance exceeds the configured limit.')
        if day.rest and (day.start != day.end or day.ascentM != 0):
            issues.append(f'Day {day.day}: rest day must stay at the same stop without ascent.')
        if day.start in places and day.end in places and day.ascentM < max(0, places[day.end] - places[day.start]):
            issues.append(f'Day {day.day}: ascent is inconsistent with stop elevations.')
        baseline = previous.sleepingElevationM if previous else places.get(day.start, 0)
        if day.sleepingElevationM > 3000 and day.sleepingElevationM - baseline > 500:
            issues.append(f'Day {day.day}: sleeping altitude gain above 3,000 m exceeds the configured 500 m review threshold.')
        since_rest = 0 if day.rest else since_rest + 1
        if day.sleepingElevationM > 3000 and since_rest > 3:
            issues.append(f'Day {day.day}: add an acclimatisation/rest day.')
        previous = day
    if request.experience == 'first-timer' and route['difficulty'] == 'Strenuous':
        issues.append('Strenuous high-altitude route requires review with a qualified guide for a first-time trekker.')
    if not any(day.end == route['route'][-1]['name'] for day in plan.days):
        issues.append('The itinerary does not reach the requested destination.')
    return list(dict.fromkeys(issues))

async def generate(request: PlanRequest, call=None):
    config = settings()
    route = route_by_id(request.trekId)
    if call is None:
        if not config.nebius_api_key or not config.nebius_model or 'nemotron' not in config.nebius_model.lower():
            raise HTTPException(503, 'Configure a Nebius API key and the exact Nemotron model ID on the server.')
        if config.nebius_base_url.rstrip('/') != 'https://api.tokenfactory.nebius.com/v1':
            raise HTTPException(503, 'Use the documented Nebius Token Factory endpoint.')
        async def call(messages):
            async with httpx.AsyncClient(timeout=65) as client:
                response = await client.post(f'{config.nebius_base_url.rstrip("/")}/chat/completions', headers={'Authorization': f'Bearer {config.nebius_api_key}'}, json={'model': config.nebius_model, 'messages': messages, 'temperature': 0.2, 'max_tokens': 6000, 'response_format': {'type': 'json_schema', 'json_schema': {'name': 'trek_plan', 'schema': Itinerary.model_json_schema()}}})
                if response.status_code != 200:
                    raise HTTPException(502, 'Nemotron could not generate a plan. Check the server model configuration and retry.')
                return response.json()['choices'][0]['message']['content']
    messages = [{'role': 'system', 'content': 'You are Navo, a Nepal trek planning assistant. Return only JSON matching the provided schema. Use only supplied route stops. Do not invent verified distances, permits, weather, accommodation or safety guarantees. Include return travel, rest and acclimatisation. A request may be impossible; never hide a conflict. Do not reveal private chain-of-thought. Explain decisions concisely.'}, {'role': 'user', 'content': json.dumps({'preferences': request.model_dump(), 'route': route, 'schema': Itinerary.model_json_schema()})}]
    history = []
    final = None
    for attempt in range(3):
        try:
            raw = await call(messages)
            final = Itinerary.model_validate_json(raw)
            issues = audit(final, request, route)
        except (ValidationError, ValueError, KeyError):
            issues = ['Model output did not match the itinerary schema.']
            raw = ''
            final = None
        history.append({'step': 'draft' if attempt == 0 else 'repair', 'issues': issues, 'schemaValid': final is not None})
        if not issues:
            break
        messages.extend([{'role': 'assistant', 'content': raw[:30000]}, {'role': 'user', 'content': json.dumps({'repair': issues, 'instruction': 'Correct these issues. Preserve the requested route and duration. Return the complete itinerary JSON.'})}])
    return {'itinerary': final.model_dump() if final else None, 'audit': history, 'status': 'rejected' if history[-1]['issues'] else 'review_required', 'model': config.nebius_model, 'routeVerified': False, 'limitations': ['Curated waypoints are approximate; no verified trail distances are available.', 'Passing automated thresholds is not a safety certification. A qualified guide must review this itinerary.']}
