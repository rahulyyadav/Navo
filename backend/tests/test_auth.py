from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials

from app import auth as authentication
from app import main


def test_missing_token_is_rejected_before_firebase_initialization(monkeypatch):
    initialize = Mock()
    monkeypatch.setattr(authentication, 'firebase_app', initialize)
    with pytest.raises(HTTPException) as error:
        authentication.current_user(None)
    assert error.value.status_code == 401
    initialize.assert_not_called()


def test_firebase_token_is_verified_with_revocation_check(monkeypatch):
    app = object()
    monkeypatch.setattr(authentication, 'firebase_app', lambda: app)
    verify = Mock(return_value={'uid': 'firebase-uid'})
    monkeypatch.setattr(authentication.auth, 'verify_id_token', verify)
    credentials = HTTPAuthorizationCredentials(scheme='Bearer', credentials='id-token')
    assert authentication.current_user(credentials) == 'firebase-uid'
    verify.assert_called_once_with('id-token', app=app, check_revoked=True)


@pytest.mark.parametrize('uid', ['', 'bad/id', 'x' * 129, None])
def test_invalid_identity_is_rejected(monkeypatch, uid):
    monkeypatch.setattr(authentication, 'firebase_app', lambda: object())
    monkeypatch.setattr(authentication.auth, 'verify_id_token', lambda *args, **kwargs: {'uid': uid})
    with pytest.raises(HTTPException) as error:
        authentication.current_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials='token'))
    assert error.value.status_code == 401


def test_token_failure_does_not_disclose_internal_details(monkeypatch):
    monkeypatch.setattr(authentication, 'firebase_app', lambda: object())
    monkeypatch.setattr(authentication.auth, 'verify_id_token', Mock(side_effect=ValueError('private error')))
    with pytest.raises(HTTPException) as error:
        authentication.current_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials='token'))
    assert error.value.status_code == 401
    assert 'private' not in error.value.detail


def test_session_profile_uses_authenticated_firebase_identity(monkeypatch):
    ref = Mock()
    ref.get.return_value.exists = False
    db = Mock()
    db.collection.return_value.document.return_value = ref
    monkeypatch.setattr(main, 'database', lambda: db)
    monkeypatch.setattr(main.auth, 'get_user', lambda uid: SimpleNamespace(email='Hiker@Example.com', display_name='Aasha', photo_url=None, email_verified=True))
    main.app.dependency_overrides[authentication.current_user] = lambda: 'firebase-uid'
    try:
        response = TestClient(main.app).post('/session', json={'id': 'attacker'})
    finally:
        main.app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {'id': 'firebase-uid'}
    db.collection.return_value.document.assert_called_once_with('firebase-uid')
    record = ref.set.call_args.args[0]
    assert record['email'] == 'hiker@example.com'
    assert 'createdAt' in record
    assert 'clerkUserId' not in record


def test_backend_health_and_protected_endpoint():
    client = TestClient(main.app)
    assert client.get('/health').status_code == 200
    assert client.post('/session').status_code == 401


def test_unverified_email_cannot_be_used_as_an_invitation_identity(monkeypatch):
    ref = Mock()
    ref.get.return_value.exists = True
    db = Mock()
    db.collection.return_value.document.return_value = ref
    monkeypatch.setattr(main, 'database', lambda: db)
    monkeypatch.setattr(main.auth, 'get_user', lambda uid: SimpleNamespace(email='Victim@Example.com', display_name='Trekker', photo_url=None, email_verified=False))
    main.connect_session('firebase-uid')
    assert ref.set.call_args.args[0]['email'] is None
    assert 'createdAt' not in ref.set.call_args.args[0]


def test_missing_server_credentials_are_setup_error_not_user_signout(monkeypatch):
    from app import database as storage
    storage.firebase_app.cache_clear()
    monkeypatch.setattr(storage, 'settings', lambda: SimpleNamespace(firebase_project_id='test-project', google_application_credentials='', firebase_private_key='', firebase_client_email=''))
    monkeypatch.setattr(storage.firebase_admin, '_apps', {})
    credential = Mock()
    credential.get_credential.side_effect = ValueError('private credential detail')
    monkeypatch.setattr(storage.credentials, 'ApplicationDefault', lambda: credential)
    initialize = Mock()
    monkeypatch.setattr(storage.firebase_admin, 'initialize_app', initialize)
    try:
        with pytest.raises(HTTPException) as error:
            storage.firebase_app()
        assert error.value.status_code == 503
        assert error.value.detail == 'Server Firebase credentials are unavailable.'
        initialize.assert_not_called()
    finally:
        storage.firebase_app.cache_clear()
