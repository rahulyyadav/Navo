import asyncio
import importlib
from types import SimpleNamespace
import pytest

from app.journeys.models import Point, PrepareRequest
from app.journeys import store


api = importlib.import_module('app.journeys.api')


def test_retry_passes_saved_route_checkpoint_without_map_choices(monkeypatch):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    checkpoint = {'sources': [], 'evidence': [], 'hank': {'cached': True}}
    captured = {}
    monkeypatch.setattr(api.store, 'destination_key', lambda *args: 'd' * 24)
    monkeypatch.setattr(api.store, 'read', lambda _key: {
        'status': 'failed', 'routeCheckpoint': checkpoint, 'selectedMapChoices': {'2': 'navo:selected'},
    })
    monkeypatch.setattr(api.store, 'claim', lambda _key: True)
    async def status(_key, _uid):
        return {'id': 'd' * 24, 'status': 'preparing'}
    async def prepare(_destination, _key, _uid, _origin, _date, choices, route_checkpoint):
        captured.update(choices=choices, checkpoint=route_checkpoint)
    monkeypatch.setattr(api, 'status', status)
    monkeypatch.setattr(api, 'prepare', prepare)
    api._tasks.clear()

    async def run():
        value = PrepareRequest(destination=destination, startDate='2026-10-28')
        result = await api.prepare_destination(value, uid='user-1')
        for _ in range(3):
            await asyncio.sleep(0)
        return result

    result = asyncio.run(run())
    assert result['status'] == 'preparing'
    assert captured['checkpoint'] is checkpoint
    assert captured['choices'] == {'2': 'navo:selected'}


def test_claim_merges_status_fields_instead_of_erasing_saved_checkpoint(monkeypatch):
    checkpoint = {'sources': ['saved public evidence']}
    calls = {}
    class Ref:
        def get(self, transaction=None):
            return SimpleNamespace(to_dict=lambda: {'status': 'failed', 'routeCheckpoint': checkpoint})
    class Collection:
        def document(self, _key):
            return Ref()
    class Transaction:
        def set(self, _ref, data, merge=False):
            calls.update(data=data, merge=merge)
    class Database:
        def collection(self, _name):
            return Collection()
        def transaction(self):
            return Transaction()
    monkeypatch.setattr(store, 'database', Database)
    monkeypatch.setattr(store.firestore, 'transactional', lambda function: function)
    assert store.claim('d' * 24) is True
    assert calls['merge'] is True
    assert calls['data']['status'] == 'preparing'


def test_cancelled_preparation_releases_lease_and_quota(monkeypatch):
    started = asyncio.Event()
    events = []
    async def research(*args, **kwargs):
        started.set()
        await asyncio.Future()
    monkeypatch.setattr(api, 'research', research)
    monkeypatch.setattr(api.store, 'reserve_research', lambda: events.append('reserve'))
    monkeypatch.setattr(api.store, 'release_research', lambda: events.append('release'))
    monkeypatch.setattr(api.store, 'fail', lambda key, message: events.append(('fail', key, message)))

    async def run():
        task = asyncio.create_task(api.prepare(Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94), 'd' * 24, 'user-1'))
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(run())
    assert events[0:2] == ['reserve', 'release']
    assert events[2] == ('fail', 'd' * 24, 'Preparation was interrupted. Retry to continue.')
