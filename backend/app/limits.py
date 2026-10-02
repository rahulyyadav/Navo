"""Per-account budget shared across API processes through Firestore."""
from datetime import datetime, timezone
from fastapi import HTTPException
from firebase_admin import firestore

def limit_requests(db, uid, maximum=90):
    ref = db.collection('requestLimits').document(uid)
    window = datetime.now(timezone.utc).strftime('%Y-%m-%d-%H-%M')
    @firestore.transactional
    def commit(tx):
        previous = ref.get(transaction=tx).to_dict() or {}
        count = previous.get('count', 0) if previous.get('window') == window else 0
        if count >= maximum:
            raise HTTPException(429, 'Too many requests. Wait a minute and try again.', headers={'Retry-After': '60'})
        tx.set(ref, {'window': window, 'count': count + 1})
    commit(db.transaction())
