"""Conservative group proximity filtering, never a rescue availability guarantee."""
import math
from datetime import datetime, timezone, timedelta

def nearby(origin, member, now=None):
    now = now or datetime.now(timezone.utc)
    position = member.get('lastLocation') or {}
    if not member.get('nearbyAlertsEnabled') or not member.get('locationSharingEnabled'):
        return False
    try:
        captured = datetime.fromisoformat(position['capturedAt'].replace('Z', '+00:00'))
        age = now - captured
        if not timedelta(0) <= age <= timedelta(minutes=2): return False
        accuracy = float(position['accuracy'])
        if not 0 <= accuracy <= 100 or not 0 <= origin['accuracy'] <= 100: return False
        lat1, lat2 = map(math.radians, [origin['latitude'], position['latitude']])
        dlat = lat2-lat1; dlon = math.radians(position['longitude']-origin['longitude'])
        a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
        distance = 6371000 * 2 * math.asin(min(1, math.sqrt(max(0, a))))
        return distance + accuracy + origin['accuracy'] <= 500
    except (ValueError, TypeError, KeyError):
        return False
