from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from .database import firebase_app

bearer = HTTPBearer(auto_error=False)

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(401, 'Sign in to continue.')
    app = firebase_app()
    try:
        claims = auth.verify_id_token(credentials.credentials, app=app, check_revoked=True)
        uid = claims['uid']
        if not isinstance(uid, str) or not uid or '/' in uid or len(uid) > 128:
            raise ValueError('Invalid subject')
        return uid
    except Exception:
        raise HTTPException(401, 'Your session could not be verified. Sign in again.') from None
