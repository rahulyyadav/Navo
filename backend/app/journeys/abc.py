"""A sourced planning skeleton, not a certified hiking track or live timetable."""
from datetime import datetime, timezone, timedelta
from .models import Point, Option, Leg, Template, Source

POKHARA = Point(id='pokhara', name='Pokhara', latitude=28.2096, longitude=83.9856)
KATHMANDU = Point(id='kathmandu', name='Kathmandu', latitude=27.7172, longitude=85.324)
BUS_SOURCE = Source(id='bus-operator', title='Kathmandu–Pokhara operator information', url='https://babaadventure.com/', checkedAt='2026-10-19T00:00:00+00:00')
FLIGHT_SOURCE = Source(id='flight-operator', title='Buddha Air: Kathmandu to Pokhara', url='https://www.buddhaair.com/flight-routes/flights-from-kathmandu-to-pokhara', checkedAt='2026-10-19T00:00:00+00:00')

def curated_abc(destination, key):
    if 'annapurna' not in destination.name.lower() or 'base' not in destination.name.lower(): return None
    if abs(destination.latitude - 28.53) > 0.35 or abs(destination.longitude - 83.88) > 0.35: return None
    now = datetime.now(timezone.utc)
    source = Source(id='abc-guide', title='ABC itinerary via Jhinu — trekking operator', url='https://www.havenholidaysnepal.com/blogs/annapurna-base-camp-trek-from-pokhara', checkedAt='2026-10-19T00:00:00+00:00')
    if now > datetime.fromisoformat(source.checkedAt) + timedelta(days=7): return None
    points = [POKHARA,
        Point(id='jhinu', name='Jhinu / road access', latitude=28.405, longitude=83.858),
        Point(id='chhomrong', name='Chhomrong', latitude=28.416, longitude=83.826),
        Point(id='himalaya-abc', name='Himalaya', latitude=28.493, longitude=83.881),
        destination,
        Point(id='bamboo', name='Bamboo', latitude=28.454, longitude=83.844),
        Point(id='jhinu', name='Jhinu / road access', latitude=28.405, longitude=83.858),
        POKHARA]
    minutes = [270, 120, 420, 420, 420, 300, 270]
    legs = []
    for i, (a, b) in enumerate(zip(points, points[1:])):
        road = i in (0, len(points) - 2)
        mode = 'jeep' if road else 'walk'
        note = ('Operator planning estimate: about 4–5 hours. Confirm the current road endpoint and pickup.' if road else 'Operator itinerary estimate, including a walking stage. Confirm trail, overnight stays, pace and conditions locally; this is not a live ETA.')
        legs.append(Leg(id=f'abc-{i}', start=a, end=b, selected=mode,
            options=[Option(id=mode, mode=mode, label='Jeep transfer' if road else 'Trek', minutes=minutes[i], note=note, sourceIds=[source.id])]))
    return Template(id=key, destination=destination, title='Annapurna Base Camp', legs=legs,
        sources=[source], researchedAt=source.checkedAt,
        expiresAt=(datetime.fromisoformat(source.checkedAt) + timedelta(days=7)).isoformat(), provenance='curated')
