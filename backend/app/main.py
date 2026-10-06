import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from firebase_admin import auth, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .auth import current_user
from .chat import reply as chat_reply
from .schemas import ChatRequest, TrekPreparation
from .boundary import RequestBoundary
from .config import settings
from .database import database
from .proximity import nearby
from .token_factory import configured as ai_configured
from .planner import ROUTES, generate, route_by_id
from .schemas import GroupCreate, InvitationCreate, InvitationResponse, TextMessage, Position, AlertCreate, AlertAction, Onboarding, PlanRequest, DeviceToken, JoinLink, JoinDecision

app = FastAPI(title='Navo API', version='1.0.0')
app.add_middleware(RequestBoundary)
app.add_middleware(CORSMiddleware, allow_origins=[v.strip() for v in settings().cors_origins.split(',') if v.strip()], allow_credentials=False, allow_methods=['GET','POST','PUT','DELETE'], allow_headers=['Authorization','Content-Type'])
@app.exception_handler(Exception)
async def unexpected_error(request, error):
    return JSONResponse(status_code=503, content={'detail': 'The service is temporarily unavailable. Check server setup and try again.'})

STAMP = firestore.SERVER_TIMESTAMP

def identifier(*values):
    return hashlib.sha256(':'.join(values).encode()).hexdigest()[:40]

def group_ref(gid):
    if not gid.isalnum() or len(gid) > 80:
        raise HTTPException(400, 'Invalid group identifier.')
    return database().collection('groups').document(gid)

def require_member(group, uid, owner=False):
    if not group or uid not in group.get('memberIds', []):
        raise HTTPException(403, 'Active group membership is required.')
    if owner and group.get('ownerId') != uid:
        raise HTTPException(403, 'Only the group owner can do this.')

def profile(uid):
    value = database().collection('users').document(uid).get().to_dict()
    if not value:
        raise HTTPException(409, 'Connect your Firebase session first.')
    return value

def member_record(uid, person):
    return {'id': uid, 'userId': uid, 'name': person.get('displayName', 'Trekker'), 'displayName': person.get('displayName', 'Trekker'), 'email': person.get('email'), 'role': 'member', 'status': 'active'}

@app.get('/health')
def health():
    return {'status': 'ok', 'firebaseConfigured': bool(settings().firebase_project_id), 'aiConfigured': ai_configured(), 'demoEnabled': settings().enable_demo}

@app.post('/session')
def connect_session(uid: str = Depends(current_user)):
    db = database()
    person = auth.get_user(uid)
    if not person.email or not person.email_verified:
        raise HTTPException(403, 'Verify your primary email first.')
    ref = db.collection('users').document(uid)
    previous = ref.get()
    saved_name = ((previous.to_dict() or {}).get('onboarding') or {}).get('fullName')
    value = {'id': uid, 'email': person.email.lower(), 'displayName': saved_name or person.display_name or 'Trekker', 'avatarUrl': person.photo_url, 'updatedAt': STAMP}
    if not previous.exists: value['createdAt'] = STAMP
    ref.set(value, merge=True)
    return {'id': uid, 'connected': True}

@app.put('/profile')
def save_profile(value: Onboarding, uid: str = Depends(current_user)):
    profile(uid)
    database().collection('users').document(uid).set({'onboarding': value.model_dump(), 'displayName': value.fullName, 'updatedAt': STAMP}, merge=True)
    return {'saved': True}

@app.post('/groups')
def create_group(value: GroupCreate, uid: str = Depends(current_user)):
    if value.trekId == 'custom-hike':
        if not value.outing: raise HTTPException(400, 'Add the meeting place, time and walking plan.')
        if value.startDate < (datetime.now(timezone.utc) + timedelta(hours=5, minutes=45)).date(): raise HTTPException(400, 'Choose today or a future hike date.')
        trek = {'name': value.outing.destination, 'region': 'Day hike'}
    else:
        trek = route_by_id(value.trekId)
    person = profile(uid)
    ref = group_ref(identifier(uid, value.requestId))
    member = {**member_record(uid, person), 'role': 'leader', 'joinedAt': datetime.now(timezone.utc).isoformat()}
    @firestore.transactional
    def commit(tx):
        existing = ref.get(transaction=tx)
        if existing.exists:
            return {'id': ref.id}
        tx.set(ref, {'id': ref.id, 'name': value.name, 'trekId': value.trekId, 'trekName': trek['name'], 'region': trek['region'], 'startDate': value.startDate.isoformat(), 'ownerId': uid, 'memberIds': [uid], 'members': [member], 'status': 'active', 'outing': value.outing.model_dump() if value.outing else None, 'createdAt': STAMP, 'updatedAt': STAMP})
        tx.set(ref.collection('members').document(uid), {**member, 'joinedAt': STAMP, 'locationSharingEnabled': False})
        return {'id': ref.id}
    return commit(database().transaction())

@app.get('/groups/{gid}')
def get_group(gid: str, uid: str = Depends(current_user)):
    value = group_ref(gid).get().to_dict()
    require_member(value, uid)
    return value

@app.post('/groups/{gid}/invites')
def invite(gid: str, value: InvitationCreate, uid: str = Depends(current_user)):
    db = database(); ref = group_ref(gid)
    require_member(ref.get().to_dict(), uid, True)
    people = list(db.collection('users').where(filter=FieldFilter('email', '==', value.email.lower())).limit(1).stream())
    if not people:
        raise HTTPException(404, 'This person must sign in to Navo and connect once before you can invite them.')
    invitee = people[0].id
    invitation = ref.collection('invitations').document(identifier(gid, invitee))
    notification = db.collection('users').document(invitee).collection('notifications').document(invitation.id)
    sender = profile(uid)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict()
        existing = invitation.get(transaction=tx).to_dict()
        require_member(group, uid, True)
        if invitee in group['memberIds']:
            raise HTTPException(409, 'This person is already a member.')
        if existing and existing['status'] == 'pending':
            raise HTTPException(409, 'An invitation is already pending.')
        data = {'id': invitation.id, 'groupId': gid, 'groupName': group['name'], 'inviterId': uid, 'inviterName': sender['displayName'], 'inviteeUserId': invitee, 'inviteeName': people[0].to_dict().get('displayName', 'Trekker'), 'status': 'pending', 'createdAt': STAMP}
        tx.set(invitation, data)
        tx.set(notification, {**data, 'type': 'invitation', 'read': False})
        return {'id': invitation.id}
    return commit(db.transaction())

@app.post('/groups/{gid}/invites/{iid}/respond')
def respond(gid: str, iid: str, value: InvitationResponse, uid: str = Depends(current_user)):
    db = database(); ref = group_ref(gid)
    if not iid.isalnum(): raise HTTPException(400, 'Invalid invitation.')
    invitation = ref.collection('invitations').document(iid)
    person = profile(uid)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict()
        data = invitation.get(transaction=tx).to_dict()
        if not data or not group: raise HTTPException(404, 'Invitation not found.')
        if value.decision == 'revoked': require_member(group, uid, True)
        elif data['inviteeUserId'] != uid: raise HTTPException(403, 'This invitation is not addressed to you.')
        if data['status'] == value.decision: return {'status': value.decision}
        if data['status'] != 'pending': raise HTTPException(409, 'This invitation is no longer pending.')
        if value.decision == 'accepted' and uid not in group['memberIds']:
            if len(group['memberIds']) >= 50: raise HTTPException(409, 'This group has reached its 50 member limit.')
            member = member_record(uid, person)
            tx.update(ref, {'memberIds': firestore.ArrayUnion([uid]), 'members': firestore.ArrayUnion([member]), 'updatedAt': STAMP})
            tx.set(ref.collection('members').document(uid), {**member, 'joinedAt': STAMP, 'locationSharingEnabled': False})
            tx.set(ref.collection('messages').document('join-'+iid), {'senderId': uid, 'senderName': person['displayName'], 'text': f"{person['displayName']} joined the group.", 'type': 'system', 'createdAt': STAMP})
        tx.update(invitation, {'status': value.decision, 'respondedAt': STAMP})
        tx.update(db.collection('users').document(data['inviteeUserId']).collection('notifications').document(iid), {'status': value.decision, 'read': True})
        return {'status': value.decision}
    return commit(db.transaction())

@app.delete('/groups/{gid}/members/{member_id}')
def remove_member(gid: str, member_id: str, uid: str = Depends(current_user)):
    ref = group_ref(gid)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); require_member(group, uid, True)
        if member_id == group['ownerId']: raise HTTPException(409, 'The owner cannot be removed.')
        tx.update(ref, {'memberIds': [v for v in group['memberIds'] if v != member_id], 'members': [v for v in group['members'] if v['id'] != member_id], 'updatedAt': STAMP})
        tx.delete(ref.collection('members').document(member_id))
        return {'removed': True}
    return commit(database().transaction())

@app.post('/groups/{gid}/messages')
def send_message(gid: str, value: TextMessage, uid: str = Depends(current_user)):
    ref = group_ref(gid); person = profile(uid)
    message = ref.collection('messages').document(identifier(uid, value.requestId))
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); exists = message.get(transaction=tx).exists
        require_member(group, uid)
        if not exists: tx.set(message, {'id': message.id, 'senderId': uid, 'senderName': person['displayName'], 'text': value.text, 'type': 'text', 'createdAt': STAMP})
        return {'id': message.id}
    return commit(database().transaction())

@app.post('/groups/{gid}/alerts')
def create_alert(gid: str, value: AlertCreate, uid: str = Depends(current_user)):
    if value.kind == 'sos' and not value.confirmed: raise HTTPException(400, 'Confirm SOS before sending.')
    if value.kind == 'nearby' and (not value.confirmed or not value.position or value.position.accuracy > 100): raise HTTPException(400, 'Confirm the nearby alert and get a GPS fix accurate to 100 m or better.')
    if value.kind == 'off-route': raise HTTPException(409, 'Off-route alerts require an imported, verified route; current waypoints are illustrative.')
    db = database(); ref = group_ref(gid); person = profile(uid)
    alert = ref.collection('alerts').document(identifier(uid, value.requestId))
    cooldown = ref.collection('cooldowns').document(identifier(uid, value.kind))
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); exists = alert.get(transaction=tx).exists; previous = cooldown.get(transaction=tx).to_dict()
        require_member(group, uid, value.kind == 'test')
        if exists: return {'id': alert.id}
        if previous and datetime.now(timezone.utc) - previous['at'] < timedelta(seconds=15): raise HTTPException(429, 'Please wait a moment before sending another alert.')
        pos = value.position.model_dump() if value.position else {}
        recipients = [v for v in group['memberIds'] if v != uid]
        if value.kind == 'nearby':
            recipients = [v for v in recipients if nearby(pos, ref.collection('members').document(v).get(transaction=tx).to_dict() or {})]
            if not recipients: raise HTTPException(409, 'No opted-in group members have a recent, accurate position within 500 m. Use a group alert or contact your crew directly.')
        event = {'id': alert.id, 'groupId': gid, 'kind': value.kind, 'senderId': uid, 'senderName': person['displayName'], 'message': value.message or f"{person['displayName']}: {value.kind}", 'latitude': pos.get('latitude'), 'longitude': pos.get('longitude'), 'accuracy': pos.get('accuracy'), 'capturedAt': pos.get('capturedAt'), 'createdAt': STAMP, 'acknowledgedBy': [], 'resolvedAt': None, 'recipientCount': len(recipients)}
        tx.set(alert, event); tx.set(cooldown, {'at': STAMP})
        for recipient in recipients:
            if recipient != uid:
                tx.set(db.collection('users').document(recipient).collection('notifications').document(alert.id), {**event, 'type': 'alert', 'groupName': group['name'], 'read': False})
        tx.set(db.collection('pushJobs').document(alert.id), {'groupId': gid, 'alertId': alert.id, 'recipients': recipients, 'status': 'pending', 'createdAt': STAMP})
        return {'id': alert.id, 'recipientCount': len(recipients)}
    return commit(db.transaction())

@app.post('/groups/{gid}/alerts/{aid}')
def act_alert(gid: str, aid: str, value: AlertAction, uid: str = Depends(current_user)):
    if not aid.isalnum(): raise HTTPException(400, 'Invalid alert.')
    ref = group_ref(gid); alert = ref.collection('alerts').document(aid)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); event = alert.get(transaction=tx).to_dict(); require_member(group, uid)
        if not event: raise HTTPException(404, 'Alert not found.')
        if value.action == 'resolve' and uid not in [group['ownerId'], event['senderId']]: raise HTTPException(403, 'Only the sender or owner can resolve this alert.')
        tx.update(alert, {'acknowledgedBy': firestore.ArrayUnion([uid])} if value.action == 'acknowledge' else {'resolvedAt': STAMP})
        return {'saved': True}
    return commit(database().transaction())

@app.post('/groups/{gid}/checkins')
def checkin(gid: str, value: Position, uid: str = Depends(current_user)):
    ref = group_ref(gid); person = profile(uid); record = ref.collection('checkins').document(identifier(uid, value.capturedAt))
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); require_member(group, uid)
        if record.get(transaction=tx).exists: return {'id': record.id}
        data = {**value.model_dump(), 'userId': uid, 'displayName': person['displayName'], 'createdAt': STAMP, 'status': 'safe'}
        tx.set(record, data)
        tx.update(ref.collection('members').document(uid), {'lastLocation': data, 'lastLocationAt': STAMP, 'checkInStatus': 'safe', 'checkinDueAt': datetime.now(timezone.utc) + timedelta(hours=4), 'locationSharingEnabled': True, 'nearbyAlertsEnabled': False})
        tx.set(ref.collection('messages').document(record.id), {'senderId': uid, 'senderName': person['displayName'], 'text': 'Checked in safely and shared a position.', 'type': 'system', 'createdAt': STAMP})
        return {'id': record.id}
    return commit(database().transaction())

@app.delete('/groups/{gid}/location')
def stop_sharing(gid: str, uid: str = Depends(current_user)):
    ref = group_ref(gid)
    require_member(ref.get().to_dict(), uid)
    ref.collection('members').document(uid).update({'lastLocation': firestore.DELETE_FIELD, 'lastLocationAt': firestore.DELETE_FIELD, 'locationSharingEnabled': False, 'nearbyAlertsEnabled': False, 'checkinDueAt': firestore.DELETE_FIELD, 'checkInStatus': 'paused'})
    return {'removed': True}

@app.post('/notifications/{nid}/read')
def mark_read(nid: str, uid: str = Depends(current_user)):
    if not nid.isalnum(): raise HTTPException(400, 'Invalid notification.')
    database().collection('users').document(uid).collection('notifications').document(nid).update({'read': True})
    return {'saved': True}

@app.post('/devices')
def register_device(value: DeviceToken, uid: str = Depends(current_user)):
    db = database(); key = identifier(value.token)
    owner = db.collection('deviceOwners').document(key)
    target = db.collection('users').document(uid).collection('deviceTokens').document(key)
    @firestore.transactional
    def commit(tx):
        previous = owner.get(transaction=tx).to_dict() or {}
        if previous.get('uid') and previous['uid'] != uid:
            tx.delete(db.collection('users').document(previous['uid']).collection('deviceTokens').document(key))
        tx.set(owner, {'uid': uid, 'updatedAt': STAMP})
        tx.set(target, {**value.model_dump(), 'updatedAt': STAMP})
    commit(db.transaction())
    return {'saved': True}

@app.delete('/devices')
def unregister_device(value: DeviceToken, uid: str = Depends(current_user)):
    db = database(); key = identifier(value.token)
    owner = db.collection('deviceOwners').document(key)
    @firestore.transactional
    def commit(tx):
        previous = owner.get(transaction=tx).to_dict() or {}
        tx.delete(db.collection('users').document(uid).collection('deviceTokens').document(key))
        if previous.get('uid') == uid: tx.delete(owner)
    commit(db.transaction())
    return {'removed': True}

@app.get('/routes')
def routes(): return ROUTES

@app.get('/routes/{rid}')
def route(rid: str): return route_by_id(rid)

@app.post('/plans')
async def plan(value: PlanRequest, uid: str = Depends(current_user)):
    if value.demonstrateRepair and not settings().enable_demo: raise HTTPException(403, 'Demo mode is disabled on this server.')
    ref = database().collection('users').document(uid).collection('plans').document(identifier(uid, value.requestId))
    quota = database().collection('quotas').document(uid)
    @firestore.transactional
    def reserve(tx):
        existing = ref.get(transaction=tx).to_dict()
        usage = quota.get(transaction=tx).to_dict() or {}
        now = datetime.now(timezone.utc)
        if existing and existing.get('status') in ['rejected', 'review_required']: return existing
        if existing and existing.get('leaseUntil') and existing['leaseUntil'] > now:
            raise HTTPException(409, 'This plan is still generating. Please wait before retrying.')
        window = now.strftime('%Y-%m-%d-%H')
        count = usage.get('count', 0) if usage.get('window') == window else 0
        if count >= 5: raise HTTPException(429, 'Five plan attempts per hour are allowed. Please try again later.')
        tx.set(quota, {'window': window, 'count': count + 1})
        tx.set(ref, {'status': 'generating', 'leaseUntil': now + timedelta(minutes=4)})
        return None
    existing = reserve(database().transaction())
    if existing: return existing
    try:
        result = await generate(value)
    except Exception:
        ref.set({'status': 'failed'})
        raise
    output = {'id': ref.id, 'input': value.model_dump(), **result, 'createdAt': datetime.now(timezone.utc).isoformat()}
    ref.set(output)
    return output

@app.get('/plans/{pid}')
def get_plan(pid: str, uid: str = Depends(current_user)):
    if not pid.isalnum(): raise HTTPException(400, 'Invalid plan.')
    result = database().collection('users').document(uid).collection('plans').document(pid).get().to_dict()
    if not result: raise HTTPException(404, 'Plan not found.')
    return result

@app.post('/plans/{pid}/revise')
async def revise(pid: str, value: PlanRequest, uid: str = Depends(current_user)):
    get_plan(pid, uid)
    return await plan(value, uid)

@app.post('/chat')
async def chat(value: ChatRequest):
    return await chat_reply(value)


@app.get('/preparations/{rid}')
def get_preparation(rid: str, uid: str = Depends(current_user)):
    route_by_id(rid)
    result = database().collection('users').document(uid).collection('preparations').document(rid).get().to_dict()
    return {key: result.get(key, default) for key, default in {'date': '', 'notes': '', 'checked': [], 'reviewed': []}.items()} if result else None


@app.put('/preparations/{rid}')
def save_preparation(rid: str, value: TrekPreparation, uid: str = Depends(current_user)):
    route_by_id(rid)
    database().collection('users').document(uid).collection('preparations').document(rid).set({**value.model_dump(), 'trekId': rid, 'updatedAt': STAMP})
    return {'saved': True}

@app.post('/groups/{gid}/join-link')
def create_join_link(gid: str, uid: str = Depends(current_user)):
    ref = group_ref(gid)
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    @firestore.transactional
    def commit(tx):
        require_member(ref.get(transaction=tx).to_dict(), uid, True)
        # Only the digest is stored. Rotating invalidates the previous link.
        tx.set(ref.collection('private').document('joinLink'), {'digest': hashlib.sha256(token.encode()).hexdigest(), 'expiresAt': expires})
    commit(database().transaction())
    return {'token': token, 'expiresAt': expires.isoformat()}

@app.delete('/groups/{gid}/join-link')
def revoke_join_link(gid: str, uid: str = Depends(current_user)):
    ref = group_ref(gid)
    @firestore.transactional
    def commit(tx):
        require_member(ref.get(transaction=tx).to_dict(), uid, True)
        tx.delete(ref.collection('private').document('joinLink'))
    commit(database().transaction())
    return {'revoked': True}

@app.post('/groups/{gid}/join-requests')
def request_join(gid: str, value: JoinLink, uid: str = Depends(current_user)):
    ref = group_ref(gid); person = profile(uid)
    request = ref.collection('joinRequests').document(uid)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict()
        link = ref.collection('private').document('joinLink').get(transaction=tx).to_dict()
        previous = request.get(transaction=tx).to_dict()
        if not group or not link or link['expiresAt'] <= datetime.now(timezone.utc) or not secrets.compare_digest(link['digest'], hashlib.sha256(value.token.encode()).hexdigest()):
            raise HTTPException(404, 'This invitation link has expired or was replaced. Ask the leader for a new one.')
        if uid in group['memberIds']: return {'status': 'member'}
        if previous and previous['status'] == 'pending': return {'status': 'pending'}
        if previous and previous['status'] == 'declined' and previous.get('linkDigest') == link['digest']:
            raise HTTPException(409, 'The leader declined this request. Ask them for a new invitation.')
        tx.set(request, {'id': uid, 'displayName': person['displayName'], 'status': 'pending', 'linkDigest': link['digest'], 'createdAt': STAMP})
        return {'status': 'pending'}
    return commit(database().transaction())

@app.post('/groups/{gid}/join-requests/{requester}/respond')
def decide_join(gid: str, requester: str, value: JoinDecision, uid: str = Depends(current_user)):
    if not requester or len(requester) > 128 or '/' in requester: raise HTTPException(400, 'Invalid member.')
    ref = group_ref(gid); request = ref.collection('joinRequests').document(requester)
    require_member(ref.get().to_dict(), uid, True)
    person = profile(requester)
    @firestore.transactional
    def commit(tx):
        group = ref.get(transaction=tx).to_dict(); data = request.get(transaction=tx).to_dict()
        require_member(group, uid, True)
        if not data: raise HTTPException(404, 'Request not found.')
        if data['status'] == value.decision: return {'status': value.decision}
        if data['status'] != 'pending': raise HTTPException(409, 'This request has already been reviewed.')
        if value.decision == 'approved' and requester not in group['memberIds']:
            if len(group['memberIds']) >= 50: raise HTTPException(409, 'This group has reached its 50 member limit.')
            member = member_record(requester, person)
            tx.update(ref, {'memberIds': firestore.ArrayUnion([requester]), 'members': firestore.ArrayUnion([member]), 'updatedAt': STAMP})
            tx.set(ref.collection('members').document(requester), {**member, 'joinedAt': STAMP, 'locationSharingEnabled': False})
        tx.update(request, {'status': value.decision, 'respondedAt': STAMP})
        return {'status': value.decision}
    return commit(database().transaction())


@app.put('/groups/{gid}/location')
def share_live_position(gid: str, value: Position, uid: str = Depends(current_user)):
    ref = group_ref(gid)
    if value.accuracy > 100: raise HTTPException(400, 'GPS accuracy is too low. Try outdoors before sharing.')
    @firestore.transactional
    def commit(tx):
        require_member(ref.get(transaction=tx).to_dict(), uid)
        member = ref.collection('members').document(uid)
        previous = member.get(transaction=tx).to_dict() or {}
        old = (previous.get('lastLocation') or {}).get('capturedAt')
        if old and datetime.fromisoformat(old.replace('Z', '+00:00')) >= datetime.fromisoformat(value.capturedAt): return
        tx.update(member, {'lastLocation': value.model_dump(), 'lastLocationAt': STAMP, 'locationSharingEnabled': True, 'nearbyAlertsEnabled': True})
    commit(database().transaction())
    return {'shared': True}
