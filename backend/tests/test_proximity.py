from datetime import datetime, timezone, timedelta
from app.proximity import nearby

def test_filters_stale_imprecise_distant_and_nonconsenting_locations():
    now = datetime.now(timezone.utc)
    origin = dict(latitude=28, longitude=84, accuracy=10)
    member = dict(nearbyAlertsEnabled=True, locationSharingEnabled=True, lastLocation={**origin, 'capturedAt': now.isoformat()})
    assert nearby(origin, member, now)
    assert not nearby(origin, {**member, 'nearbyAlertsEnabled': False}, now)
    for changes in [dict(accuracy=101), dict(longitude=85), dict(capturedAt=(now-timedelta(minutes=3)).isoformat()), dict(capturedAt='invalid')]:
        assert not nearby(origin, {**member, 'lastLocation': {**member['lastLocation'], **changes}}, now)
