from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from .database import firebase_app, database
from .limits import limit_requests

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
        if not claims.get('email_verified'):
            raise HTTPException(403, 'Verify your email before using cloud groups and preparation. Check your inbox, then retry the connection.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, 'Your session could not be verified. Sign in again.') from None
    limit_requests(database(), uid)
    return uid
