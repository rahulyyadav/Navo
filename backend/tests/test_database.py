from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app import database as storage


@pytest.fixture(autouse=True)
def isolated_admin(monkeypatch):
    storage.firebase_app.cache_clear()
    storage.database.cache_clear()
    monkeypatch.setattr(storage, 'settings', lambda: SimpleNamespace(
        firebase_project_id='test-project', google_application_credentials='',
        firebase_private_key='', firebase_client_email=''))
    monkeypatch.setattr(storage.firebase_admin, 'get_app', Mock(side_effect=ValueError()))
    monkeypatch.setattr(storage.firebase_admin, 'initialize_app', Mock(return_value=object()))
    # No test may fall through to real ADC discovery or credential parsing.
    monkeypatch.setattr(storage.credentials, 'ApplicationDefault', Mock(return_value=Mock()))
    monkeypatch.setattr(storage.credentials, 'Certificate', Mock(return_value=Mock()))
    yield
    storage.firebase_app.cache_clear()
    storage.database.cache_clear()


def configure(monkeypatch, **values):
    config = storage.settings()
    for key, value in values.items():
        setattr(config, key, value)
    monkeypatch.setattr(storage, 'settings', lambda: config)


def test_missing_project_fails_before_loading_credentials(monkeypatch):
    configure(monkeypatch, firebase_project_id='')
    with pytest.raises(storage.FirebaseSetupError) as error:
        storage.firebase_app()
    assert error.value.status_code == 503
    assert error.value.code == 'firebase_project_missing'
    storage.credentials.ApplicationDefault.assert_not_called()


@pytest.mark.parametrize('values', [
    {'firebase_client_email': 'fixture@example.invalid'},
    {'firebase_private_key': 'synthetic-test-value'},
])
def test_partial_inline_credentials_never_silently_fall_back(monkeypatch, values):
    configure(monkeypatch, **values)
    with pytest.raises(storage.FirebaseSetupError) as error:
        storage.firebase_app()
    assert error.value.code == 'firebase_credentials_incomplete'
    storage.credentials.ApplicationDefault.assert_not_called()
    storage.credentials.Certificate.assert_not_called()


def test_explicit_certificate_path_does_not_use_adc(monkeypatch):
    configure(monkeypatch, google_application_credentials='/not-a-real-test-credential.json')
    storage.firebase_app()
    storage.credentials.Certificate.assert_called_once_with('/not-a-real-test-credential.json')
    storage.credentials.ApplicationDefault.assert_not_called()
    storage.credentials.Certificate.return_value.get_credential.assert_called_once()


def test_complete_inline_pair_has_precedence_over_stale_file(monkeypatch):
    configure(monkeypatch, google_application_credentials='/stale-test-path.json',
              firebase_client_email='fixture@example.invalid', firebase_private_key='synthetic\\nvalue')
    storage.firebase_app()
    value = storage.credentials.Certificate.call_args.args[0]
    assert value['project_id'] == 'test-project'
    assert value['private_key'] == 'synthetic\nvalue'
    storage.credentials.Certificate.assert_called_once()
    storage.credentials.ApplicationDefault.assert_not_called()


def test_bad_explicit_file_does_not_fall_back_or_disclose_sdk_error(monkeypatch):
    configure(monkeypatch, google_application_credentials='/not-a-real-test-credential.json')
    storage.credentials.Certificate.side_effect = ValueError('private path/key diagnostic')
    with pytest.raises(storage.FirebaseSetupError) as error:
        storage.firebase_app()
    assert error.value.code == 'firebase_credentials_unavailable'
    assert 'private' not in error.value.detail
    assert 'private' not in error.value.action
    storage.credentials.ApplicationDefault.assert_not_called()
    storage.firebase_admin.initialize_app.assert_not_called()


def test_failed_adc_can_recover_and_success_is_cached():
    credential = storage.credentials.ApplicationDefault.return_value
    credential.get_credential.side_effect = [ValueError('private SDK detail'), object()]
    with pytest.raises(storage.FirebaseSetupError):
        storage.firebase_app()
    assert storage.firebase_app.cache_info().currsize == 0
    app = storage.firebase_app()
    assert storage.firebase_app() is app
    storage.firebase_admin.initialize_app.assert_called_once_with(credential, {'projectId': 'test-project'})
    assert credential.get_credential.call_count == 2


def test_existing_default_app_is_reused(monkeypatch):
    app = object()
    monkeypatch.setattr(storage.firebase_admin, 'get_app', Mock(return_value=app))
    assert storage.firebase_app() is app
    storage.firebase_admin.initialize_app.assert_not_called()
    storage.credentials.ApplicationDefault.assert_not_called()


def test_concurrent_first_requests_initialize_only_once(monkeypatch):
    apps = []
    def get_app():
        if not apps:
            raise ValueError()
        return apps[0]
    def initialize(*args, **kwargs):
        apps.append(object())
        return apps[0]
    monkeypatch.setattr(storage.firebase_admin, 'get_app', get_app)
    initializer = Mock(side_effect=initialize)
    monkeypatch.setattr(storage.firebase_admin, 'initialize_app', initializer)
    barrier = Barrier(4)
    def request():
        barrier.wait(timeout=5)
        return storage.firebase_app()
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: request(), range(4)))
    assert all(result is results[0] for result in results)
    initializer.assert_called_once()
