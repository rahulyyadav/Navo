from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import email_otp as otp
from app.main import app


@pytest.fixture
def setup(monkeypatch, tmp_path):
    config = SimpleNamespace(brevo_api_key='test-brevo-key', brevo_sender_email='navo@example.com', auth_otp_secret='test-only-secret-' * 4, auth_otp_store_path=str(tmp_path / 'otp.sqlite3'))
    monkeypatch.setattr(otp, 'settings', lambda: config)
    monkeypatch.setattr(otp, 'firebase_app', lambda: 'firebase-test-app')
    monkeypatch.setattr(otp.secrets, 'randbelow', lambda _: 123456)
    send = Mock()
    monkeypatch.setattr(otp, 'send_email', send)
    user = SimpleNamespace(uid='existing-uid', disabled=False, email_verified=True)
    get = Mock(return_value=user)
    monkeypatch.setattr(otp.auth, 'get_user_by_email', get)
    token = Mock(return_value=b'custom-firebase-token')
    monkeypatch.setattr(otp.auth, 'create_custom_token', token)
    return SimpleNamespace(config=config, send=send, get=get, token=token, client=TestClient(app, raise_server_exceptions=False), user=user)


def request(setup, email='hiker@example.com'):
    return setup.client.post('/auth/email/request', json={'email': email})


def verify(setup, challenge, code='123456', email='hiker@example.com', **extra):
    return setup.client.post('/auth/email/verify', json={'email': email, 'challengeId': challenge, 'code': code, **extra})


def test_passwordless_round_trip_reuses_existing_identity_and_cannot_replay(setup):
    response = request(setup, ' Hiker@Example.com ')
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {'challengeId', 'expiresIn', 'resendAfter'}
    assert body['expiresIn'] == 600 and body['resendAfter'] == 45
    setup.send.assert_called_once_with('hiker@example.com', '123456')
    setup.get.assert_not_called()  # No account lookup/disclosure before proof.
    assert verify(setup, body['challengeId']).json() == {'customToken': 'custom-firebase-token'}
    setup.token.assert_called_once_with('existing-uid', app='firebase-test-app')
    assert verify(setup, body['challengeId']).status_code == 422
    assert 'no-store' in response.headers['cache-control']


def test_code_is_hashed_at_rest_and_bound_to_email(setup):
    challenge = request(setup).json()['challengeId']
    with otp.connection() as db:
        row = dict(db.execute('SELECT * FROM email_codes').fetchone())
    assert '123456' not in str(row) and 'hiker@example.com' not in str(row)
    assert verify(setup, challenge, email='other@example.com').status_code == 422
    assert verify(setup, challenge).status_code == 200


def test_failed_guesses_are_committed_and_limit_correct_code(setup):
    challenge = request(setup).json()['challengeId']
    for _ in range(5):
        assert verify(setup, challenge, '000000').status_code == 422
    assert verify(setup, challenge).status_code == 422
    setup.token.assert_not_called()


def test_expiry_and_resend_invalidate_only_old_code(setup, monkeypatch):
    clock = [10000.0]
    monkeypatch.setattr(otp.time, 'time', lambda: clock[0])
    first = request(setup).json()['challengeId']
    response = request(setup)
    assert response.status_code == 429 and int(response.headers['retry-after']) >= 45
    clock[0] += 46
    second = request(setup).json()['challengeId']
    assert verify(setup, first).status_code == 422
    clock[0] += 601
    assert verify(setup, second).status_code == 422


def test_failed_delivery_cannot_be_verified_or_bypass_hourly_limits(setup, monkeypatch):
    setup.send.side_effect = HTTPException(503, 'Could not send code')
    for _ in range(5):
        assert request(setup).status_code == 503
    assert request(setup).status_code == 429
    with otp.connection() as db:
        assert db.execute('SELECT count(*) FROM email_codes').fetchone()[0] == 0


def test_parallel_correct_proofs_only_consume_once(setup):
    challenge = request(setup).json()['challengeId']
    value = otp.VerifyRequest(email='hiker@example.com', challengeId=challenge, code='123456')
    def check(_):
        try:
            otp.consume(value, 'test-ip')
            return True
        except HTTPException:
            return False
    with ThreadPoolExecutor(max_workers=4) as pool:
        assert sum(pool.map(check, range(4))) == 1


def test_new_account_has_no_password_and_is_email_verified(setup, monkeypatch):
    challenge = request(setup).json()['challengeId']
    setup.get.side_effect = otp.auth.UserNotFoundError('missing')
    create = Mock(return_value=setup.user)
    monkeypatch.setattr(otp.auth, 'create_user', create)
    assert verify(setup, challenge, name='Aasha').status_code == 200
    create.assert_called_once_with(email='hiker@example.com', email_verified=True, display_name='Aasha', app='firebase-test-app')


def test_disabled_accounts_and_failed_token_mint_cannot_reuse_proof(setup):
    challenge = request(setup).json()['challengeId']
    setup.user.disabled = True
    assert verify(setup, challenge).status_code == 403
    setup.token.assert_not_called()
    assert verify(setup, challenge).status_code == 422


def test_existing_unverified_account_becomes_verified_only_after_valid_code(setup, monkeypatch):
    setup.user.email_verified = False
    update = Mock(return_value=setup.user)
    monkeypatch.setattr(otp.auth, 'update_user', update)
    challenge = request(setup).json()['challengeId']
    assert verify(setup, challenge, '000000').status_code == 422
    update.assert_not_called()
    assert verify(setup, challenge).status_code == 200
    update.assert_called_once_with('existing-uid', email_verified=True, app='firebase-test-app')


def test_configuration_failure_sends_no_email_and_exposes_no_credentials(setup):
    setup.config.brevo_api_key = ''
    response = request(setup)
    assert response.status_code == 503
    setup.send.assert_not_called()
    assert setup.config.auth_otp_secret not in response.text


def test_provider_request_uses_brevo_server_key_and_does_not_follow_redirects(monkeypatch):
    from app.config import Settings
    monkeypatch.setattr(otp, 'settings', lambda: Settings(_env_file=None, brevo_api_key='server-key', brevo_sender_email='navo@example.com', brevo_sender_name='Navo Expeditions', auth_otp_secret='s' * 40))
    client = Mock()
    client.post.return_value.status_code = 201
    context = Mock()
    context.__enter__ = Mock(return_value=client)
    context.__exit__ = Mock(return_value=False)
    factory = Mock(return_value=context)
    monkeypatch.setattr(otp.httpx, 'Client', factory)
    otp.send_email('hiker@example.com', '123456')
    factory.assert_called_once_with(timeout=15, follow_redirects=False)
    args, kwargs = client.post.call_args
    assert args[0] == 'https://api.brevo.com/v3/smtp/email'
    assert kwargs['headers']['api-key'] == 'server-key'
    assert kwargs['json']['to'] == [{'email': 'hiker@example.com'}]
    assert kwargs['json']['sender'] == {'email': 'navo@example.com', 'name': 'Navo Expeditions'}
    client.post.return_value.status_code = 401
    with pytest.raises(HTTPException) as error:
        otp.send_email('hiker@example.com', '123456')
    assert 'server-key' not in error.value.detail


def test_identity_outage_consumes_proof_instead_of_allowing_replay(setup):
    challenge = request(setup).json()['challengeId']
    setup.token.side_effect = RuntimeError('private signing key information')
    response = verify(setup, challenge)
    assert response.status_code == 503 and 'private' not in response.text
    assert verify(setup, challenge).status_code == 422


def test_request_schema_rejects_bad_email_and_client_chosen_code(setup):
    assert request(setup, 'not-an-email').status_code == 422
    assert setup.client.post('/auth/email/request', json={'email': 'hiker@example.com', 'code': '123456'}).status_code == 422
    setup.send.assert_not_called()


def test_missing_firebase_credentials_prevents_provider_send(setup, monkeypatch):
    from app.database import FirebaseSetupError
    def unavailable():
        raise FirebaseSetupError('firebase_credentials_unavailable', 'Server Firebase credentials are unavailable.', 'Configure approved credentials.')
    monkeypatch.setattr(otp, 'firebase_app', unavailable)
    response = request(setup)
    assert response.status_code == 503
    setup.send.assert_not_called()
    setup.token.assert_not_called()
