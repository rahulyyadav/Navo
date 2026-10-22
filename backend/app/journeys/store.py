import hashlib
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from contextlib import contextmanager
from pathlib import Path
from fastapi import HTTPException
from ..config import settings
from .models import Template
from ..database import database
from firebase_admin import firestore

def destination_key(point, origin=None, start_date=None):
    # Coarse origin area/date avoid reusing route reviews prepared for a different
    # starting region or departure window. Never hash a user-provided point ID.
    name = point.name.casefold()
    if point.canonicalId == 'annapurna-base-camp' or ('annapurna' in name and 'base' in name or name in ('abc', 'abc trek')) and abs(point.latitude-28.53)<0.35 and abs(point.longitude-83.88)<0.35:
        raw = 'annapurna-base-camp-v1'
    elif point.canonicalId == 'mardi-himal' or ('mardi' in name and abs(point.latitude-28.48)<0.2 and abs(point.longitude-83.94)<0.2):
        raw = 'mardi-himal-v1'
    else:
        raw = f'{point.id}|{round(point.latitude, 4)}|{round(point.longitude, 4)}'
    # A selected Photon place and a curated trek hint can share nearby coordinates
    # while referring to different endpoints; include the user-visible geography
    # so an old cached draft cannot override a more precise selection.
    raw += '|departure-access-v2|context:' + '|'.join(filter(None, [
        (point.fullName or '').casefold(), (point.region or '').casefold(),
        (point.country or '').casefold(), (point.placeType or '').casefold(),
    ]))
    if origin:
        raw += f"|origin:{origin.name.casefold()}:{round(origin.latitude, 1)}:{round(origin.longitude, 1)}"
    if start_date:
        raw += f"|departure:{start_date}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]

@contextmanager
def connection():
    path = Path(settings().journey_store_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT, lease REAL NOT NULL DEFAULT 0, error TEXT)')
        columns = {row[1] for row in db.execute('PRAGMA table_info(itineraries)').fetchall()}
        if 'stage' not in columns: db.execute("ALTER TABLE itineraries ADD COLUMN stage TEXT NOT NULL DEFAULT 'queued'")
        if 'model_calls' not in columns: db.execute('ALTER TABLE itineraries ADD COLUMN model_calls INTEGER NOT NULL DEFAULT 0')
        db.execute('CREATE TABLE IF NOT EXISTS itinerary_versions (id TEXT NOT NULL, revision TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (id, revision))')
        db.execute('CREATE TABLE IF NOT EXISTS research_usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL)')
        with db:
            yield db
    except (OSError, sqlite3.Error):
        raise HTTPException(503, 'Journey storage is unavailable. Your saved journeys are still on this device.') from None
    finally:
        if 'db' in locals(): db.close()

def read(key):
    snapshot = database().collection('journeyItineraries').document(key).get()
    if not snapshot.exists: return None
    row = snapshot.to_dict() or {}
    lease = row.get('leaseUntil')
    row['lease'] = lease.timestamp() if lease else 0
    return row

def claim(key):
    ref = database().collection('journeyItineraries').document(key)
    now = datetime.now(timezone.utc)
    @firestore.transactional
    def commit(tx):
        snap = ref.get(transaction=tx)
        row = snap.to_dict() or {}
        if row.get('status') == 'preparing' and row.get('leaseUntil') and row['leaseUntil'] > now: return False
        if row.get('status') == 'ready' and row.get('expiresAt'):
            try:
                if datetime.fromisoformat(row['expiresAt']) > now: return False
            except (TypeError, ValueError): pass
        # Preserve durable route checkpoints and user map choices across retries.
        tx.set(ref, {'id': key, 'status': 'preparing', 'leaseUntil': now + timedelta(minutes=5),
                     'error': None, 'stage': 'queued', 'modelCalls': 0, 'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)
        return True
    return commit(database().transaction())

def checkpoint(key, stage, model_calls=None):
    ref = database().collection('journeyItineraries').document(key)
    data = {'stage': stage, 'updatedAt': firestore.SERVER_TIMESTAMP}
    if model_calls is not None: data['modelCalls'] = model_calls
    ref.update(data)

def save_route_checkpoint(key, value):
    """Persist public route research so map selection resumes without rerunning Julia."""
    # Replace this nested checkpoint as a whole so a sources-only retry cannot
    # accidentally retain a stale Hank result or route draft from an older attempt.
    database().collection('journeyItineraries').document(key).update(
        {'routeCheckpoint': value, 'updatedAt': firestore.SERVER_TIMESTAMP})

def save_selected_map_choices(key, value):
    database().collection('journeyItineraries').document(key).set(
        {'selectedMapChoices': value, 'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)

def finish(value):
    db = database(); ref = db.collection('journeyItineraries').document(value.id)
    payload = value.model_dump(mode='json')
    revision = hashlib.sha256(value.researchedAt.encode()).hexdigest()[:40]
    ref.collection('versions').document(revision).set(payload)
    ref.set({'id': value.id, 'status': 'ready', 'payload': payload, 'expiresAt': value.expiresAt,
             'leaseUntil': None, 'error': None, 'stage': 'complete', 'routeCheckpoint': firestore.DELETE_FIELD,
             'mapChoices': firestore.DELETE_FIELD, 'selectedMapChoices': firestore.DELETE_FIELD,
             'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)

def fail(key, message, *, map_choices=None):
    data = {'status': 'failed', 'error': message, 'leaseUntil': None, 'updatedAt': firestore.SERVER_TIMESTAMP}
    if map_choices:
        data.update({'status': 'needs_user_choice', 'mapChoices': map_choices})
    database().collection('journeyItineraries').document(key).set(data, merge=True)

def get_template(key, revision=None):
    ref = database().collection('journeyItineraries').document(key)
    if revision:
        version = hashlib.sha256(revision.encode()).hexdigest()[:40]
        saved = ref.collection('versions').document(version).get().to_dict()
        if saved: return Template.model_validate(saved)
        raise HTTPException(409, 'This saved itinerary revision is unavailable. Reopen destination planning to refresh it.')
    row = read(key)
    if not row or row['status'] != 'ready' or not row.get('payload'):
        raise HTTPException(409, 'This itinerary is still being prepared. Please retry shortly.')
    return Template.model_validate(row['payload'])

def reserve_research():
    from datetime import datetime, timezone
    day = datetime.now(timezone.utc).date().isoformat()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT count FROM research_usage WHERE day=?', (day,)).fetchone()
        count = row[0] if row else 0
        if count >= settings().journey_daily_research:
            raise HTTPException(429, 'New destination research is at its daily limit. Saved itineraries remain available.')
        db.execute('INSERT OR REPLACE INTO research_usage VALUES (?, ?)', (day, count + 1))

def release_research():
    """Return a daily slot when source discovery failed before a plan was produced."""
    from datetime import datetime, timezone
    day = datetime.now(timezone.utc).date().isoformat()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT count FROM research_usage WHERE day=?', (day,)).fetchone()
        if row and row[0] > 1:
            db.execute('UPDATE research_usage SET count=count-1 WHERE day=?', (day,))
        elif row:
            db.execute('DELETE FROM research_usage WHERE day=?', (day,))
