import logging
import httpx
import pytest
from app.journeys.diagnostics import stage


def test_stage_records_timing_and_correlation(caplog):
    with caplog.at_level(logging.INFO, logger='uvicorn.error'):
        with stage('test-itinerary', 'search', provider='brave'):
            pass
    assert 'journey=test-itinerary stage=search outcome=started provider=brave' in caplog.text
    assert 'outcome=completed elapsed_ms=' in caplog.text


def test_failure_preserves_exception_without_leaking_provider_url(caplog):
    request = httpx.Request('GET', 'https://example.com/?key=secret-value')
    response = httpx.Response(429, request=request)
    error = httpx.HTTPStatusError('secret response content', request=request, response=response)
    with caplog.at_level(logging.INFO, logger='uvicorn.error'):
        with pytest.raises(httpx.HTTPStatusError) as raised:
            with stage('test-itinerary', 'search'):
                raise error
    assert raised.value is error
    assert 'error_type=HTTPStatusError status=429' in caplog.text
    assert 'test_journey_diagnostics.py:' in caplog.text
    assert 'secret' not in caplog.text
    assert 'example.com' not in caplog.text


def test_request_logs_omit_query_strings_and_include_correlation(caplog):
    from fastapi.testclient import TestClient
    from app.main import app
    with caplog.at_level(logging.INFO, logger='uvicorn.error'):
        response = TestClient(app).get('/health?private=never-log-this')
    assert response.status_code == 200
    assert response.headers['X-Request-ID']
    assert 'route=/health outcome=completed status=200' in caplog.text
    assert 'never-log-this' not in caplog.text


def test_leg_validation_logs_specific_allowlisted_code_without_model_text(caplog):
    from pydantic import ValidationError
    from app.journeys.models import Leg
    from app.journeys.diagnostics import failure
    private_point = {'id': 'private', 'name': 'private-address', 'latitude': 27.67, 'longitude': 85.32}
    private_option = {'id': 'same-id', 'mode': 'bus', 'label': 'private-model-text', 'sourceIds': ['source']}
    with pytest.raises(ValidationError) as raised:
        Leg(id='test', start=private_point, end=private_point,
            options=[private_option, private_option], selected='same-id')
    with caplog.at_level(logging.ERROR, logger='uvicorn.error'):
        failure('test-itinerary', 'route_conversion', raised.value)
    assert 'validation_code=duplicate_transport_option_ids' in caplog.text
    assert 'private-address' not in caplog.text
    assert 'private-model-text' not in caplog.text
