from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app import ai_budget
from test_group_transactions import DB

@pytest.fixture
def budget(monkeypatch):
    monkeypatch.setattr(ai_budget.firestore, 'transactional', lambda fn: fn)
    config = SimpleNamespace(ai_enabled=True, ai_daily_requests=3, ai_user_daily_requests=2)
    monkeypatch.setattr(ai_budget, 'settings', lambda: config)
    return DB(), config

def test_user_and_global_limits_survive_separate_calls(budget):
    db, _ = budget
    ai_budget.reserve_chat(db, 'a')
    ai_budget.reserve_chat(db, 'a')
    with pytest.raises(HTTPException) as failure: ai_budget.reserve_chat(db, 'a')
    assert failure.value.status_code == 429
    ai_budget.reserve_chat(db, 'b')
    with pytest.raises(HTTPException): ai_budget.reserve_chat(db, 'c')
    assert db.data['aiBudgets/global']['count'] == 3

def test_new_day_resets_counts_and_uid_cannot_collide(budget):
    db, _ = budget
    db.data['aiBudgets/global'] = {'day': '2000-01-01', 'count': 999}
    ai_budget.reserve_chat(db, 'global')
    assert db.data['aiBudgets/global']['count'] == 1
    assert db.data['aiBudgets/user-global']['count'] == 1

def test_kill_switch_and_zero_budget(budget):
    db, config = budget
    config.ai_enabled = False
    with pytest.raises(HTTPException) as failure: ai_budget.reserve_chat(db, 'a')
    assert failure.value.status_code == 503
    assert db.data == {}
    config.ai_enabled = True
    config.ai_daily_requests = 0
    with pytest.raises(HTTPException): ai_budget.reserve_chat(db, 'a')
    assert db.data == {}
