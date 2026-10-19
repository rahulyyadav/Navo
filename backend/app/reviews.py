"""Trail feedback. Publication requires explicit moderation; no client writes."""
import hashlib
import secrets
from datetime import date, datetime, timezone, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, Header, HTTPException
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import Field, field_validator
from .auth import current_user
from .config import settings
from .database import database
from .planner import route_by_id
from .schemas import Model

router = APIRouter()

class ReviewInput(Model):
    rating: int = Field(ge=1, le=5, strict=True)
    text: str = Field(min_length=10, max_length=1500)
    visitedOn: date
    conditions: list[Literal['muddy', 'wet', 'snow', 'crowded', 'quiet', 'bugs', 'obstructed']] = Field(default_factory=list, max_length=7)

    @field_validator('visitedOn')
    @classmethod
    def past_visit(cls, value):
        if value > (datetime.now(timezone.utc) + timedelta(hours=5, minutes=45)).date():
            raise ValueError('Visit date cannot be in the future.')
        return value

    @field_validator('conditions')
    @classmethod
    def unique_conditions(cls, value):
        return list(dict.fromkeys(value))

class ReviewReport(Model):
    reason: Literal['spam', 'abuse', 'inaccurate', 'off-topic']

class ReviewDecision(Model):
    status: Literal['published', 'rejected']
    revision: str = Field(min_length=1, max_length=50)


def review_ref(rid, uid):
    route_by_id(rid)
    key = hashlib.sha256(f'{rid}:{uid}'.encode()).hexdigest()
    return database().collection('trailReviews').document(key)


def visible_review(snap, own=False):
    data = snap.to_dict() or {}
    keys = ['rating', 'text', 'visitedOn', 'conditions', 'authorName', 'updatedAt']
    value = {key: data.get(key) for key in keys}
    stamp = value.get('updatedAt')
    if isinstance(stamp, datetime): value['updatedAt'] = stamp.isoformat()
    return {**value, 'id': snap.id, 'status': data.get('status') if own else 'published'}

@router.get('/routes/{rid}/reviews')
def list_reviews(rid: str, uid: str = Depends(current_user)):
    own = review_ref(rid, uid).get()
    query = database().collection('trailReviews').where(filter=FieldFilter('routeId', '==', rid)).where(filter=FieldFilter('status', '==', 'published')).order_by('updatedAt', direction=firestore.Query.DESCENDING).limit(20)
    return {'reviews': [visible_review(s) for s in query.stream()], 'mine': visible_review(own, True) if own.exists and (own.to_dict() or {}).get('status') != 'deleted' else None, 'limit': 20}

@router.put('/routes/{rid}/reviews/mine')
def save_review(rid: str, value: ReviewInput, uid: str = Depends(current_user)):
    ref = review_ref(rid, uid)
    db = database()
    revision = secrets.token_hex(16)
    @firestore.transactional
    def save(tx):
        if db.collection('accountDeletions').document(uid).get(transaction=tx).exists: raise HTTPException(403, 'This account is being deleted.')
        person = db.collection('users').document(uid).get(transaction=tx).to_dict()
        if not person: raise HTTPException(409, 'Connect your account before reviewing a trail.')
        # Replacing published content always returns it to moderation.
        tx.set(ref, {**value.model_dump(mode='json'), 'routeId': rid, 'authorId': uid,
                     'authorName': str(person.get('displayName') or 'Trekker')[:100],
                     'status': 'pending', 'updatedAt': firestore.SERVER_TIMESTAMP, 'revision': revision})
    save(db.transaction())
    return {'status': 'pending'}

@router.delete('/routes/{rid}/reviews/mine')
def delete_review(rid: str, uid: str = Depends(current_user)):
    # Keep a content-free tombstone so queued moderation cannot republish it.
    ref = review_ref(rid, uid)
    @firestore.transactional
    def remove(tx):
        if database().collection('accountDeletions').document(uid).get(transaction=tx).exists: raise HTTPException(403, 'This account is being deleted.')
        tx.set(ref, {'routeId': rid, 'authorId': uid, 'status': 'deleted', 'updatedAt': firestore.SERVER_TIMESTAMP})
    remove(database().transaction())
    return {'deleted': True}

@router.post('/routes/{rid}/reviews/{review_id}/report')
def report_review(rid: str, review_id: str, value: ReviewReport, uid: str = Depends(current_user)):
    route_by_id(rid)
    if len(review_id) != 64 or any(c not in '0123456789abcdef' for c in review_id): raise HTTPException(404, 'Review not found.')
    ref = database().collection('trailReviews').document(review_id)
    @firestore.transactional
    def report(tx):
        if database().collection('accountDeletions').document(uid).get(transaction=tx).exists: raise HTTPException(403, 'This account is being deleted.')
        data = ref.get(transaction=tx).to_dict()
        if not data or data.get('routeId') != rid or data.get('status') != 'published': raise HTTPException(404, 'Review not found.')
        tx.set(ref.collection('reviewReports').document(uid), {'authorId': uid, 'reason': value.reason, 'resolved': False, 'createdAt': firestore.SERVER_TIMESTAMP})
    report(database().transaction())
    return {'reported': True}

def require_moderator(authorization):
    token = settings().maintenance_token
    if len(token) < 32 or not secrets.compare_digest(authorization, 'Bearer ' + token): raise HTTPException(401, 'Unauthorized.')

@router.get('/internal/reviews')
def moderation_queue(authorization: str = Header(default='')):
    require_moderator(authorization)
    query = database().collection('trailReviews').where(filter=FieldFilter('status', '==', 'pending')).order_by('updatedAt', direction=firestore.Query.DESCENDING).limit(20)
    return {'reviews': [{**visible_review(s, True), 'routeId': (s.to_dict() or {}).get('routeId'), 'revision': (s.to_dict() or {}).get('revision')} for s in query.stream()]}

@router.get('/internal/review-reports')
def reported_reviews(authorization: str = Header(default='')):
    require_moderator(authorization)
    query = database().collection_group('reviewReports').where(filter=FieldFilter('resolved', '==', False)).order_by('createdAt', direction=firestore.Query.DESCENDING).limit(20)
    reports = []
    for snap in query.stream():
        parent = snap.reference.parent.parent
        review = parent.get()
        if not review.exists or (review.to_dict() or {}).get('status') == 'deleted': continue
        data = snap.to_dict() or {}
        stamp = data.get('createdAt')
        reports.append({'reporterId': snap.id, 'review': {**visible_review(review, True), 'routeId': (review.to_dict() or {}).get('routeId'), 'revision': (review.to_dict() or {}).get('revision')}, 'reason': data.get('reason'), 'createdAt': stamp.isoformat() if isinstance(stamp, datetime) else None})
    return {'reports': reports}

@router.put('/internal/reviews/{review_id}/reports/{reporter_id}/resolve')
def resolve_report(review_id: str, reporter_id: str, authorization: str = Header(default='')):
    require_moderator(authorization)
    if len(review_id) != 64 or any(c not in '0123456789abcdef' for c in review_id) or not reporter_id or '/' in reporter_id or len(reporter_id) > 128: raise HTTPException(404, 'Report not found.')
    ref = database().collection('trailReviews').document(review_id).collection('reviewReports').document(reporter_id)
    @firestore.transactional
    def resolve(tx):
        if not ref.get(transaction=tx).exists: raise HTTPException(404, 'Report not found.')
        tx.update(ref, {'resolved': True, 'resolvedAt': firestore.SERVER_TIMESTAMP})
    resolve(database().transaction())
    return {'resolved': True}

@router.put('/internal/reviews/{review_id}')
def moderate_review(review_id: str, value: ReviewDecision, authorization: str = Header(default='')):
    require_moderator(authorization)
    if len(review_id) != 64 or any(c not in '0123456789abcdef' for c in review_id): raise HTTPException(404, 'Review not found.')
    ref = database().collection('trailReviews').document(review_id)
    @firestore.transactional
    def decide(tx):
        data = ref.get(transaction=tx).to_dict()
        if not data or data.get('status') == 'deleted': raise HTTPException(404, 'Review not found.')
        if database().collection('accountDeletions').document(data['authorId']).get(transaction=tx).exists: raise HTTPException(409, 'The author account is being deleted.')
        if data.get('revision') != value.revision: raise HTTPException(409, 'The review changed. Read the current revision before moderating.')
        tx.update(ref, {'status': value.status, 'moderatedAt': firestore.SERVER_TIMESTAMP})
    decide(database().transaction())
    return {'status': value.status}
