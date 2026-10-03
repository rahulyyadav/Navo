from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

def test_health_without_secrets_is_honest():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['aiConfigured'] is False

def test_privileged_endpoints_do_not_allow_unauthenticated_requests():
    for path, body in [('/session', {}), ('/groups', {'name':'Crew','trekId':'mardi-himal','startDate':'2026-10-03','requestId':'test-request'}), ('/groups/abc/messages', {'text':'hello','requestId':'test-request'}), ('/groups/abc/alerts', {'kind':'sos','confirmed':True,'requestId':'test-request'})]:
        assert client.post(path, json=body).status_code in [401, 503]

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
