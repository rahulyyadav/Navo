"""Persistent daily ceilings. Failed provider attempts still consume a reservation."""
from datetime import datetime, timezone
from fastapi import HTTPException
from firebase_admin import firestore
from .config import settings


def reserve_chat(db, uid):
    config = settings()
    if not config.ai_enabled:
        raise HTTPException(503, 'Navo AI is paused. Your maps and saved plans remain available.')
    day = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    global_ref = db.collection('aiBudgets').document('global')
    user_ref = db.collection('aiBudgets').document('user-' + uid)
    @firestore.transactional
    def reserve(tx):
        global_value = global_ref.get(transaction=tx).to_dict() or {}
        user_value = user_ref.get(transaction=tx).to_dict() or {}
        global_count = global_value.get('count', 0) if global_value.get('day') == day else 0
        user_count = user_value.get('count', 0) if user_value.get('day') == day else 0
        if global_count >= config.ai_daily_requests or user_count >= config.ai_user_daily_requests:
            raise HTTPException(429, 'Today’s AI allowance has been reached. Try again tomorrow; your route tools still work.')
        tx.set(global_ref, {'day': day, 'count': global_count + 1})
        tx.set(user_ref, {'day': day, 'count': user_count + 1})
    reserve(db.transaction())
