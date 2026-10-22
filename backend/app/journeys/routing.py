import math
from datetime import datetime, timezone
import httpx
from fastapi import HTTPException
from .models import Point, Leg, Option, Source

ROUTER = 'https://routing.openstreetmap.de/routed-car/route/v1/driving'

def metres(a, b):
    lat = math.radians((a.latitude + b.latitude) / 2)
    return math.hypot((a.latitude-b.latitude)*111195, (a.longitude-b.longitude)*111195*math.cos(lat))


def _geometry_point(coordinate, label):
    if not isinstance(coordinate, (list, tuple)) or len(coordinate) < 2:
        raise ValueError(f'Invalid {label} geometry point')
    longitude, latitude = float(coordinate[0]), float(coordinate[1])
    if not math.isfinite(latitude) or not math.isfinite(longitude):
        raise ValueError(f'Invalid {label} geometry point')
    return Point(id=f'{label}-endpoint', name=label, longitude=longitude, latitude=latitude)

async def road_leg(client, start, end, identifier):
    query = f'{start.longitude},{start.latitude};{end.longitude},{end.latitude}'
    response = await client.get(f'{ROUTER}/{query}', params={'overview': 'simplified', 'geometries': 'geojson', 'steps': 'false'})
    response.raise_for_status()
    value = response.json()
    if value.get('code') != 'Ok' or not value.get('routes'):
        raise HTTPException(422, 'No road approach was found from this starting point. Choose a reachable gateway or starting city.')
    waypoints = value.get('waypoints', [])
    if len(waypoints) != 2 or any(w.get('distance', 99999) > 1000 for w in waypoints):
        raise HTTPException(422, 'Your start is too far from a mapped road. Choose a nearby accessible starting point.')
    route = value['routes'][0]
    coordinates = route.get('geometry', {}).get('coordinates', [])
    if len(coordinates) < 2 or len(coordinates) > 10000: raise ValueError('Invalid road geometry')
    if metres(_geometry_point(coordinates[0], 'route start'), start) > 1200 or metres(_geometry_point(coordinates[-1], 'route end'), end) > 1200:
        raise HTTPException(422, 'The mapped path does not connect both journey checkpoints.')
    duration = route.get('duration')
    if not isinstance(duration, (float, int)) or not math.isfinite(duration) or duration <= 0: raise ValueError('Invalid duration')
    return Leg(id=identifier, start=start, end=end, selected='taxi', geometryKind='road',
        geometry=[Point(id=str(i), name='Road', longitude=c[0], latitude=c[1]) for i,c in enumerate(coordinates)],
        options=[Option(id='taxi', mode='taxi', label='Taxi / private road transfer', minutes=max(1, round(duration/60)),
            note='Road-provider estimate; arrange a vehicle and confirm access. Stops and traffic can add time.', sourceIds=['road-router'])])

async def approach(template, origin):
    gateway = template.legs[0].start
    if origin == gateway:
        return {'legs': [], 'sources': []}
    if gateway.coordinatesApproximate:
        # Research can intentionally produce a named schematic gateway when a
        # map provider cannot safely identify the checkpoint. Do not turn its
        # placeholder coordinates into a false road route from the user's start.
        # Keep the user's departure point in the journey even when the gateway
        # only has schematic coordinates. This is a proposal to arrange travel,
        # never a mapped route or a claim that a service operates.
        leg = Leg(id='approach-unconfirmed', start=origin, end=gateway, selected='transfer',
            options=[Option(id='transfer', mode='taxi', label='Arrange transfer · confirm locally',
                note=f'From {origin.name}, arrange onward travel to {gateway.name} before the trek. '
                     'The trailhead location is approximate. Transport availability, road access, '
                     'connections, price and travel time still need confirmation.',
                sourceIds=[source.id for source in template.sources[:10]],
                requiresUserDecision=True,
                warning='This departure leg is a planning placeholder. No transport service or mapped road route has been verified.')])
        return {'legs': [leg.model_dump()], 'sources': [source.model_dump() for source in template.sources[:10]]}
    source = Source(id='road-router', title='OpenStreetMap road routing', url='https://routing.openstreetmap.de/', checkedAt=datetime.now(timezone.utc).isoformat())
    sources = [source]
    legs = []
    async with httpx.AsyncClient(timeout=20) as client:
        if metres(origin, gateway) < 500:
            leg = Leg(id='approach-local', start=origin, end=gateway, selected='walk',
                options=[Option(id='walk', mode='walk', label='Reach departure point',
                    note='Nearby departure point. Confirm local access and walking directions before setting off.',
                    sourceIds=['road-router'])])
            return {'legs': [leg.model_dump()], 'sources': [source.model_dump()]}
        # Connect only the mapped road approach here. Scheduled transport choices
        # belong to the evidence/review pipeline and must not be inferred from a map.
        legs.append(await road_leg(client, origin, gateway, 'approach-road'))
    return {'legs': [v.model_dump() for v in legs], 'sources': [s.model_dump() for s in sources]}

async def stage_geometry(template, leg_id, option_id):
    leg = next((l for l in template.legs if l.id == leg_id), None)
    option = next((o for o in leg.options if o.id == option_id), None) if leg else None
    if not option: raise HTTPException(404, 'This journey stage is unavailable.')
    if option.mode == 'flight': return {'geometry': [], 'geometryKind': 'schematic'}
    from . import store
    import json
    cache_key = f'{template.id}:{template.researchedAt}:{leg_id}:{option_id}'
    with store.connection() as db:
        db.execute('CREATE TABLE IF NOT EXISTS stage_geometry (id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
        row = db.execute('SELECT payload FROM stage_geometry WHERE id=?', (cache_key,)).fetchone()
        if row: return json.loads(row[0])
    base = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot' if option.mode == 'walk' else ROUTER
    query = f'{leg.start.longitude},{leg.start.latitude};{leg.end.longitude},{leg.end.latitude}'
    async with httpx.AsyncClient(timeout=18) as client:
        response = await client.get(f'{base}/{query}', params={'overview': 'simplified', 'geometries': 'geojson', 'steps': 'false'})
        response.raise_for_status(); value = response.json()
    waypoints = value.get('waypoints', [])
    if value.get('code') != 'Ok' or not value.get('routes') or len(waypoints) != 2 or any(w.get('distance',99999) > 200 for w in waypoints):
        raise HTTPException(422, 'A precise mapped path is unavailable for this stage. The checkpoint overview remains available.')
    coordinates = value['routes'][0].get('geometry', {}).get('coordinates', [])
    if len(coordinates) < 2 or len(coordinates) > 10000: raise ValueError('Invalid geometry')
    if metres(_geometry_point(coordinates[0], 'route start'), leg.start) > 500 or metres(_geometry_point(coordinates[-1], 'route end'), leg.end) > 500:
        raise HTTPException(422, 'The mapped path does not connect both journey checkpoints.')
    payload = {'geometry': [Point(id=str(i), name='Mapped route', longitude=c[0], latitude=c[1]).model_dump() for i,c in enumerate(coordinates)], 'geometryKind': 'trail' if option.mode == 'walk' else 'road'}
    with store.connection() as db:
        db.execute('INSERT OR REPLACE INTO stage_geometry VALUES (?, ?)', (cache_key, json.dumps(payload)))
    return payload
