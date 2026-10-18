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
            raise HTTPException(403, 'Verify your email before using shared groups, reviews and preparation. Check your inbox, then retry the connection.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, 'Your session could not be verified. Sign in again.') from None
    if database().collection('accountDeletions').document(uid).get().exists:
        raise HTTPException(403, 'This account is being deleted.')
    limit_requests(database(), uid)
    return uid


def recently_authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    from datetime import datetime, timezone
    if not credentials: raise HTTPException(401, 'Sign in to continue.')
    try:
        claims = auth.verify_id_token(credentials.credentials, app=firebase_app(), check_revoked=True)
        uid = claims['uid']
        if not isinstance(uid, str) or not uid or '/' in uid or len(uid) > 128: raise ValueError()
        age = datetime.now(timezone.utc).timestamp() - claims.get('auth_time', 0)
        if age < 0 or age > 300:
            raise HTTPException(401, 'For account deletion, sign out and sign in again, then retry within five minutes.')
        return uid
    except HTTPException: raise
    except Exception:
        raise HTTPException(401, 'Sign in again to confirm account deletion.') from None
