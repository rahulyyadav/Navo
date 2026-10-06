"""Run one bounded push queue pass: python -m app.push_worker.
Schedule this on your server. Expo acceptance is not delivery confirmation.
"""
from datetime import datetime, timezone, timedelta
import httpx
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .database import database
from .config import settings

def headers():
    token = settings().expo_access_token
    return {"Authorization": f"Bearer {token}"} if token else {}

def collect_receipts(db):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    for snapshot in db.collection("pushJobs").where(filter=FieldFilter("status", "==", "submitted")).limit(25).stream():
        job = snapshot.to_dict()
        if job.get("processedAt") and job["processedAt"] > cutoff: continue
        ticket_ids = [item["id"] for item in job.get("tickets", []) if item.get("status") == "ok" and item.get("id")]
        if not ticket_ids:
            snapshot.reference.update({"status": "submission-error"}); continue
        try:
            response = httpx.post("https://exp.host/--/api/v2/push/getReceipts", json={"ids": ticket_ids}, headers=headers(), timeout=20)
            response.raise_for_status()
            receipts = response.json().get("data", {})
            for ticket, device_path in zip(job.get("tickets", []), job.get("devicePaths", [])):
                receipt = receipts.get(ticket.get("id"), {})
                if receipt.get("details", {}).get("error") == "DeviceNotRegistered":
                    db.document(device_path).delete()
            complete = all(key in receipts for key in ticket_ids)
            expired = job.get("processedAt") and job["processedAt"] < datetime.now(timezone.utc) - timedelta(hours=24)
            snapshot.reference.update({"receipts": receipts, "status": "receipts-checked" if complete else "receipts-expired" if expired else "submitted"})
        except Exception:
            snapshot.reference.update({"lastError": "Receipt lookup failed; retry on next scheduled pass."})


def run():
    db = database()
    collect_receipts(db)
    jobs = db.collection('pushJobs').where(filter=FieldFilter('status', '==', 'pending')).limit(25).stream()
    for snapshot in jobs:
        @firestore.transactional
        def claim(tx):
            item = snapshot.reference.get(transaction=tx).to_dict()
            if item.get('leaseUntil') and item['leaseUntil'] > datetime.now(timezone.utc): return None
            if item.get('status') != 'pending': return None
            if item.get('attempts', 0) >= 5:
                tx.update(snapshot.reference, {'status': 'failed', 'lastError': 'Five submission attempts exhausted.'}); return None
            tx.update(snapshot.reference, {'leaseUntil': datetime.now(timezone.utc) + timedelta(minutes=2), 'attempts': item.get('attempts', 0) + 1})
            return item
        job = claim(db.transaction())
        if not job: continue
        try:
            group = db.collection('groups').document(job['groupId']).get().to_dict() or {}
            alert = db.collection('groups').document(job['groupId']).collection('alerts').document(job['alertId']).get().to_dict() or {}
            if alert.get('resolvedAt'):
                snapshot.reference.update({'status': 'resolved-before-send'}); continue
            messages = []; device_paths = []
            for uid in job['recipients']:
                if uid not in group.get('memberIds', []): continue
                for device in db.collection('users').document(uid).collection('deviceTokens').limit(5).stream():
                    owner = db.collection('deviceOwners').document(device.id).get().to_dict() or {}
                    if owner.get('uid') != uid: continue
                    device_paths.append(device.reference.path)
                    messages.append({'to': device.to_dict()['token'], 'title': 'Navo · group update', 'body': 'Open Navo to view a new group alert.', 'data': {'groupId': job['groupId'], 'alertId': job['alertId']}, 'channelId': 'trek-alerts', 'sound': 'default'})
            tickets = []
            for offset in range(0, len(messages), 100):
                response = httpx.post('https://exp.host/--/api/v2/push/send', json=messages[offset:offset + 100], headers=headers(), timeout=20)
                response.raise_for_status()
                batch = response.json().get('data', [])
                if not isinstance(batch, list): raise ValueError('Invalid push response')
                tickets.extend(batch)
            for ticket, path in zip(tickets, device_paths):
                if ticket.get('details', {}).get('error') == 'DeviceNotRegistered': db.document(path).delete()
            snapshot.reference.update({'status': 'submitted' if messages else 'no-devices', 'tickets': tickets, 'devicePaths': device_paths, 'processedAt': firestore.SERVER_TIMESTAMP})
        except Exception:
            snapshot.reference.update({'lastError': 'Push submission failed; retry after lease expiration.'})

if __name__ == '__main__':
    run()
