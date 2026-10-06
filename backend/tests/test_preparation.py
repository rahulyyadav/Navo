import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app import main
from app.auth import current_user
from app.schemas import TrekPreparation


def test_preparation_requires_auth():
    client = TestClient(main.app)
    assert client.get('/preparations/annapurna-base-camp').status_code == 401
    assert client.put('/preparations/annapurna-base-camp', json={}).status_code == 401


def test_preparation_validates_decisions_and_calendar():
    for value in [{'checked': ['unknown']}, {'date': '2026-02-30'}, {'date': '20261006'}, {'checked': ['water'], 'reviewed': []}, {'notes': 'x' * 2001}, {'userId': 'another-user'}]:
        with pytest.raises(ValidationError): TrekPreparation(**value)
    assert TrekPreparation(checked=['water', 'water'], reviewed=['water']).checked == ['water']
    assert TrekPreparation(date='2026-10-06').date == '2026-10-06'


def test_preparation_owner_route_isolation_and_roundtrip(monkeypatch):
    records = {}
    class Ref:
        def __init__(self, path=()): self.path = path
        def collection(self, key): return Ref(self.path + (key,))
        def document(self, key): return Ref(self.path + (key,))
        def get(self): return self
        def to_dict(self): return records.get(self.path)
        def set(self, value): records[self.path] = value
    monkeypatch.setattr(main, 'database', lambda: Ref())
    main.app.dependency_overrides[current_user] = lambda: 'alice'
    try:
        client = TestClient(main.app)
        trek_id = main.ROUTES[0]['id']
        path = f'/preparations/{trek_id}'
        body = {'date': '2026-10-06', 'notes': 'Meet at 7', 'checked': ['water'], 'reviewed': ['water', 'kit']}
        assert client.get(path).json() is None
        assert client.put(path, json=body).status_code == 200
        assert client.get(path).json() == body
        assert ('users', 'alice', 'preparations', trek_id) in records
        main.app.dependency_overrides[current_user] = lambda: 'bob'
        assert client.get(path).json() is None
        assert client.put('/preparations/unknown-route', json=body).status_code == 404
        assert len(records) == 1
    finally:
        main.app.dependency_overrides.clear()
