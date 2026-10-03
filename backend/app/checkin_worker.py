"""One scheduled pass to report overdue opt-in 4-hour check-ins. No client polling."""
from datetime import datetime, timezone
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .database import database
from .main import identifier

def run():
    db = database(); now = datetime.now(timezone.utc)
    for snap in db.collection_group('members').where(filter=FieldFilter('checkinDueAt', '<=', now)).limit(100).stream():
        group_ref = snap.reference.parent.parent
        if not group_ref: continue
        @firestore.transactional
        def commit(tx):
            member = snap.reference.get(transaction=tx).to_dict()
            group = group_ref.get(transaction=tx).to_dict()
            if not member or not group or snap.id not in group.get('memberIds', []) or not member.get('checkinDueAt') or member['checkinDueAt'] > now: return
            aid = identifier(snap.id, member['checkinDueAt'].isoformat())
            data = {'id': aid, 'groupId': group_ref.id, 'kind': 'missed-checkin', 'senderId': snap.id, 'senderName': member['displayName'], 'message': f"{member['displayName']} has not checked in within the agreed 4-hour interval. Contact them to confirm their situation.", 'latitude': None, 'longitude': None, 'acknowledgedBy': [], 'resolvedAt': None, 'createdAt': firestore.SERVER_TIMESTAMP}
            tx.set(group_ref.collection('alerts').document(aid), data)
            tx.update(snap.reference, {'checkInStatus': 'overdue', 'checkinDueAt': firestore.DELETE_FIELD})
            tx.set(db.collection('pushJobs').document(aid), {'groupId': group_ref.id, 'alertId': aid, 'recipients': group['memberIds'], 'status': 'pending', 'createdAt': firestore.SERVER_TIMESTAMP})
            for uid in group['memberIds']:
                tx.set(db.collection('users').document(uid).collection('notifications').document(aid), {**data, 'type': 'alert', 'groupName': group['name'], 'read': False})
        commit(db.transaction())

if __name__ == '__main__': run()
