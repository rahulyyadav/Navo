from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

def test_health_without_secrets_is_honest(monkeypatch):
    from app import main
    monkeypatch.setattr(main, "ai_configured", lambda: False)
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['aiConfigured'] is False

def test_privileged_endpoints_do_not_allow_unauthenticated_requests():
    for path, body in [('/session', {}), ('/groups', {'name':'Crew','trekId':'mardi-himal','startDate':'2026-10-03','requestId':'test-request'}), ('/groups/abc/messages', {'text':'hello','requestId':'test-request'}), ('/groups/abc/alerts', {'kind':'sos','confirmed':True,'requestId':'test-request'})]:
        assert client.post(path, json=body).status_code == 401

def test_curated_routes_are_not_advertised_as_verified():
    response = client.get('/routes')
    assert response.status_code == 200
    assert len(response.json()) == 4
    assert all(route['verified'] is False for route in response.json())


def test_large_requests_are_rejected_before_parsing():
    response = client.post('/groups', content='x' * 65537)
    assert response.status_code == 413

def test_api_responses_are_not_shared_cached():
    response = client.get('/health')
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'

def test_health_does_not_claim_missing_admin_is_ready(monkeypatch):
    from app import main
    def missing(): raise RuntimeError('private diagnostic')
    assert client.get('/health').json()['readinessPath'] == '/ready'
    monkeypatch.setattr(main, 'database', missing)
    result = client.get('/ready')
    assert result.status_code == 503
    assert 'private diagnostic' not in result.text


def test_readiness_reports_allowlisted_setup_diagnostic(monkeypatch):
    from app import main
    from app.database import FirebaseSetupError
    def missing():
        raise FirebaseSetupError('firebase_credentials_unavailable', 'Server Firebase credentials are unavailable.', 'Configure approved server ADC.')
    monkeypatch.setattr(main, 'database', missing)
    response = client.get('/ready')
    assert response.status_code == 503
    assert response.json()['code'] == 'firebase_credentials_unavailable'
    assert response.json()['action'] == 'Configure approved server ADC.'
    assert response.headers['cache-control'] == 'no-store'
    assert client.get('/health').status_code == 200


def test_readiness_requires_actual_read_and_recovers_without_writes(monkeypatch):
    from app import main
    from unittest.mock import Mock
    from google.api_core.exceptions import PermissionDenied
    db = Mock()
    ref = db.collection.return_value.document.return_value
    ref.get.side_effect = [PermissionDenied('private IAM/account detail'), Mock(exists=False)]
    monkeypatch.setattr(main, 'database', lambda: db)
    failed = client.get('/ready')
    assert failed.status_code == 503
    assert failed.json()['code'] == 'account_storage_access_denied'
    assert 'private' not in failed.text
    assert client.get('/ready').json()['ready'] is True
    assert ref.get.call_count == 2
    ref.get.assert_called_with(timeout=5, retry=None)
    ref.set.assert_not_called()
    ref.create.assert_not_called()


def test_readiness_does_not_leak_unexpected_storage_errors(monkeypatch):
    from app import main
    from unittest.mock import Mock
    db = Mock()
    db.collection.return_value.document.return_value.get.side_effect = RuntimeError('private credential or transport detail')
    monkeypatch.setattr(main, 'database', lambda: db)
    failed = client.get('/ready')
    assert failed.status_code == 503
    assert failed.json()['code'] == 'account_storage_unavailable'
    assert 'private' not in failed.text

def test_maintenance_is_not_public(monkeypatch):
    from types import SimpleNamespace
    from app import main
    monkeypatch.setattr(main, 'settings', lambda: SimpleNamespace(maintenance_token=''))
    assert client.post('/internal/maintenance').status_code == 401
    monkeypatch.setattr(main, 'settings', lambda: SimpleNamespace(maintenance_token='x' * 32))
    assert client.post('/internal/maintenance', headers={'Authorization': 'Bearer wrong'}).status_code == 401
