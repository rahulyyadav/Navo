from datetime import datetime, timezone
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
import pytest
from app.account_deletion import remaining_group
from app import auth as authentication

def test_deleting_owner_preserves_other_members_and_transfers_leadership():
    value = remaining_group({'ownerId': 'a', 'memberIds': ['a', 'b', 'c'], 'members': [{'userId': 'a'}, {'userId': 'b'}, {'userId': 'c'}]}, 'a')
    assert value['ownerId'] == 'b'
    assert value['memberIds'] == ['b', 'c']
    assert value['members'][0]['role'] == 'leader'
    assert remaining_group({'ownerId': 'a', 'memberIds': ['a']}, 'a')['ownerId'] is None

@pytest.mark.parametrize('age,allowed', [(0, True), (299, True), (301, False), (3600, False), (-60, False)])
def test_deletion_requires_recent_real_authentication(monkeypatch, age, allowed):
    monkeypatch.setattr(authentication, 'firebase_app', lambda: None)
    monkeypatch.setattr(authentication.auth, 'verify_id_token', lambda *a, **kw: {'uid': 'test', 'auth_time': datetime.now(timezone.utc).timestamp() - age})
    token = HTTPAuthorizationCredentials(scheme='Bearer', credentials='test')
    if allowed: assert authentication.recently_authenticated_user(token) == 'test'
    else:
        with pytest.raises(HTTPException): authentication.recently_authenticated_user(token)

def test_cleanup_removes_only_departing_account_and_retries(monkeypatch):
    from app import account_deletion as deletion
    from test_group_transactions import DB, Ref, Collection
    class Query(Collection):
        def stream(self):
            for path, value in list(self.db.data.items()):
                matches = path.split('/')[-2] == self.path if getattr(self, 'group', False) else path.rsplit('/', 1)[0] == self.path
                if matches and all((f.value in value.get(f.field_path, []) if f.op_string == 'array_contains' else value.get(f.field_path) == f.value) for f in self.filters):
                    yield Ref(self.db, path).get()
    class Store(DB):
        def collection(self, name): return Query(self, name)
        def collection_group(self, name):
            q = Query(self, name); q.group = True; return q
        def recursive_delete(self, ref):
            for key in list(self.data):
                if key == ref.path or key.startswith(ref.path + '/'): del self.data[key]
    db = Store()
    db.data = {
        'accountDeletions/a': {'status': 'pending'},
        'users/a': {'displayName': 'A'}, 'users/a/plans/x': {'name': 'Personal'},
        'users/b': {'displayName': 'B'},
        'groups/g': {'ownerId': 'a', 'memberIds': ['a', 'b'], 'members': [{'userId': 'a'}, {'userId': 'b'}]},
        'groups/g/members/a': {'userId': 'a'}, 'groups/g/members/b': {'userId': 'b'},
        'groups/g/messages/a': {'senderId': 'a', 'text': 'Private'},
        'groups/g/messages/b': {'senderId': 'b', 'text': 'Keep'},
        'groups/g/joinRequests/a': {'id': 'a'},
    }
    monkeypatch.setattr(deletion, 'database', lambda: db)
    monkeypatch.setattr(deletion.firestore, 'transactional', lambda f: f)
    monkeypatch.setattr(deletion.auth, 'update_user', lambda *a, **kw: None)
    attempts = []
    def remove(uid):
        attempts.append(uid)
        if len(attempts) == 1: raise RuntimeError('temporary failure')
    monkeypatch.setattr(deletion.auth, 'delete_user', remove)
    deletion.process('a')
    assert db.data['accountDeletions/a']['status'] == 'pending'
    deletion.process('a')
    assert db.data['accountDeletions/a']['status'] == 'complete'
    assert 'users/a' not in db.data and 'users/a/plans/x' not in db.data
    assert 'groups/g/messages/a' not in db.data and 'groups/g/joinRequests/a' not in db.data
    assert db.data['groups/g']['ownerId'] == 'b'
    assert db.data['groups/g/messages/b']['text'] == 'Keep'
    assert db.data['users/b']['displayName'] == 'B'
