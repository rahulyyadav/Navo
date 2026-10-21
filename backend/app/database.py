from functools import lru_cache
from threading import Lock
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import HTTPException
from .config import settings

_initialization_lock = Lock()


class FirebaseSetupError(HTTPException):
    """Allowlisted diagnostics only; never include credential contents or SDK errors."""

    def __init__(self, code, detail, action):
        super().__init__(503, detail)
        self.code = code
        self.action = action


@lru_cache
def firebase_app():
    config = settings()
    if not config.firebase_project_id:
        raise FirebaseSetupError('firebase_project_missing', 'Firebase is not configured on the server.', 'Set FIREBASE_PROJECT_ID in the backend environment and restart the backend.')
    if bool(config.firebase_private_key) != bool(config.firebase_client_email):
        raise FirebaseSetupError('firebase_credentials_incomplete', 'Server Firebase credentials are incomplete.', 'Configure both server-only inline credential fields, or remove both and use approved ADC or a service-account file. Restart the backend after configuration changes.')
    # lru_cache does not serialize concurrent cache misses. Guard SDK initialization
    # so readiness and the first authenticated request cannot initialize twice.
    with _initialization_lock:
        try:
            return firebase_admin.get_app()
        except ValueError:
            pass  # The default app has not been initialized yet.
        try:
            # Preserve the intended inline-pair precedence without first trying an
            # unrelated, possibly stale file path. Never fall back after a failure.
            if config.firebase_private_key and config.firebase_client_email:
                credential = credentials.Certificate({'type': 'service_account', 'project_id': config.firebase_project_id, 'client_email': config.firebase_client_email, 'private_key': config.firebase_private_key.replace('\\n', '\n'), 'token_uri': 'https://oauth2.googleapis.com/token'})
            elif config.google_application_credentials:
                credential = credentials.Certificate(config.google_application_credentials)
            else:
                credential = credentials.ApplicationDefault()
            # Validate local/ADC credentials before treating a setup failure as an invalid user token.
            credential.get_credential()
            return firebase_admin.initialize_app(credential, {'projectId': config.firebase_project_id})
        except Exception:
            raise FirebaseSetupError('firebase_credentials_unavailable', 'Server Firebase credentials are unavailable.', 'Configure approved server ADC or a service-account file. Restart after environment changes; check project access separately. Client Firebase configuration is not an Admin credential.') from None

@lru_cache
def database():
    return firestore.client(app=firebase_app())
