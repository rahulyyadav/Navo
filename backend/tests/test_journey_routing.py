import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.journeys.models import Point, Source
from app.journeys.routing import approach, road_leg


class Response:
    def __init__(self, value):
        self.value = value

    def raise_for_status(self):
        return None

    def json(self):
        return self.value


class Client:
    def __init__(self, value):
        self.value = value

    async def get(self, *args, **kwargs):
        return Response(self.value)


def route_value(coordinates):
    return {
        'code': 'Ok',
        'waypoints': [{'distance': 0}, {'distance': 0}],
        'routes': [{'duration': 600, 'geometry': {'coordinates': coordinates}}],
    }


def test_road_geometry_must_connect_both_checkpoints():
    start = Point(id='start', name='Start', latitude=28.20, longitude=83.90)
    end = Point(id='end', name='End', latitude=28.21, longitude=83.91)
    value = route_value([[83.50, 27.90], [83.51, 27.91]])
    with pytest.raises(HTTPException, match='does not connect'):
        asyncio.run(road_leg(Client(value), start, end, 'approach-road'))


def test_road_geometry_preserves_connected_endpoints():
    start = Point(id='start', name='Start', latitude=28.20, longitude=83.90)
    end = Point(id='end', name='End', latitude=28.21, longitude=83.91)
    value = route_value([[83.90, 28.20], [83.905, 28.205], [83.91, 28.21]])
    leg = asyncio.run(road_leg(Client(value), start, end, 'approach-road'))
    assert leg.start == start
    assert leg.end == end
    assert leg.geometry[0].longitude == 83.90
    assert leg.geometry[-1].latitude == 28.21


def test_schematic_gateway_does_not_create_a_false_road_approach():
    gateway = Point(id='schematic', name='Khande', latitude=28.48, longitude=83.94, coordinatesApproximate=True)
    origin = Point(id='origin', name='Kathmandu', latitude=27.7172, longitude=85.324)
    source = Source(id='guide', title='Trailhead guide', url='https://example.com/guide', checkedAt='2026-10-22T00:00:00Z')
    template = SimpleNamespace(legs=[SimpleNamespace(start=gateway)], sources=[source])
    result = asyncio.run(approach(template, origin))
    leg = result['legs'][0]
    assert leg['start'] == origin.model_dump()
    assert leg['end'] == gateway.model_dump()
    assert leg['geometryKind'] == 'schematic'
    assert leg['geometry'] == []
    assert leg['options'][0]['minutes'] is None
    assert leg['options'][0]['requiresUserDecision'] is True
    assert leg['options'][0]['verification'] == 'unconfirmed'
    assert result['sources'] == [source.model_dump()]


def test_nearby_departure_keeps_the_exact_selected_start():
    gateway = Point(id='gateway', name='Departure stop', latitude=27.67, longitude=85.3201)
    origin = Point(id='origin', name='Sabhya Samaj Marg, Lalitpur', latitude=27.67, longitude=85.32)
    template = SimpleNamespace(legs=[SimpleNamespace(start=gateway)])
    result = asyncio.run(approach(template, origin))
    assert result['legs'][0]['start'] == origin.model_dump()
    assert result['legs'][0]['end'] == gateway.model_dump()
    assert result['legs'][0]['geometry'] == []
    assert result['legs'][0]['options'][0]['minutes'] is None


def test_departure_already_at_gateway_needs_no_duplicate_leg():
    gateway = Point(id='gateway', name='Departure stop', latitude=27.67, longitude=85.32)
    template = SimpleNamespace(legs=[SimpleNamespace(start=gateway)])
    assert asyncio.run(approach(template, gateway)) == {'legs': [], 'sources': []}
