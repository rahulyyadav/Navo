"""Passwordless email proofs. Brevo delivers codes; Firebase owns identities/sessions."""
import hashlib
import hmac
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Request
from firebase_admin import auth
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .config import settings
from .database import firebase_app

router = APIRouter(prefix='/auth/email', tags=['email authentication'])
TTL = 600
RESEND = 45
MAX_ATTEMPTS = 5
INVALID = 'This code is invalid or has expired. Request a new code and try again.'


class EmailRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    email: str = Field(min_length=3, max_length=254)

    @field_validator('email')
    @classmethod
    def email_address(cls, value):
        value = value.lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address.')
        return value


class VerifyRequest(EmailRequest):
    challengeId: str = Field(pattern=r'^[A-Za-z0-9_-]{43}$')
    code: str = Field(pattern=r'^\d{6}$')
    name: str | None = Field(default=None, min_length=2, max_length=100)


def configured():
    config = settings()
    if not config.brevo_api_key or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', config.brevo_sender_email) or len(config.auth_otp_secret) < 32:
        raise HTTPException(503, 'Email sign-in is not available yet. Please try Google or contact support.')
    return config


def digest(value):
    return hmac.new(configured().auth_otp_secret.encode(), value.encode(), hashlib.sha256).hexdigest()


@contextmanager
def connection():
    db = None
    try:
        path = Path(settings().auth_otp_store_path)
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        db = sqlite3.connect(path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('CREATE TABLE IF NOT EXISTS email_codes (id TEXT PRIMARY KEY, email_key TEXT NOT NULL, code_hash TEXT NOT NULL, created REAL NOT NULL, expires REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0, delivered INTEGER NOT NULL DEFAULT 0)')
        db.execute('CREATE INDEX IF NOT EXISTS email_codes_email ON email_codes(email_key, created)')
        db.execute('CREATE TABLE IF NOT EXISTS email_code_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires REAL NOT NULL)')
        with db:
            yield db
    except (OSError, sqlite3.Error):
        raise HTTPException(503, 'Email sign-in is temporarily unavailable. Please retry shortly.') from None
    finally:
        if db is not None:
            db.close()


def limited(db, scope, subject, limit, now):
    # Persist limits across workers/restarts. Never trust arbitrary forwarded IP headers.
    bucket = f'{scope}:{digest(subject)}:{int(now // 3600)}'
    row = db.execute('SELECT count FROM email_code_limits WHERE bucket=?', (bucket,)).fetchone()
    if row and row['count'] >= limit:
        raise HTTPException(429, 'Too many code requests or attempts. Please try again later.', headers={'Retry-After': '3600'})
    db.execute('INSERT INTO email_code_limits VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count=count+1', (bucket, now + 7200))


def reserve(email, ip, code):
    now = time.time()
    challenge = secrets.token_urlsafe(32)
    email_key = digest(email)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM email_codes WHERE expires < ?', (now - 3600,))
        db.execute('DELETE FROM email_code_limits WHERE expires < ?', (now,))
        last = db.execute('SELECT created FROM email_codes WHERE email_key=? ORDER BY created DESC LIMIT 1', (email_key,)).fetchone()
        if last and now - last['created'] < RESEND:
            wait = max(1, int(RESEND - (now - last['created'])) + 1)
            raise HTTPException(429, 'Please wait before requesting another code.', headers={'Retry-After': str(wait)})
        limited(db, 'send-email', email, 5, now)
        limited(db, 'send-ip', ip, 20, now)
        limited(db, 'send-global', 'all', 200, now)
        db.execute('INSERT INTO email_codes (id,email_key,code_hash,created,expires) VALUES (?,?,?,?,?)', (challenge, email_key, digest(f'{challenge}:{email}:{code}'), now, now + TTL))
    return challenge


def delivered(challenge):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT email_key FROM email_codes WHERE id=?', (challenge,)).fetchone()
        if not row:
            raise HTTPException(503, 'Please request another code.')
        db.execute('UPDATE email_codes SET consumed=1 WHERE email_key=? AND id<>?', (row['email_key'], challenge))
        db.execute('UPDATE email_codes SET delivered=1 WHERE id=?', (challenge,))


def consume(value, ip):
    error = False
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        now = time.time()
        limited(db, 'verify-ip', ip, 100, now)
        row = db.execute('SELECT * FROM email_codes WHERE id=? AND email_key=?', (value.challengeId, digest(value.email))).fetchone()
        if not row or not row['delivered'] or row['consumed'] or row['expires'] <= now or row['attempts'] >= MAX_ATTEMPTS:
            error = True
        elif not hmac.compare_digest(row['code_hash'], digest(f'{value.challengeId}:{value.email}:{value.code}')):
            db.execute('UPDATE email_codes SET attempts=attempts+1 WHERE id=?', (value.challengeId,))
            error = True
        else:
            db.execute('UPDATE email_codes SET consumed=1 WHERE id=?', (value.challengeId,))
    # Raise after commit so failed guesses count toward the attempt limit.
    if error:
        raise HTTPException(422, INVALID)


def send_email(email, code):
    config = configured()
    try:
        with httpx.Client(timeout=15, follow_redirects=False) as client:
            response = client.post('https://api.brevo.com/v3/smtp/email', headers={'api-key': config.brevo_api_key, 'accept': 'application/json'}, json={
                'sender': {'email': config.brevo_sender_email, 'name': config.brevo_sender_name.strip() or 'Navo'},
                'to': [{'email': email}],
                'subject': f'{code} is your Navo verification code',
                'textContent': f'Your Navo verification code is {code}.\n\nIt expires in 10 minutes and can be used only once. Do not share it. If you did not request this code, you can ignore this email.',
                'htmlContent': f'<html><body style="background:#0D141A;color:#fff;padding:32px;font-family:Arial,sans-serif"><h2>NAVO</h2><p>Your next journey starts here.</p><p>Your verification code:</p><p style="color:#E4FF89;font-size:36px;letter-spacing:8px;font-weight:bold">{code}</p><p>Expires in 10 minutes. Never share this code.</p><p>If you did not request it, you can ignore this email.</p></body></html>',
            })
        if response.status_code != 201:
            raise ValueError('Email delivery rejected')
    except (httpx.HTTPError, ValueError):
        # Never return provider bodies, credentials, email addresses or codes in errors.
        raise HTTPException(503, 'We could not send your code. Please try again shortly.') from None


@router.post('/request')
def request_code(value: EmailRequest, request: Request):
    configured()
    firebase_app()  # Fail before mailing when Firebase credentials are unavailable.
    code = f'{secrets.randbelow(1000000):06d}'
    challenge = reserve(value.email, request.client.host if request.client else 'unknown', code)
    try:
        send_email(value.email, code)
        delivered(challenge)
    except HTTPException:
        with connection() as db:
            db.execute('DELETE FROM email_codes WHERE id=?', (challenge,))
        raise
    return {'challengeId': challenge, 'expiresIn': TTL, 'resendAfter': RESEND}


@router.post('/verify')
def verify_code(value: VerifyRequest, request: Request):
    configured()
    app = firebase_app()
    consume(value, request.client.host if request.client else 'unknown')
    try:
        try:
            user = auth.get_user_by_email(value.email, app=app)
        except auth.UserNotFoundError:
            try:
                user = auth.create_user(email=value.email, email_verified=True, **({'display_name': value.name} if value.name else {}), app=app)
            except auth.EmailAlreadyExistsError:
                user = auth.get_user_by_email(value.email, app=app)
        if user.disabled:
            raise HTTPException(403, 'Sign-in is unavailable for this account. Contact support.')
        if not user.email_verified:
            user = auth.update_user(user.uid, email_verified=True, app=app)
        token = auth.create_custom_token(user.uid, app=app)
        return {'customToken': token.decode('utf-8') if isinstance(token, bytes) else token}
    except HTTPException:
        raise
    except Exception:
        # Consumed proofs never become reusable if identity exchange fails.
        raise HTTPException(503, 'We could not finish signing you in. Please request a new code.') from None
