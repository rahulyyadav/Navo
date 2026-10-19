"""Resumable account erasure. A durable job survives host restarts."""
from datetime import datetime, timezone, timedelta
from firebase_admin import auth, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .database import database

# Every field containing an account identity in shared history.
ERASURE_FIELDS = {
    'trailReviews': ['authorId'], 'reviewReports': ['authorId'],
    'messages': ['senderId'], 'alerts': ['senderId'], 'checkins': ['userId'],
    'invitations': ['inviterId', 'inviteeUserId'],
    'notifications': ['senderId', 'inviterId', 'inviteeUserId'],
    'joinRequests': ['id'], 'members': ['userId'],
}

def remaining_group(group, uid):
    ids = [member for member in group.get('memberIds', []) if member != uid]
    owner = group.get('ownerId')
    if owner == uid: owner = ids[0] if ids else None
    members = [{**member, 'role': 'leader' if member.get('userId') == owner else 'member'}
               for member in group.get('members', []) if member.get('userId') != uid]
    return {'memberIds': ids, 'members': members, 'ownerId': owner}

def process(uid):
    db = database(); job = db.collection('accountDeletions').document(uid)
    @firestore.transactional
    def claim(tx):
        data = job.get(transaction=tx).to_dict()
        if not data or data.get('status') == 'complete': return False
        if data.get('leaseUntil') and data['leaseUntil'] > datetime.now(timezone.utc): return False
        tx.update(job, {'leaseUntil': datetime.now(timezone.utc) + timedelta(minutes=10), 'status': 'pending'})
        return True
    if not claim(db.transaction()): return
    try:
        try: auth.update_user(uid, disabled=True)
        except auth.UserNotFoundError: pass
        for snap in db.collection('groups').where(filter=FieldFilter('memberIds', 'array_contains', uid)).stream():
            @firestore.transactional
            def leave(tx):
                group = snap.reference.get(transaction=tx).to_dict()
                if not group or uid not in group.get('memberIds', []): return
                remaining = remaining_group(group, uid)
                tx.update(snap.reference, {**remaining, 'updatedAt': firestore.SERVER_TIMESTAMP,
                                          'status': group.get('status', 'active') if remaining['memberIds'] else 'closed'})
                tx.delete(snap.reference.collection('members').document(uid))
                # Revoke links created under the departing leader's authority.
                if group.get('ownerId') == uid:
                    tx.delete(snap.reference.collection('private').document('joinLink'))
                    if remaining['ownerId']:
                        tx.update(snap.reference.collection('members').document(remaining['ownerId']), {'role': 'leader'})
            leave(db.transaction())
            if not (snap.reference.get().to_dict() or {}).get('memberIds'):
                db.recursive_delete(snap.reference)
        for collection, fields in ERASURE_FIELDS.items():
            for field in fields:
                for snap in db.collection_group(collection).where(filter=FieldFilter(field, '==', uid)).stream():
                    if collection == 'trailReviews': db.recursive_delete(snap.reference)
                    else: snap.reference.delete()
        for snap in db.collection_group('alerts').where(filter=FieldFilter('acknowledgedBy', 'array_contains', uid)).stream():
            snap.reference.update({'acknowledgedBy': firestore.ArrayRemove([uid])})
        for snap in db.collection('deviceOwners').where(filter=FieldFilter('uid', '==', uid)).stream(): snap.reference.delete()
        for snap in db.collection('pushJobs').where(filter=FieldFilter('recipients', 'array_contains', uid)).stream():
            snap.reference.update({'recipients': firestore.ArrayRemove([uid])})
        db.recursive_delete(db.collection('users').document(uid))
        for collection in ['quotas', 'requestLimits']:
            db.collection(collection).document(uid).delete()
        db.collection('aiBudgets').document('user-' + uid).delete()
        try: auth.delete_user(uid)
        except auth.UserNotFoundError: pass
        # Keep only a tombstone so retries cannot recreate the account during cleanup.
        job.set({'status': 'complete', 'completedAt': firestore.SERVER_TIMESTAMP})
    except Exception:
        job.update({'status': 'pending', 'leaseUntil': datetime.now(timezone.utc), 'lastError': 'Cleanup needs another attempt.'})

def run():
    for snap in database().collection('accountDeletions').where(filter=FieldFilter('status', '==', 'pending')).limit(10).stream():
        process(snap.id)
