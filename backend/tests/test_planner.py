import asyncio
import pytest
from pydantic import ValidationError
from app.schemas import Itinerary, PlanRequest, AlertCreate, Position
from app.planner import audit, generate
from app.main import require_member
from fastapi import HTTPException

ROUTE = {'id': 'test', 'difficulty': 'Moderate', 'route': [{'name': 'A', 'elevation': 2000}, {'name': 'B', 'elevation': 2400}]}

def request(**changes):
    return PlanRequest(trekId='mardi-himal', days=2, experience='seasoned', requestId='test-request', **changes)

def draft():
    return Itinerary(title='Test itinerary', explanation='For unit testing only', emergencyNotes='Contact your guide if conditions change.', days=[{'day':1,'start':'A','end':'B','distanceKm':5,'ascentM':400,'sleepingElevationM':2400,'rest':False,'notes':''},{'day':2,'start':'B','end':'A','distanceKm':5,'ascentM':0,'sleepingElevationM':2000,'rest':False,'notes':''}])

def test_safe_thresholds_do_not_mean_certification():
    assert audit(draft(), request(), ROUTE) == []

def test_excessive_ascent_and_invented_stop_rejected():
    value = draft(); value.days[0].ascentM = 1600; value.days[1].end = 'Invented'
    issues = audit(value, request(), ROUTE)
    assert any('ascent' in item for item in issues)
    assert any('curated route' in item for item in issues)

def test_discontinuity_and_false_elevation_rejected():
    value = draft(); value.days[1].start = 'A'; value.days[0].sleepingElevationM = 5000
    assert any('discontinuous' in item for item in audit(value, request(), ROUTE))
    assert any('elevation' in item for item in audit(value, request(), ROUTE))

def test_schema_rejects_infinite_and_out_of_range_positions():
    for lat in [float('nan'), float('inf'), 91]:
        with pytest.raises(ValidationError): Position(latitude=lat, longitude=0, accuracy=1, capturedAt='now')
    with pytest.raises(ValidationError): AlertCreate(kind='sos', requestId='test-request', senderId='someone-else')

def test_only_members_can_access_and_only_owner_can_invite():
    group = {'memberIds': ['user_a', 'user_b'], 'ownerId': 'user_a'}
    require_member(group, 'user_b')
    for uid, owner in [('user_c', False), ('user_b', True)]:
        with pytest.raises(HTTPException) as error: require_member(group, uid, owner)
        assert error.value.status_code == 403

def test_repair_loop_is_bounded_and_auditable(monkeypatch):
    import app.planner as planner
    monkeypatch.setattr(planner, 'route_by_id', lambda _: ROUTE)
    calls = []
    async def model(messages):
        calls.append(messages.copy())
        value = draft()
        if len(calls) == 1: value.days[0].ascentM = 2000
        return value.model_dump_json()
    result = asyncio.run(generate(request(), model))
    assert len(calls) == 2
    assert result['audit'][0]['issues']
    assert result['audit'][1]['issues'] == []
    assert result['status'] == 'review_required'
    assert result['routeVerified'] is False

def test_malformed_model_output_never_becomes_a_plan(monkeypatch):
    import app.planner as planner
    monkeypatch.setattr(planner, 'route_by_id', lambda _: ROUTE)
    calls = []
    async def model(messages): calls.append(1); return '{"not":"an itinerary"}'
    result = asyncio.run(generate(request(), model))
    assert len(calls) == 3
    assert result['status'] == 'rejected'
    assert result['itinerary'] is None
