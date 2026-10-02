"""State-machine tests using a fake store; not an emulator or transaction contention test."""
from copy import deepcopy
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app import main
from app.schemas import GroupCreate, InvitationCreate, InvitationResponse, TextMessage

class Ref:
    def __init__(self, db, path): self.db=db; self.path=path; self.id=path.split('/')[-1]
    def collection(self, name): return Collection(self.db, self.path+'/'+name)
    def get(self, transaction=None):
        data = deepcopy(self.db.data.get(self.path))
        return SimpleNamespace(id=self.id,exists=data is not None,to_dict=lambda:data,reference=self)
    def set(self, value, merge=False): self.db.data[self.path]=deepcopy(value)
    def update(self, value):
        target=self.db.data[self.path]
        for key,item in value.items():
            if isinstance(item, main.firestore.ArrayUnion): target[key]=target.get(key,[])+[v for v in item.values if v not in target.get(key,[])]
            else: target[key]=deepcopy(item)
    def delete(self): self.db.data.pop(self.path,None)
class Collection:
    def __init__(self, db, path): self.db=db; self.path=path; self.filters=[]
    def document(self, name=None): return Ref(self.db,self.path+'/'+(name or 'generated'))
    def where(self, *, filter): self.filters.append(filter); return self
    def limit(self, size): return self
    def stream(self):
        for path,value in list(self.db.data.items()):
            if path.rsplit('/',1)[0]==self.path and all(value.get(f.field_path)==f.value for f in self.filters): yield Ref(self.db,path).get()
class DB:
    def __init__(self): self.data={}
    def collection(self,name): return Collection(self,name)
    def transaction(self): return SimpleNamespace(set=lambda r,v:r.set(v),update=lambda r,v:r.update(v),delete=lambda r:r.delete())

@pytest.fixture
def crew(monkeypatch):
    db=DB(); monkeypatch.setattr(main,'database',lambda:db)
    monkeypatch.setattr(main.firestore,'transactional',lambda f:f)
    for uid in ['owner','guest','outsider']: db.collection('users').document(uid).set({'displayName':uid,'email':uid+'@example.com'})
    request=GroupCreate(name='Test crew',trekId=main.ROUTES[0]['id'],startDate='2026-10-01',requestId='create-test')
    gid=main.create_group(request,'owner')['id']
    return db,gid,request

def test_create_is_idempotent(crew):
    db,gid,request=crew
    assert main.create_group(request,'owner')['id']==gid
    assert db.data['groups/'+gid]['memberIds']==['owner']

def test_only_invitee_can_accept_and_accept_is_idempotent(crew):
    db,gid,_=crew
    iid=main.invite(gid,InvitationCreate(email='guest@example.com'),'owner')['id']
    assert db.data['groups/'+gid]['memberIds']==['owner']
    with pytest.raises(HTTPException): main.respond(gid,iid,InvitationResponse(decision='accepted'),'outsider')
    for _ in range(2): main.respond(gid,iid,InvitationResponse(decision='accepted'),'guest')
    assert db.data['groups/'+gid]['memberIds']==['owner','guest']
    assert db.data[f'users/guest/notifications/{iid}']['read'] is True

def test_decline_does_not_grant_access(crew):
    db,gid,_=crew
    iid=main.invite(gid,InvitationCreate(email='guest@example.com'),'owner')['id']
    main.respond(gid,iid,InvitationResponse(decision='declined'),'guest')
    with pytest.raises(HTTPException): main.respond(gid,iid,InvitationResponse(decision='accepted'),'guest')
    assert db.data['groups/'+gid]['memberIds']==['owner']

def test_messages_deduplicate_and_deny_outsiders(crew):
    db,gid,_=crew
    message=TextMessage(text='Meet at trailhead',requestId='message-test')
    mid=main.send_message(gid,message,'owner')['id']
    assert main.send_message(gid,message,'owner')['id']==mid
    with pytest.raises(HTTPException): main.send_message(gid,message,'outsider')
    assert len([p for p in db.data if '/messages/' in p])==1


def test_push_registration_moves_ownership_and_old_logout_cannot_revoke_new_owner(crew):
    from app.schemas import DeviceToken
    db, _, _ = crew
    token = DeviceToken(token='ExpoPushToken[test_only]', platform='ios')
    main.register_device(token, 'owner')
    main.register_device(token, 'guest')
    main.unregister_device(token, 'owner')
    key = main.identifier(token.token)
    assert db.data['deviceOwners/'+key]['uid'] == 'guest'
    assert f'users/owner/deviceTokens/{key}' not in db.data
    assert f'users/guest/deviceTokens/{key}' in db.data

def test_request_budget_is_per_user_and_enforced(crew):
    from app.limits import limit_requests
    db, _, _ = crew
    limit_requests(db, 'owner', maximum=2)
    limit_requests(db, 'owner', maximum=2)
    with pytest.raises(HTTPException) as error: limit_requests(db, 'owner', maximum=2)
    assert error.value.status_code == 429
    limit_requests(db, 'guest', maximum=2)

def test_revoked_invitation_cannot_be_accepted(crew):
    db, gid, _ = crew
    iid = main.invite(gid, InvitationCreate(email='guest@example.com'), 'owner')['id']
    with pytest.raises(HTTPException): main.respond(gid,iid,InvitationResponse(decision='revoked'),'guest')
    main.respond(gid,iid,InvitationResponse(decision='revoked'),'owner')
    with pytest.raises(HTTPException): main.respond(gid,iid,InvitationResponse(decision='accepted'),'guest')
    assert db.data['groups/'+gid]['memberIds'] == ['owner']
