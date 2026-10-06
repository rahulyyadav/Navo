from functools import lru_cache
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import HTTPException
from .config import settings

@lru_cache
def firebase_app():
    config = settings()
    if not config.firebase_project_id:
        raise HTTPException(503, 'Firebase is not configured on the server.')
    try:
        if not firebase_admin._apps:
            credential = credentials.Certificate(config.google_application_credentials) if config.google_application_credentials else credentials.ApplicationDefault()
            if config.firebase_private_key and config.firebase_client_email:
                credential = credentials.Certificate({'type': 'service_account', 'project_id': config.firebase_project_id, 'client_email': config.firebase_client_email, 'private_key': config.firebase_private_key.replace('\\n', '\n'), 'token_uri': 'https://oauth2.googleapis.com/token'})
            # Validate local/ADC credentials before treating a setup failure as an invalid user token.
            credential.get_credential()
            firebase_admin.initialize_app(credential, {'projectId': config.firebase_project_id})
        return firebase_admin.get_app()
    except Exception:
        raise HTTPException(503, 'Server Firebase credentials are unavailable.') from None

@lru_cache
def database():
    return firestore.client(app=firebase_app())
