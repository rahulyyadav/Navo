from datetime import datetime, timezone, timedelta
import pytest
from pydantic import ValidationError
from app.schemas import Position

@pytest.mark.parametrize('stamp', ['now', '2026-01-01T00:00:00', (datetime.now(timezone.utc)-timedelta(hours=1)).isoformat(), (datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()])
def test_stale_invalid_or_future_locations_are_rejected(stamp):
    with pytest.raises(ValidationError):
        Position(latitude=27.7, longitude=85.3, accuracy=10, capturedAt=stamp)

def test_recent_location_is_accepted():
    p = Position(latitude=27.7, longitude=85.3, accuracy=10, capturedAt=datetime.now(timezone.utc).isoformat())
    assert p.latitude == 27.7
