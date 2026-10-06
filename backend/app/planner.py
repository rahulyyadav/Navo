import json
from pathlib import Path
import hashlib
import math
from datetime import datetime, timezone
from time import perf_counter
from .token_factory import complete, Completion
from fastapi import HTTPException
from pydantic import ValidationError
from .config import settings
from .schemas import Itinerary, PlanRequest

SYSTEM_PROMPT = (Path(__file__).parent / 'planner-system-prompt.txt').read_text().strip()

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
    coordinates = {point['name']: point for point in route['route']}
    places = {point['name']: point['elevation'] for point in route['route']}
    if plan.days[0].start != route['route'][0]['name']:
        issues.append('The itinerary must start at the route trailhead.')
    if plan.days[-1].end != route['route'][0]['name']:
        issues.append('The itinerary must include return travel to the trailhead.')
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
        start, end = coordinates.get(day.start, {}), coordinates.get(day.end, {})
        if all(key in point for point in (start, end) for key in ('latitude', 'longitude')):
            lat1, lat2 = math.radians(start['latitude']), math.radians(end['latitude'])
            dlat = lat2 - lat1
            dlon = math.radians(end['longitude'] - start['longitude'])
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            direct_km = 6371 * 2 * math.asin(math.sqrt(min(1, max(0, a))))
            # Conservative tolerance because supplied coordinates are approximate.
            if day.distanceKm + 0.5 < direct_km:
                issues.append(f'Day {day.day}: distance is shorter than the approximate straight-line separation of its stops; verify the estimate.')
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
    live = call is None
    started = perf_counter()
    if call is None:
        async def call(messages):
            return await complete(messages, Itinerary.model_json_schema())
    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}, {'role': 'user', 'content': json.dumps({'preferences': request.model_dump(), 'route': route, 'schema': Itinerary.model_json_schema()})}]
    history = []
    final = None
    measured = []
    previous_days = {}
    for attempt in range(3):
        try:
            response = await call(messages)
            if isinstance(response, Completion):
                raw = response.content
                measured.append({'model': response.model, 'elapsedMs': response.elapsed_ms,
                                 'promptTokens': response.prompt_tokens, 'completionTokens': response.completion_tokens})
            else:
                raw = response
            final = Itinerary.model_validate_json(raw)
            if attempt == 0 and request.demonstrateRepair:
                final.days[0].ascentM = request.maxDailyAscent + 500
                raw = final.model_dump_json()
            issues = audit(final, request, route)
        except (ValidationError, ValueError, KeyError):
            issues = ['Model output did not match the itinerary schema.']
            raw = ''
            final = None
        current_days = {day.day: day.model_dump() for day in final.days} if final else {}
        changed_days = [number for number, day in current_days.items() if previous_days and previous_days.get(number) != day]
        previous_days = current_days
        history.append({'changedDays': changed_days, 'step': 'draft' if attempt == 0 else 'repair', 'issues': issues, 'schemaValid': final is not None, 'simulatedFault': bool(attempt == 0 and request.demonstrateRepair)})
        if not issues:
            break
        messages.extend([{'role': 'assistant', 'content': raw[:30000]}, {'role': 'user', 'content': json.dumps({'repair': issues, 'instruction': 'Correct these issues. Preserve the requested route and duration. Return the complete itinerary JSON.'})}])
    evidence = {'provider': 'Nebius Token Factory' if live else 'Test adapter',
                'liveInference': live, 'generatedAt': datetime.now(timezone.utc).isoformat(),
                'elapsedMs': round((perf_counter() - started) * 1000), 'attempts': len(history),
                'promptSha256': hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest(),
                'routeSha256': hashlib.sha256(json.dumps(route, sort_keys=True).encode()).hexdigest(),
                'validatorVersion': 'navo-route-audit-v2', 'calls': measured,
                'initialIssueCount': len(history[0]['issues']), 'finalIssueCount': len(history[-1]['issues'])}
    return {'evidence': evidence, 'itinerary': final.model_dump() if final else None, 'audit': history, 'status': 'rejected' if history[-1]['issues'] else 'review_required', 'model': config.nebius_model, 'routeVerified': False, 'limitations': ['Curated waypoints are approximate; no verified trail distances are available.', 'Passing automated thresholds is not a safety certification. A qualified guide must review this itinerary.']}
