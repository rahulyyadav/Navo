"""Per-user journey library API. Firestore writes stay behind the authenticated backend."""
from datetime import datetime, timezone, timedelta
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from ..chat_access import chat_user
from ..database import database
from .models import JourneyLibrary, PersonalJourney, JourneyRevisionChoice, Template

router = APIRouter(prefix='/journeys', tags=['saved journeys'])


def _ref(uid):
    return database().collection('users').document(uid)


def _validate_savable(journey: PersonalJourney):
    if len(journey.model_dump_json()) > 700_000:
        raise HTTPException(413, 'This journey route is too large to sync. Save a checkpoint overview without detailed geometry.')
    # A draft is a viewable plan, including unresolved warnings and closures.
    # Travel validation applies when it leaves draft state.
    if journey.phase == 'draft':
        return
    if journey.template.readiness == 'blocked':
        raise HTTPException(409, 'This journey is incomplete and cannot be saved yet.')
    accepted = set(journey.acceptedUnverified)
    chosen = journey.selections
    actionable_unverified_choice = False
    for leg in [*journey.approach, *journey.template.legs]:
        choice_id = chosen.get(leg.id, leg.selected)
        option = next((item for item in leg.options if item.id == choice_id), None)
        if option is None:
            raise HTTPException(422, 'Choose a valid transport option before saving.')
        if option.verification == 'closed-confirmed':
            raise HTTPException(409, 'A confirmed closed option cannot be saved as your selected route.')
        if option.requiresUserDecision and option.verification == 'unconfirmed' and f'{leg.id}:{option.id}' not in accepted:
            raise HTTPException(409, 'Review and explicitly keep or remove each unverified selected option before saving.')
        if option.requiresUserDecision and option.verification == 'unconfirmed':
            actionable_unverified_choice = True
    if journey.template.readiness == 'needs-user-choice' and not journey.reviewAcknowledged and not actionable_unverified_choice:
        raise HTTPException(409, 'Review the route notes before starting this journey.')


@router.get('')
def list_journeys(uid: str = Depends(chat_user)):
    user = _ref(uid)
    library = user.collection('journeyMetadata').document('library').get().to_dict() or {}
    values = []
    for snapshot in user.collection('journeys').stream():
        data = snapshot.to_dict() or {}
        data.pop('_serverUpdatedAt', None)
        values.append(data)
    values.sort(key=lambda item: item.get('updatedAt', ''), reverse=True)
    return JourneyLibrary(version=1, activeId=library.get('activeId'), journeys=values).model_dump()


@router.put('')
def sync_journeys(value: JourneyLibrary, uid: str = Depends(chat_user)):
    """Merge device cache into cloud without deleting cloud-only or historical records."""
    if len(value.journeys) > 40:
        raise HTTPException(413, 'Your journey library is too large to sync.')
    user = _ref(uid)
    current = {snap.id: snap.to_dict() or {} for snap in user.collection('journeys').stream()}
    merged = dict(current)
    batch = database().batch()
    for journey in value.journeys:
        _validate_savable(journey)
        existing = current.get(journey.id)
        if existing and existing.get('updatedAt', '') > journey.updatedAt:
            continue
        if existing and existing.get('updatedAt') != journey.updatedAt:
            old = {key: item for key, item in existing.items() if key != '_serverUpdatedAt'}
            old['_journeyId'] = journey.id
            revision_id = hashlib.sha256(str(existing.get('updatedAt', '')).encode()).hexdigest()[:40]
            batch.set(user.collection('journeyRevisions').document(f'{journey.id}-{revision_id}'), old)
        merged[journey.id] = journey.model_dump(mode='json')
    if len(merged) > 40:
        raise HTTPException(409, 'Your cloud library already holds 40 journeys. Remove one before syncing.')
    for journey_id, data in merged.items():
        data['_serverUpdatedAt'] = firestore.SERVER_TIMESTAMP
        batch.set(user.collection('journeys').document(journey_id), data)
    active = value.activeId if value.activeId in merged else None
    batch.set(user.collection('journeyMetadata').document('library'), {'activeId': active, 'updatedAt': firestore.SERVER_TIMESTAMP})
    batch.commit()
    return list_journeys(uid)


@router.put('/{journey_id}')
def save_journey(journey_id: str, value: PersonalJourney, uid: str = Depends(chat_user)):
    if journey_id != value.id:
        raise HTTPException(400, 'Journey identifiers do not match.')
    _validate_savable(value)
    user = _ref(uid)
    ref = user.collection('journeys').document(journey_id)
    old = ref.get().to_dict() or {}
    if old and old.get('updatedAt', '') > value.updatedAt:
        raise HTTPException(409, 'A newer journey revision is already saved. Refresh your library.')
    if old and old.get('updatedAt') != value.updatedAt:
        revision_id = hashlib.sha256(str(old.get('updatedAt', '')).encode()).hexdigest()[:40]
        historical = {key: item for key, item in old.items() if key != '_serverUpdatedAt'}
        historical['_journeyId'] = journey_id
        user.collection('journeyRevisions').document(f'{journey_id}-{revision_id}').set(historical)
    ref.set({**value.model_dump(mode='json'), '_serverUpdatedAt': firestore.SERVER_TIMESTAMP})
    user.collection('journeyMetadata').document('library').set({'activeId': journey_id, 'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)
    departure = value.preferences.startDate
    job = user.collection('journeyReviewJobs').document(journey_id)
    try:
        local_departure = datetime.fromisoformat(departure).replace(tzinfo=timezone(timedelta(hours=5, minutes=45)))
        review_due = local_departure - timedelta(hours=72)
    except ValueError:
        review_due = datetime.now(timezone.utc)
    job.set({'status': 'scheduled', 'dueAt': review_due, 'departureDate': departure, 'journeyUpdatedAt': value.updatedAt,
             'lastReviewAt': value.lastReviewedAt, 'leaseUntil': None}, merge=True)
    return {'saved': True, 'id': journey_id}


@router.get('/{journey_id}')
def get_journey(journey_id: str, uid: str = Depends(chat_user)):
    if len(journey_id) != 24 or any(c not in '0123456789abcdef' for c in journey_id):
        raise HTTPException(404, 'Journey not found.')
    snapshot = _ref(uid).collection('journeys').document(journey_id).get()
    if not snapshot.exists:
        raise HTTPException(404, 'Journey not found.')
    data = snapshot.to_dict()
    data.pop('_serverUpdatedAt', None)
    return data


@router.delete('/{journey_id}')
def delete_journey(journey_id: str, uid: str = Depends(chat_user)):
    if len(journey_id) != 24 or any(c not in '0123456789abcdef' for c in journey_id):
        raise HTTPException(404, 'Journey not found.')
    user = _ref(uid)
    user.collection('journeys').document(journey_id).delete()
    user.collection('journeyReviewJobs').document(journey_id).delete()
    for revision in user.collection('journeyRevisions').where(filter=FieldFilter('_journeyId', '==', journey_id)).stream():
        revision.reference.delete()
    metadata = user.collection('journeyMetadata').document('library')
    current = metadata.get().to_dict() or {}
    if current.get('activeId') == journey_id:
        metadata.set({'activeId': None, 'updatedAt': firestore.SERVER_TIMESTAMP}, merge=True)
    return {'deleted': True}


@router.post('/{journey_id}/review')
def request_review(journey_id: str, uid: str = Depends(chat_user)):
    if len(journey_id) != 24 or any(c not in '0123456789abcdef' for c in journey_id):
        raise HTTPException(404, 'Journey not found.')
    user = _ref(uid)
    ref = user.collection('journeys').document(journey_id)
    journey = ref.get().to_dict()
    if not journey:
        raise HTTPException(404, 'Journey not found.')
    previous = journey.get('lastReviewedAt')
    if previous:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(previous.replace('Z', '+00:00'))).total_seconds()
            if age < 12 * 3600:
                return {'queued': False, 'lastReviewedAt': previous}
        except (ValueError, TypeError):
            pass
    user.collection('journeyReviewJobs').document(journey_id).set({
        'status': 'pending', 'requestedAt': firestore.SERVER_TIMESTAMP,
        'dueAt': datetime.now(timezone.utc), 'journeyUpdatedAt': journey.get('updatedAt'), 'leaseUntil': None,
    }, merge=True)
    return {'queued': True}


@router.post('/{journey_id}/revision')
def decide_revision(journey_id: str, value: JourneyRevisionChoice, uid: str = Depends(chat_user)):
    if len(journey_id) != 24 or any(c not in '0123456789abcdef' for c in journey_id):
        raise HTTPException(404, 'Journey not found.')
    user = _ref(uid)
    ref = user.collection('journeys').document(journey_id)
    raw = ref.get().to_dict()
    if not raw:
        raise HTTPException(404, 'Journey not found.')
    proposal = raw.get('proposedRevision') or {}
    proposed_template = proposal.get('template')
    if not proposed_template:
        if value.decision == 'reject' and proposal:
            ref.update({'proposedRevision': None, 'updatedAt': datetime.now(timezone.utc).isoformat()})
            return {'accepted': False, 'dismissed': True}
        raise HTTPException(409, 'A reviewed route revision is not available yet.')
    if value.decision == 'reject':
        ref.update({'proposedRevision': None, 'updatedAt': datetime.now(timezone.utc).isoformat()})
        return {'accepted': False, 'dismissed': True}
    journey = PersonalJourney.model_validate({key: item for key, item in raw.items() if key != '_serverUpdatedAt'})
    if journey.phase not in ('draft', 'ready') or journey.completed:
        raise HTTPException(409, 'A route revision cannot replace a journey after travel has started.')
    template = Template.model_validate(proposed_template)
    if template.readiness == 'blocked':
        raise HTTPException(409, 'Paul marked this proposed route as blocked. Keep the saved route and review the source warnings.')
    now = datetime.now(timezone.utc).isoformat()
    updated = PersonalJourney.model_validate(journey.model_dump(mode='python') | {
        'template': template.model_dump(mode='python'), 'proposedRevision': None,
        'acceptedUnverified': value.acceptedUnverified, 'selections': {}, 'updatedAt': now,
    })
    _validate_savable(updated)
    revision_id = hashlib.sha256(str(raw.get('updatedAt', '')).encode()).hexdigest()[:40]
    historical = {key: item for key, item in raw.items() if key != '_serverUpdatedAt'}
    historical['_journeyId'] = journey_id
    user.collection('journeyRevisions').document(f'{journey_id}-{revision_id}').set(historical)
    ref.set({**updated.model_dump(mode='json'), '_serverUpdatedAt': firestore.SERVER_TIMESTAMP})
    job = user.collection('journeyReviewJobs').document(journey_id)
    job.set({'status': 'scheduled', 'journeyUpdatedAt': now, 'leaseUntil': None}, merge=True)
    return {'accepted': True, 'id': journey_id}
