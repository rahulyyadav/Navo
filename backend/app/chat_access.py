"""Chat authentication and budgets without service-account or Firestore access."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from .auth import bearer
from .config import settings


def chat_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(401, 'Sign in to use Navo AI.')
    config = settings()
    if not config.firebase_web_api_key:
        raise HTTPException(503, {'code': 'firebase_web_key_missing'})
    # Firebase's end-user lookup validates the ID token using the existing public
    # project API key. No Admin SDK credentials or database permissions are needed.
    try:
        response = httpx.post(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
            params={'key': config.firebase_web_api_key},
            json={'idToken': credentials.credentials}, timeout=15,
        )
        if response.status_code in (429, 403) or response.status_code >= 500:
            raise HTTPException(503, 'Chat sign-in is temporarily unavailable. Please retry.')
        if response.status_code != 200:
            raise HTTPException(401, 'Your session could not be verified. Sign in again.')
        users = response.json().get('users', [])
        user = users[0] if len(users) == 1 else {}
        uid = user.get('localId')
        if not isinstance(uid, str) or not uid or '/' in uid or len(uid) > 128 or user.get('disabled'):
            raise HTTPException(401, 'Your session could not be verified. Sign in again.')
        if user.get('emailVerified') is not True:
            raise HTTPException(403, 'Verify your email before using Navo AI, then sign in again.')
        return uid
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(503, 'Chat sign-in is temporarily unavailable. Please retry.') from None


class DailyAllowanceReached(HTTPException):
    pass


def reserve_local_chat(uid: str, provider='nebius'):
    """Atomic persistent limits shared by processes on this host's SQLite file."""
    config = settings()
    if not config.ai_enabled:
        raise HTTPException(503, 'Navo AI is paused. Your maps and saved plans remain available.')
    now = datetime.now(timezone.utc)
    day = now.strftime('%Y-%m-%d')
    minute = now.strftime('%Y-%m-%d-%H-%M')
    fallback = provider == 'openrouter'
    prefix = 'openrouter-' if fallback else ''
    limits = [(prefix + 'global', day, config.openrouter_daily_requests if fallback else config.ai_daily_requests),
              (prefix + 'user-' + uid, day, config.openrouter_user_daily_requests if fallback else config.ai_user_daily_requests),
              ('minute-' + uid, minute, 90)]
    try:
        path = Path(config.chat_budget_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(path, timeout=10) as db:
            db.execute('CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, window TEXT NOT NULL, count INTEGER NOT NULL)')
            db.execute('BEGIN IMMEDIATE')
            for key, window, maximum in limits:
                previous = db.execute('SELECT window, count FROM budgets WHERE id = ?', (key,)).fetchone()
                count = previous[1] if previous and previous[0] == window else 0
                if count >= maximum:
                    error = HTTPException if key.startswith('minute-') else DailyAllowanceReached
                    raise error(429, 'Today’s AI allowance has been reached. Try again tomorrow; your route tools still work.' if key[:7] != 'minute-' else 'Too many requests. Wait a minute and try again.')
                db.execute('INSERT OR REPLACE INTO budgets (id, window, count) VALUES (?, ?, ?)', (key, window, count + 1))
    except (OSError, sqlite3.Error):
        raise HTTPException(503, 'Chat request limits are temporarily unavailable. Please retry.') from None


def reserve_journey_ai(uid):
    try:
        reserve_local_chat(uid)
        return 'nebius'
    except DailyAllowanceReached:
        if not settings().openrouter_api_key:
            raise
        reserve_local_chat(uid, 'openrouter')
        return 'openrouter'
