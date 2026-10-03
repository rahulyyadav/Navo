from functools import lru_cache
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import HTTPException
from .config import settings

@lru_cache
def database():
    config = settings()
    if not config.firebase_project_id:
        raise HTTPException(503, 'Firebase is not configured on the server.')
    try:
        if not firebase_admin._apps:
            credential = None
            if config.firebase_private_key and config.firebase_client_email:
                credential = credentials.Certificate({'type': 'service_account', 'project_id': config.firebase_project_id, 'client_email': config.firebase_client_email, 'private_key': config.firebase_private_key.replace('\\n', '\n'), 'token_uri': 'https://oauth2.googleapis.com/token'})
            elif config.google_application_credentials:
                credential = credentials.Certificate(config.google_application_credentials)
            firebase_admin.initialize_app(credential, {'projectId': config.firebase_project_id})
        return firestore.client()
    except Exception:
        raise HTTPException(503, 'Server Firebase credentials are unavailable.') from None
