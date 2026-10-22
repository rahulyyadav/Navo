"""Compatibility for catalogue metadata without weakening location validation."""
import pytest
from pydantic import ValidationError
from app.journeys.models import Point, PrepareRequest, ApproachRequest


def point(**extra):
    return dict(id='mardi-himal', name='Mardi Himal Trek', latitude=28.539, longitude=83.933,
                canonicalId='mardi-himal', destinationMeaning='Mardi Himal Base Camp endpoint',
                provider='catalogue', **extra)


def test_legacy_catalogue_aliases_are_discarded_before_preparation():
    destination = point(aliases=['mardi', 'mardi himal trek'])
    origin = dict(id='origin', name='Sabhya Samaj Marg', latitude=27.67, longitude=85.32, aliases=['home'])
    request = PrepareRequest(destination=destination, origin=origin, startDate='2026-10-29')
    assert 'aliases' not in request.destination.model_dump()
    assert 'aliases' not in request.origin.model_dump()
    assert request.destination.canonicalId == 'mardi-himal'
    assert request.destination.destinationMeaning == 'Mardi Himal Base Camp endpoint'
    assert request.destination.latitude == 28.539
    assert request.origin.name == 'Sabhya Samaj Marg'
    assert destination['aliases'] == ['mardi', 'mardi himal trek']


def test_legacy_origin_aliases_are_discarded_for_approach_requests():
    request = ApproachRequest(templateId='a' * 24, revision='2026-10-22', origin=point(aliases=['old search match']))
    assert 'aliases' not in request.origin.model_dump()


@pytest.mark.parametrize('extra', [{'latitude': 999}, {'provider': 'invalid'}, {'unexpected': True}])
def test_alias_compatibility_keeps_coordinate_provider_and_unknown_field_validation(extra):
    value = {**point(aliases=['mardi']), **extra}
    with pytest.raises(ValidationError):
        Point.model_validate(value)


def test_prepare_endpoint_accepts_the_previous_clients_catalogue_payload(monkeypatch):
    import importlib
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.chat_access import chat_user
    api = importlib.import_module('app.journeys.api')
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[chat_user] = lambda: 'contract-test-user'
    captured = {}
    def key(destination, origin, start_date):
        captured.update(destination=destination.model_dump(), origin=origin.model_dump())
        return 'a' * 24
    async def status(key, uid):
        return {'id': key, 'status': 'preparing'}
    monkeypatch.setattr(api.store, 'destination_key', key)
    monkeypatch.setattr(api.store, 'read', lambda _key: None)
    monkeypatch.setattr(api.store, 'claim', lambda _key: False)
    monkeypatch.setattr(api, 'status', status)
    monkeypatch.setattr(api, '_tasks', set())
    with TestClient(app) as client:
        response = client.post('/journey-itineraries/prepare', json={
            'destination': point(aliases=['mardi', 'mardi himal trek']),
            'origin': dict(id='home', name='Sabhya Samaj Marg', latitude=27.67, longitude=85.32),
            'startDate': '2026-10-29', 'mapChoices': {},
        })
    assert response.status_code == 200
    assert response.json()['status'] == 'preparing'
    assert 'aliases' not in captured['destination']
    assert captured['destination']['canonicalId'] == 'mardi-himal'
