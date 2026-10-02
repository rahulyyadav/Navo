import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app import auth

@pytest.mark.parametrize('claims', [{'uid':'person','email_verified':False}, {'uid':'bad/path','email_verified':True}, {'uid':'','email_verified':True}])
def test_invalid_identity_is_rejected(monkeypatch, claims):
    monkeypatch.setattr(auth, 'database', lambda: None)
    monkeypatch.setattr(auth, 'limit_requests', lambda db, uid: None)
    monkeypatch.setattr(auth.auth, 'verify_id_token', lambda *a, **k: claims)
    with pytest.raises(HTTPException):
        auth.current_user(HTTPAuthorizationCredentials(scheme='Bearer',credentials='test-only'))

def test_token_verification_checks_revocation(monkeypatch):
    monkeypatch.setattr(auth, 'database', lambda: None)
    monkeypatch.setattr(auth, 'limit_requests', lambda db, uid: None)
    def verify(token, check_revoked):
        assert check_revoked is True
        return {'uid':'person','email_verified':True}
    monkeypatch.setattr(auth.auth, 'verify_id_token', verify)
    assert auth.current_user(HTTPAuthorizationCredentials(scheme='Bearer',credentials='test-only')) == 'person'
