from functools import lru_cache
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import settings

bearer = HTTPBearer(auto_error=False)

@lru_cache
def jwks(issuer: str):
    return jwt.PyJWKClient(f'{issuer}/.well-known/jwks.json', cache_keys=True, lifespan=300, timeout=10)

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    config = settings()
    if not config.clerk_issuer.startswith('https://'):
        raise HTTPException(503, 'Server authentication is not configured.')
    if not credentials:
        raise HTTPException(401, 'Sign in to continue.')
    try:
        key = jwks(config.clerk_issuer.rstrip('/')).get_signing_key_from_jwt(credentials.credentials).key
        claims = jwt.decode(credentials.credentials, key, algorithms=['RS256'], issuer=config.clerk_issuer.rstrip('/'), options={'require': ['exp', 'iat', 'nbf', 'iss', 'sub'], 'verify_aud': False}, leeway=5)
        allowed = [v.strip() for v in config.clerk_authorized_parties.split(',') if v.strip()]
        if claims.get('azp') and claims['azp'] not in allowed:
            raise ValueError('Untrusted authorized party')
        uid = claims['sub']
        if not isinstance(uid, str) or not uid.startswith('user_') or '/' in uid:
            raise ValueError('Invalid subject')
        return uid
    except Exception:
        raise HTTPException(401, 'Your session could not be verified. Sign in again.') from None
