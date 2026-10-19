"""Review state-machine tests with an in-memory store; not a Firestore emulator."""
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app import reviews, main
from test_group_transactions import DB, Collection, Ref

@pytest.fixture
def store(monkeypatch):
    db=DB()
    monkeypatch.setattr(reviews,'database',lambda:db)
    monkeypatch.setattr(reviews.firestore,'transactional',lambda f:f)
    monkeypatch.setattr(Collection,'order_by',lambda self,*a,**k:self,raising=False)
    for uid in ['alice','bob']: db.collection('users').document(uid).set({'displayName':uid,'email':uid+'@example.com'})
    return db,main.ROUTES[0]['id']

def payload(**changes):
    return reviews.ReviewInput(**{'rating':4,'text':'A lovely forest walk. Wet steps near the start.','visitedOn':'2026-10-01','conditions':['wet'],**changes})

def test_pending_is_private_and_one_review_per_person(store):
    db,rid=store
    for _ in range(2): assert reviews.save_review(rid,payload(),'alice')['status']=='pending'
    assert len([p for p in db.data if p.startswith('trailReviews/')])==1
    assert reviews.list_reviews(rid,'bob')['reviews']==[]
    own=reviews.list_reviews(rid,'alice')['mine']
    assert own['status']=='pending' and own['rating']==4
    assert 'authorId' not in own and 'email' not in own

def test_moderation_requires_secret_and_current_revision_and_edits_unpublish(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice')
    revision=ref.get().to_dict()['revision'];decision=reviews.ReviewDecision(status='published',revision=revision)
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    with pytest.raises(HTTPException) as e: reviews.moderate_review(ref.id,decision,'Bearer wrong')
    assert e.value.status_code==401
    reviews.moderate_review(ref.id,decision,'Bearer '+'x'*32)
    assert len(reviews.list_reviews(rid,'bob')['reviews'])==1
    reviews.save_review(rid,payload(text='Edited account of the hike.'),'alice')
    assert reviews.list_reviews(rid,'bob')['reviews']==[]
    with pytest.raises(HTTPException) as e: reviews.moderate_review(ref.id,decision,'Bearer '+'x'*32)
    assert e.value.status_code==409

def test_deletion_affects_only_the_current_author_and_cannot_be_republished(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice');revision=ref.get().to_dict()['revision']
    reviews.delete_review(rid,'bob');assert ref.get().to_dict()['text']
    reviews.delete_review(rid,'alice');assert reviews.list_reviews(rid,'alice')['mine'] is None
    assert 'text' not in ref.get().to_dict()
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    with pytest.raises(HTTPException) as e: reviews.moderate_review(ref.id,reviews.ReviewDecision(status='published',revision=revision),'Bearer '+'x'*32)
    assert e.value.status_code==404

def test_reports_are_private_deduplicated_and_bound_to_the_trail(store):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice');ref.update({'status':'published'})
    for _ in range(2): reviews.report_review(rid,ref.id,reviews.ReviewReport(reason='inaccurate'),'bob')
    assert len([p for p in db.data if '/reviewReports/' in p])==1
    assert 'reports' not in reviews.list_reviews(rid,'bob')['reviews'][0]
    other=main.ROUTES[1]['id']
    with pytest.raises(HTTPException): reviews.report_review(other,ref.id,reviews.ReviewReport(reason='spam'),'bob')

def test_review_validation_and_authentication():
    for change in [{'rating':0},{'rating':5.5},{'text':'short'},{'visitedOn':'2999-01-01'},{'conditions':['safe']},{'authorName':'spoof'}]:
        with pytest.raises(ValidationError): payload(**change)
    assert payload(conditions=['wet','wet']).conditions==['wet']
    client=TestClient(main.app,raise_server_exceptions=False);rid=main.ROUTES[0]['id']
    assert client.get(f'/routes/{rid}/reviews').status_code in [401,503]
    assert client.put(f'/routes/{rid}/reviews/mine',json=payload().model_dump(mode='json')).status_code in [401,503]
    assert client.delete(f'/routes/{rid}/reviews/mine').status_code in [401,503]


def test_account_deletion_covers_reviews_and_reports():
    from app.account_deletion import ERASURE_FIELDS
    assert ERASURE_FIELDS['trailReviews']==['authorId']
    assert ERASURE_FIELDS['reviewReports']==['authorId']


def test_pending_queue_requires_moderation_secret(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice')
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    with pytest.raises(HTTPException): reviews.moderation_queue('Bearer wrong')
    result=reviews.moderation_queue('Bearer '+'x'*32)
    assert len(result['reviews'])==1
    assert result['reviews'][0]['revision']
    assert result['reviews'][0]['routeId']==rid
    assert 'authorId' not in result['reviews'][0]


def test_report_resolution_is_private_and_removes_it_from_pending_queue(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice');ref.update({'status':'published'})
    reviews.report_review(rid,ref.id,reviews.ReviewReport(reason='spam'),'bob')
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    with pytest.raises(HTTPException): reviews.resolve_report(ref.id,'bob','Bearer wrong')
    assert reviews.resolve_report(ref.id,'bob','Bearer '+'x'*32)=={'resolved':True}
    assert db.data[f'trailReviews/{ref.id}/reviewReports/bob']['resolved'] is True
    assert ref.get().to_dict()['status']=='published'


def test_report_queue_filters_resolved_items_and_skips_deleted_reviews(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice');ref.update({'status':'published'})
    reviews.report_review(rid,ref.id,reviews.ReviewReport(reason='spam'),'bob')
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    class ReportQuery:
        def where(self,*,filter): self.filter=filter;return self
        def order_by(self,*args,**kwargs): return self
        def limit(self,n): assert n==20;return self
        def stream(self):
            for path,data in db.data.items():
                if '/reviewReports/' in path and data.get(self.filter.field_path)==self.filter.value:
                    parent=Ref(db,path.rsplit('/',2)[0])
                    yield SimpleNamespace(id=path.rsplit('/',1)[1],reference=SimpleNamespace(parent=SimpleNamespace(parent=parent)),to_dict=lambda data=data:data)
    monkeypatch.setattr(db,'collection_group',lambda name:ReportQuery(),raising=False)
    with pytest.raises(HTTPException): reviews.reported_reviews('Bearer wrong')
    result=reviews.reported_reviews('Bearer '+'x'*32)
    assert result['reports'][0]['reason']=='spam'
    assert result['reports'][0]['review']['id']==ref.id
    reviews.resolve_report(ref.id,'bob','Bearer '+'x'*32)
    assert reviews.reported_reviews('Bearer '+'x'*32)=={'reports':[]}


def test_moderation_http_routes_never_allow_normal_or_missing_credentials(monkeypatch):
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    client=TestClient(main.app,raise_server_exceptions=False)
    assert client.get('/internal/reviews').status_code==401
    assert client.get('/internal/review-reports',headers={'Authorization':'Bearer ordinary-token'}).status_code==401


def test_erasure_tombstone_blocks_late_review_writes_reports_and_publication(store,monkeypatch):
    db,rid=store;reviews.save_review(rid,payload(),'alice');ref=reviews.review_ref(rid,'alice');ref.update({'status':'published'})
    revision=ref.get().to_dict()['revision']
    db.collection('accountDeletions').document('alice').set({'status':'pending'})
    db.collection('accountDeletions').document('bob').set({'status':'pending'})
    for action in [lambda:reviews.save_review(rid,payload(),'alice'),lambda:reviews.delete_review(rid,'alice'),lambda:reviews.report_review(rid,ref.id,reviews.ReviewReport(reason='spam'),'bob')]:
        with pytest.raises(HTTPException) as e:action()
        assert e.value.status_code==403
    monkeypatch.setattr(reviews,'settings',lambda:SimpleNamespace(maintenance_token='x'*32))
    with pytest.raises(HTTPException) as e:reviews.moderate_review(ref.id,reviews.ReviewDecision(status='published',revision=revision),'Bearer '+'x'*32)
    assert e.value.status_code==409
