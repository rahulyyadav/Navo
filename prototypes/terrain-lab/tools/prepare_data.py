"""Optional regeneration of the public research fixture. Never downloads map regions.

Requires existing Pillow; uses the system trust store (or certifi when available).
Run from any directory. Only the small set of DEM cells needed for this route is read.
"""
from pathlib import Path
from datetime import datetime, timezone
from io import BytesIO
import hashlib
import json
import math
import ssl
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
SOURCE = REPO / 'docs/audit/evidence/phase-2a/osrm-public-response.json'
ZOOM = 12
try:
    import certifi
    CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CONTEXT = ssl.create_default_context()


def distance(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 2*6371008.8*math.asin(min(1, math.sqrt(h)))


def world_pixel(p):
    scale = 256 * 2**ZOOM
    lat = math.radians(p[1])
    return (p[0]+180)/360*scale, (1-math.asinh(math.tan(lat))/math.pi)/2*scale


def generate():
    original = SOURCE.read_bytes()
    route = json.loads(original)['routes'][0]
    coordinates = route['geometry']['coordinates']
    feature = {'type': 'Feature', 'properties': {'name': 'Godawari → Phulchowki area', 'geometryKind': 'routing-engine', 'fieldVerified': False, 'provider': 'OSRM foot / FOSSGIS', 'fetchedAt': '2026-10-21T06:22:10.606476+00:00', 'providerDistanceM': route['distance'], 'source': '../../../docs/audit/evidence/phase-2a/osrm-public-response.json', 'license': 'OpenStreetMap-derived, ODbL 1.0'}, 'geometry': {'type': 'LineString', 'coordinates': coordinates}}
    tiles, records = {}, []

    def pixel(x, y):
        tile = (x // 256, y // 256)
        if tile not in tiles:
            if len(tiles) >= 16:
                raise RuntimeError('Research fetch limit reached; no region download is permitted.')
            url = f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{ZOOM}/{tile[0]}/{tile[1]}.png'
            with urllib.request.urlopen(url, timeout=20, context=CONTEXT) as response:
                raw = response.read()
            image = Image.open(BytesIO(raw)).convert('RGB')
            if image.size != (256, 256):
                raise ValueError('Unexpected DEM dimensions')
            tiles[tile] = image
            records.append({'url': url, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
        r, g, b = tiles[tile].getpixel((x % 256, y % 256))
        return r*256+g+b/256-32768

    def elevation(p):
        # Pixel-centre bilinear interpolation; no vertical accuracy is inferred.
        x, y = world_pixel(p)
        x -= 0.5
        y -= 0.5
        ix, iy = math.floor(x), math.floor(y)
        fx, fy = x-ix, y-iy
        return (pixel(ix, iy)*(1-fx)+pixel(ix+1, iy)*fx)*(1-fy)+(pixel(ix, iy+1)*(1-fx)+pixel(ix+1, iy+1)*fx)*fy

    cumulative = [0]
    for a, b in zip(coordinates, coordinates[1:]):
        cumulative.append(cumulative[-1]+distance(a, b))
    stations = list(range(0, int(cumulative[-1]), 100)) + [cumulative[-1]]
    samples, segment = [], 0
    for station in stations:
        while segment+1 < len(cumulative)-1 and cumulative[segment+1] < station:
            segment += 1
        length = cumulative[segment+1]-cumulative[segment]
        fraction = (station-cumulative[segment])/length if length else 0
        p = [a+(b-a)*fraction for a, b in zip(coordinates[segment], coordinates[segment+1])]
        samples.append({'distanceM': round(station, 2), 'coordinate': [round(v, 7) for v in p], 'elevationM': round(elevation(p), 1)})
    profile = {'source': 'Mapzen / Tilezen Terrain Tiles on AWS', 'encoding': 'Terrarium', 'zoom': ZOOM, 'sampleSpacingM': 100, 'method': 'bilinear pixel-centre sampling along routing-engine geometry', 'verticalAccuracyM': None, 'ascentM': None, 'samples': samples}
    request_record = json.loads((SOURCE.parent/'osrm-probe-summary.json').read_text())
    provenance = {'preparedAt': datetime.now(timezone.utc).isoformat(), 'routeRequestURL': request_record['requestURL'], 'routeFetchedAt': request_record['fetchedAt'], 'routeSourceSHA256': hashlib.sha256(original).hexdigest(), 'geometryKind': 'routing-engine', 'fieldVerified': False, 'routeVertices': len(coordinates), 'geometryLengthM': round(cumulative[-1], 2), 'sourceVerticalDatum': 'Not independently established for these blended tiles', 'terrainTileSize': 256, 'terrainZoom': ZOOM, 'terrainTiles': records, 'terrainAttribution': 'Mapzen / Tilezen; global GMTED2010 and SRTM courtesy USGS; global ETOPO1 NOAA', 'limitations': ['Not a surveyed trail or access approval', 'No current closure, water or hazard validation', 'DEM profile is not a measured ascent or a hiking ETA', 'No offline map region is created']}
    for name, data in [('route.geojson', {'type': 'FeatureCollection', 'features': [feature]}), ('elevation-profile.json', profile), ('provenance.json', provenance)]:
        (ROOT/'data'/name).write_text(json.dumps(data, indent=2)+'\n')
    print(json.dumps({'vertices': len(coordinates), 'profileSamples': len(samples), 'demTilesRead': len(records), 'distanceM': round(cumulative[-1], 2), 'elevationRangeM': [min(s['elevationM'] for s in samples), max(s['elevationM'] for s in samples)]}))


if __name__ == '__main__':
    generate()
