"""Build a self-contained, public research route document; never fetch tiles."""
from pathlib import Path
import hashlib
import html
import json
import math
import os
import tempfile

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / 'terrain-lab' / 'data'

def build(source=DATA, destination=ROOT / 'phulchowki-pack.html', progress=print):
    payload = {}
    hashes = {}
    for i, name in enumerate(('route.geojson', 'elevation-profile.json', 'provenance.json')):
        raw = (source / name).read_bytes()
        if len(raw) > 2_000_000:
            raise ValueError('Research input exceeds 2 MB limit')
        payload[name] = json.loads(raw)
        hashes[name] = hashlib.sha256(raw).hexdigest()
        progress(f'{i+1}/4: validated JSON {name} ({len(raw)} bytes)')
    points = payload['route.geojson']['features'][0]['geometry']['coordinates']
    samples = payload['elevation-profile.json']['samples']
    if not 2 <= len(points) <= 20000 or not 2 <= len(samples) <= 20000:
        raise ValueError('Missing or oversized route/profile')
    def finite(v):
        return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
    if any(len(p) < 2 or not all(finite(v) for v in p[:2]) or abs(p[0]) > 180 or abs(p[1]) > 85 for p in points):
        raise ValueError('Invalid route coordinate')
    if any(not finite(s.get('elevationM')) or not finite(s.get('distanceM')) or s['distanceM'] < 0 or (i and s['distanceM'] <= samples[i-1]['distanceM']) for i, s in enumerate(samples)):
        raise ValueError('Incomplete or unordered elevation samples')
    xs, ys = zip(*[p[:2] for p in points])
    # Local equirectangular schematic preserves approximate aspect near this area.
    scale_x = math.cos(math.radians(sum(ys)/len(ys)))
    west, east, south, north = min(xs), max(xs), min(ys), max(ys)
    scale = 340 / max((east-west)*scale_x, north-south, 1e-9)
    coords = [(30+(x-west)*scale_x*scale, 370-(y-south)*scale) for x,y in zip(xs,ys)]
    line = ' '.join(f'{x:.2f},{y:.2f}' for x,y in coords)
    low, high = min(s['elevationM'] for s in samples), max(s['elevationM'] for s in samples)
    distance = samples[-1]['distanceM']
    if distance <= 0:
        raise ValueError('Profile has no length')
    profile = ' '.join(f"{10+380*s['distanceM']/distance:.2f},{140-120*(s['elevationM']-low)/max(1,high-low):.2f}" for s in samples)
    rows = ''.join(f"<tr><td>{s['distanceM']/1000:.2f} km</td><td>{s['elevationM']:.1f} m</td></tr>" for s in samples)
    raw_data = html.escape(json.dumps(payload, ensure_ascii=False, indent=2))
    content = f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Navo • Phulchowki offline route reference</title>
<style>body{{background:#19293a;color:#fff;font:17px/1.6 system-ui;margin:0}}main{{max-width:800px;margin:auto;padding:24px}}h1{{line-height:1.15;font-size:clamp(28px,6vw,46px)}}section,details{{background:#2a3b49;padding:20px;margin:20px 0;border-radius:20px}}svg{{width:100%;max-height:440px;background:#17232c;border-radius:14px}}polyline{{fill:none;stroke:#e4ff89;stroke-width:3}}summary{{cursor:pointer;min-height:44px;color:#e4ff89}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}}td{{padding:6px 20px}}.tag{{color:#e4ff89}}@media print{{body,section,details{{background:white;color:black}}}}</style>
<main><p class="tag">NAVO / SAVED ROUTE REFERENCE / NEPAL</p><h1>Godawari to Phulchowki</h1>
<p>Self-contained file. No internet resources, scripts, login or server required after saving.</p>
<section><strong>Route and profile only — no offline basemap or terrain.</strong><p>Public OSRM routing geometry, not a field-verified hiking trail. No directions, GPS tracking, rerouting, closures, safe rest areas or access approval are included. This is a research reference, not field navigation.</p></section>
<section><h2>Route schematic · north up</h2><p>{distance/1000:.2f} km sample line • one way</p>
<svg viewBox="0 0 400 400" role="img" aria-label="Route schematic without surrounding map"><polyline points="{line}"/><circle cx="{coords[0][0]:.2f}" cy="{coords[0][1]:.2f}" r="7" fill="#e4ff89"/><circle cx="{coords[-1][0]:.2f}" cy="{coords[-1][1]:.2f}" r="7" fill="#ffae85"/></svg>
<p>Green: garden-area start reference. Orange: snapped Phulchowki destination. Both require local access review.</p><p>Bounds: {west:.6f}, {south:.6f} to {east:.6f}, {north:.6f} (longitude, latitude).</p></section>
<section><h2>Modelled elevation</h2><p>{low:.0f}–{high:.0f} m • {len(samples)} samples • not measured ascent or hiking time</p><svg viewBox="0 0 400 160" role="img" aria-label="Modelled elevation profile"><polyline points="{profile}"/></svg>
<details><summary>Read all elevation stations</summary><table><tr><th>Along route</th><th>DEM height</th></tr>{rows}</table></details></section>
<section><h2>Data and availability</h2><p>Route: © OpenStreetMap contributors, ODbL; OSRM public foot response dated 21 October 2026. DEM samples: Mapzen / Tilezen; USGS SRTM/GMTED2010 and NOAA ETOPO1. Source datum/accuracy not independently established.</p><p>Map tiles: 0. Terrain tiles: 0. Full raw route, samples and provenance are embedded below. No public tile server has been prefetched.</p><details><summary>Source data, provenance and checksums</summary><pre>{html.escape(json.dumps(hashes,indent=2))}\n{raw_data}</pre></details></section></main></html>'''
    data = content.encode()
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, suffix='.partial', delete=False) as f:
            name = f.name
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, destination)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)
    progress(f'4/4: ready {destination.name} ({len(data)} bytes); SHA256 {hashlib.sha256(data).hexdigest()}')
    return data

if __name__ == '__main__':
    try:
        build()
    except (ValueError, OSError, KeyError, TypeError) as error:
        raise SystemExit(f'Preparation failed; previous completed pack retained: {type(error).__name__}')
