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
        nebius_base_url='https://api.tokenfactory.nebius.com/v1'))

def invoke(status, body):
    def handler(request):
        assert request.url.host == 'api.tokenfactory.nebius.com'
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
