import asyncio
from types import SimpleNamespace
import httpx
import pytest
from fastapi import HTTPException
from app import token_factory

@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setattr(token_factory, 'settings', lambda: SimpleNamespace(
        nebius_api_key='test-only', nebius_model='nvidia/test-nemotron',
        nebius_base_url='https://api.tokenfactory.us-central1.nebius.com/v1'))

def invoke(status, body):
    def handler(request):
        assert request.url.host == 'api.tokenfactory.us-central1.nebius.com'
        return httpx.Response(status, json=body)
    return asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler)))

def test_records_only_actual_provider_usage():
    result = invoke(200, {'model':'nvidia/test-nemotron', 'choices':[{'message':{'content':'{}'},'finish_reason':'stop'}], 'usage':{'prompt_tokens':10,'completion_tokens':2}})
    assert result.prompt_tokens == 10 and result.completion_tokens == 2
    assert result.elapsed_ms >= 0
    absent = invoke(200, {'choices':[{'message':{'content':'{}'}}]})
    assert absent.prompt_tokens is None

@pytest.mark.parametrize('status,body,expected', [
    (429, {'secret':'never show'}, 503),
    (401, {'secret':'never show'}, 502),
    (200, {}, 502),
    (200, {'choices':[]}, 502),
    (200, {'choices':[{'message':{'content':None}}]}, 502),
    (200, {'choices':[{'message':{'refusal':'private provider text'}}]}, 422),
    (200, {'choices':[{'message':{'content':'truncated'},'finish_reason':'length'}]}, 502),
])
def test_provider_failures_are_actionable_and_do_not_leak(status, body, expected):
    with pytest.raises(HTTPException) as exc:
        invoke(status, body)
    assert exc.value.status_code == expected
    assert 'never show' not in exc.value.detail and 'private provider text' not in exc.value.detail

def test_timeout_is_bounded():
    def handler(request):
        raise httpx.ReadTimeout('private network details', request=request)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler)))
    assert exc.value.status_code == 504

def test_wrong_endpoint_never_receives_credentials(monkeypatch):
    monkeypatch.setattr(token_factory, 'settings', lambda: SimpleNamespace(nebius_api_key='test-only', nebius_model='nemotron', nebius_base_url='https://example.com'))
    with pytest.raises(HTTPException) as exc:
        invoke(200, {})
    assert exc.value.status_code == 503


def test_primary_quota_uses_openrouter_once(monkeypatch):
    config = token_factory.settings()
    monkeypatch.setattr(token_factory, 'settings', lambda: config)
    config.openrouter_api_key = 'fallback-test-only'
    config.openrouter_model = 'nvidia/nemotron-3.5-super-vl:free'
    reservations, calls = [], []
    def handler(request):
        calls.append(request.url.host)
        if len(calls) == 1:
            return httpx.Response(429, json={})
        assert request.headers['Authorization'] == 'Bearer fallback-test-only'
        import json
        payload = json.loads(request.content)
        assert payload['model'] == 'nvidia/nemotron-3.5-super-vl:free'
        assert payload['response_format']['type'] == 'json_schema'
        assert payload['provider']['require_parameters'] is True
        assert payload['reasoning'] == {'enabled': False}
        return httpx.Response(200, json={'choices': [{'message': {'content': '{}'}}]})
    result = asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler), fallback_reserve=lambda: reservations.append(True)))
    assert calls == ['api.tokenfactory.us-central1.nebius.com', 'openrouter.ai']
    assert reservations == [True]
    assert result.model == 'nvidia/nemotron-3.5-super-vl:free'


def test_fallback_failure_does_not_loop(monkeypatch):
    config = token_factory.settings()
    monkeypatch.setattr(token_factory, 'settings', lambda: config)
    config.openrouter_api_key = 'fallback-test-only'
    config.openrouter_model = 'nvidia/nemotron-3.5-super-vl:free'
    calls = []
    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(402, json={'secret': 'private billing details'})
    with pytest.raises(HTTPException) as raised:
        asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler), fallback_reserve=lambda: None))
    assert len(calls) == 2
    assert 'private' not in raised.value.detail


@pytest.mark.parametrize('failure', ['timeout', 'server_error'])
def test_primary_transient_failure_uses_openrouter_within_one_bounded_call(monkeypatch, failure):
    config = token_factory.settings()
    config.openrouter_api_key = 'fallback-test-only'
    config.openrouter_model = 'nvidia/nemotron-3.5-super-vl:free'
    monkeypatch.setattr(token_factory, 'settings', lambda: config)
    calls, reservations = [], []
    def handler(request):
        calls.append(request.url.host)
        if request.url.host != 'openrouter.ai':
            if failure == 'timeout':
                raise httpx.ReadTimeout('private provider timeout', request=request)
            return httpx.Response(503, json={'error': {'message': 'private provider error'}})
        return httpx.Response(200, json={'model': config.openrouter_model,
            'choices': [{'message': {'content': '{}'}, 'finish_reason': 'stop'}]})
    result = asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler),
        fallback_reserve=lambda: reservations.append(True)))
    assert result.provider == 'openrouter'
    assert calls == ['api.tokenfactory.us-central1.nebius.com', 'openrouter.ai']
    assert reservations == [True]


def test_openrouter_missing_endpoint_is_actionable_and_logged(monkeypatch, caplog):
    config = token_factory.settings()
    config.openrouter_api_key = 'fallback-test-only'
    config.openrouter_model = 'nvidia/nemotron-3.5-super-vl:free'
    monkeypatch.setattr(token_factory, 'settings', lambda: config)
    transport = httpx.MockTransport(lambda request: httpx.Response(404, json={'error': {'message': 'private upstream detail'}}))
    with pytest.raises(HTTPException) as raised:
        asyncio.run(token_factory.complete([], {}, transport, provider='openrouter'))
    assert raised.value.status_code == 503
    assert 'endpoint is unavailable' in raised.value.detail
    assert 'upstream_status=404' in caplog.text
    assert 'private upstream detail' not in caplog.text


def test_total_deadline_stops_provider_even_without_network_timeout(monkeypatch, caplog):
    monkeypatch.setattr(token_factory, 'MODEL_TOTAL_TIMEOUT', 0.02)
    cancelled = []
    async def handler(request):
        try:
            await asyncio.sleep(1)
            return httpx.Response(200, json={})
        finally:
            cancelled.append(True)
    with pytest.raises(HTTPException) as raised:
        asyncio.run(token_factory.complete([], {}, httpx.MockTransport(handler)))
    assert raised.value.status_code == 504
    assert 'total_timeout' in caplog.text
    assert cancelled == [True]
