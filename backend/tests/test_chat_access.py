from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app import chat_access


@pytest.fixture
def config(monkeypatch, tmp_path):
    value = SimpleNamespace(firebase_web_api_key='public-project-key', ai_enabled=True,
                            ai_daily_requests=3, ai_user_daily_requests=2,
                            chat_budget_path=str(tmp_path / 'budgets.sqlite3'))
    monkeypatch.setattr(chat_access, 'settings', lambda: value)
    return value


def test_chat_validates_token_with_google_without_admin(config, monkeypatch):
    def lookup(url, **kwargs):
        assert url == 'https://identitytoolkit.googleapis.com/v1/accounts:lookup'
        assert kwargs['json'] == {'idToken': 'signed-token'}
        assert kwargs['params'] == {'key': 'public-project-key'}
        return httpx.Response(200, json={'users': [{'localId': 'trekker', 'emailVerified': True}]})
    monkeypatch.setattr(chat_access.httpx, 'post', lookup)
    assert chat_access.chat_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials='signed-token')) == 'trekker'


@pytest.mark.parametrize('status, body, expected', [
    (400, {}, 401), (503, {}, 503),
    (200, {'users': []}, 401),
    (200, {'users': [{'localId': 'person', 'emailVerified': False}]}, 403),
    (200, {'users': [{'localId': 'person', 'emailVerified': True, 'disabled': True}]}, 401),
    (200, {'users': [{'localId': 'bad/id', 'emailVerified': True}]}, 401),
])
def test_invalid_accounts_never_reach_chat(config, monkeypatch, status, body, expected):
    monkeypatch.setattr(chat_access.httpx, 'post', lambda *a, **kw: httpx.Response(status, json=body))
    with pytest.raises(HTTPException) as failure:
        chat_access.chat_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials='bad-token'))
    assert failure.value.status_code == expected


def test_missing_token_never_calls_google(config, monkeypatch):
    monkeypatch.setattr(chat_access.httpx, 'post', lambda *a, **kw: pytest.fail('No lookup without a token'))
    with pytest.raises(HTTPException) as failure:
        chat_access.chat_user(None)
    assert failure.value.status_code == 401


def test_budget_persists_and_rejected_attempt_does_not_consume_global_allowance(config):
    chat_access.reserve_local_chat('a')
    chat_access.reserve_local_chat('a')
    with pytest.raises(HTTPException):
        chat_access.reserve_local_chat('a')
    chat_access.reserve_local_chat('b')
    with pytest.raises(HTTPException):
        chat_access.reserve_local_chat('c')


def test_concurrent_reservations_cannot_exceed_global_budget(config):
    def reserve(index):
        try:
            chat_access.reserve_local_chat(str(index))
            return True
        except HTTPException as error:
            assert error.status_code == 429
            return False
    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(reserve, range(12))) == 3


def test_disabled_ai_and_zero_allowance_fail_closed(config):
    config.ai_enabled = False
    with pytest.raises(HTTPException) as failure:
        chat_access.reserve_local_chat('a')
    assert failure.value.status_code == 503
    config.ai_enabled = True
    config.ai_daily_requests = 0
    with pytest.raises(HTTPException) as failure:
        chat_access.reserve_local_chat('a')
    assert failure.value.status_code == 429


def test_journey_switches_daily_allowance_but_keeps_fallback_bound(config):
    config.openrouter_api_key = 'test-only'
    config.openrouter_daily_requests = 3
    config.openrouter_user_daily_requests = 1
    assert chat_access.reserve_journey_ai('a') == 'nebius'
    assert chat_access.reserve_journey_ai('a') == 'nebius'
    assert chat_access.reserve_journey_ai('a') == 'openrouter'
    with pytest.raises(chat_access.DailyAllowanceReached):
        chat_access.reserve_journey_ai('a')


def test_journey_does_not_fallback_when_ai_is_paused(config):
    config.openrouter_api_key = 'test-only'
    config.ai_enabled = False
    with pytest.raises(HTTPException) as raised:
        chat_access.reserve_journey_ai('a')
    assert raised.value.status_code == 503
