import { loadJSON } from './load-json.mjs';
import { readRoute, profilePath, profileSummary, nearestSample, DEM_TEMPLATE } from './model.mjs';

const $ = id => document.getElementById(id);
const preview = new URLSearchParams(location.search).get('state');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('motion') === 'reduce';
if (reducedMotion) document.documentElement.dataset.reducedMotion = 'true';
const startedAt = performance.now();
let map, route, samples = [], inspector, terrainReady = false, perspective = true, measuring = false;
let startupTimer, summary;
const cameraButtons = ['fit', 'zoom-in', 'zoom-out', 'north', 'view-2d', 'view-3d', 'tilt', 'measure'];

function state(kind, title, detail) {
  $('state-card').hidden = kind === 'ready';
  $('state-title').textContent = title;
  $('state-detail').textContent = detail;
  $('state-icon').className = kind === 'loading' ? 'spinner' : '';
  $('retry').hidden = kind === 'loading' || kind === 'ready';
  $('terrain-status').lastChild.textContent = kind === 'ready' ? (perspective ? '3D terrain ready' : '2D map view') : kind === 'loading' ? 'Loading terrain' : kind === 'offline' ? 'Terrain unavailable offline' : kind === 'empty' ? 'No route selected' : 'Map needs attention';
}
function showProfile() {
  summary = profileSummary(samples);
  const path = profilePath(samples);
  if (!path) {
    $('profile-readout').textContent = 'No complete elevation profile is available.';
    $('height-range').textContent = 'Unknown';
    $('profile-position').disabled = true;
    return;
  }
  $('profile-line').setAttribute('d', path.line);
  $('profile-area').setAttribute('d', path.area);
  $('profile').setAttribute('aria-label', `Modelled elevation profile, ${Math.round(path.min)} to ${Math.round(path.max)} metres. Not surveyed trail elevation.`);
  $('height-range').textContent = `${Math.round(path.min).toLocaleString()}–${Math.round(path.max).toLocaleString()} m`;
  $('profile-length').textContent = `${(path.distance / 1000).toFixed(2)} km`;
  $('profile-position').disabled = false;
  inspectProfile(0);
}
function inspectProfile(percent) {
  if (!summary) return;
  const target = summary.distance * percent / 100;
  const sample = nearestSample(samples, target);
  const x = 8 + sample.distanceM / summary.distance * 284;
  $('profile-cursor').setAttribute('x1', x);
  $('profile-cursor').setAttribute('x2', x);
  $('profile-readout').textContent = `${(sample.distanceM / 1000).toFixed(2)} km · ~${Math.round(sample.elevationM).toLocaleString()} m modelled height`;
  if (inspector) inspector.setLngLat(sample.coordinate);
}
function cameraDuration() { return reducedMotion ? 0 : 550; }
function setPerspective(enabled) {
  perspective = enabled;
  map.setTerrain(enabled ? { source: 'terrain-dem', exaggeration: 1 } : null);
  map.easeTo({ pitch: enabled ? 60 : 0, duration: cameraDuration() });
  $('view-2d').setAttribute('aria-pressed', String(!enabled));
  $('view-3d').setAttribute('aria-pressed', String(enabled));
  $('terrain-caption').textContent = enabled ? 'Elevation-backed perspective' : 'Flat map · hillshade is not 3D';
  if (terrainReady) state('ready', '', '');
}
function fitRoute() {
  const h = $('map').clientHeight, w = $('map').clientWidth;
  if (route) map.fitBounds(route.bounds, { padding: { top: Math.min(140, h * 0.23), bottom: Math.min(150, h * 0.25), left: Math.min(65, w * 0.1), right: Math.min(65, w * 0.14) }, pitch: perspective ? 60 : 0, bearing: -24, maxZoom: 14.5, duration: cameraDuration() });
}
function addMarker(api, coordinate, label, endpoint = false) {
  const el = document.createElement('button');
  el.className = `marker${endpoint ? ' end' : ''}`;
  el.setAttribute('aria-label', label);
  const popup = new api.Popup({ offset: 20 }).setText(label);
  return new api.Marker({ element: el }).setLngLat(coordinate).setPopup(popup).addTo(map);
}
async function initializeMap() {
  const api = await import('./vendor/maplibre-gl.mjs');
  api.setWorkerUrl(new URL('./vendor/maplibre-gl-worker.mjs', import.meta.url).href);
  api.setWorkerCount(2);
  map = new api.Map({
    container: 'map', center: [85.392, 27.584], zoom: 13.4, pitch: 60, bearing: -24,
    minZoom: 11, maxZoom: 16, maxPitch: 60,
    pixelRatio: Math.min(devicePixelRatio || 1, 1.5), reduceMotion: reducedMotion,
    maxBounds: [[85.26, 27.47], [85.53, 27.71]],
    attributionControl: false, renderWorldCopies: false,
    style: { version: 8,
      sources: {
        'osm-map': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' },
        'terrain-dem': { type: 'raster-dem', tiles: [DEM_TEMPLATE], tileSize: 256, encoding: 'terrarium', maxzoom: 14, attribution: 'Mapzen / Tilezen, USGS & NOAA' },
        'hillshade-dem': { type: 'raster-dem', tiles: [DEM_TEMPLATE], tileSize: 256, encoding: 'terrarium', maxzoom: 14 }
      },
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#c8d7bc' } },
        { id: 'basemap', type: 'raster', source: 'osm-map', paint: { 'raster-saturation': -0.35, 'raster-contrast': -0.1 } },
        { id: 'hillshade', type: 'hillshade', source: 'hillshade-dem', paint: { 'hillshade-exaggeration': 0.38, 'hillshade-shadow-color': '#243e3f', 'hillshade-highlight-color': '#ffffe0', 'hillshade-illumination-anchor': 'map' } }],
      terrain: { source: 'terrain-dem', exaggeration: 1 }
    }
  });
  map.addControl(new api.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
  let errorShown = false;
  function terrainCheck() {
    if (!map.getTerrain() || !map.isStyleLoaded()) return;
    const point = route?.points[Math.floor(route.points.length / 2)] || [85.395, 27.58];
    const height = map.queryTerrainElevation(point);
    if (Number.isFinite(height) && height > 100 && height < 9000 && map.isSourceLoaded('terrain-dem')) {
      if (!terrainReady) {
        $('performance').textContent = `First terrain ${(performance.now() - startedAt).toFixed(0)} ms`;
        terrainReady = true;
      }
      clearTimeout(startupTimer);
      if (!errorShown && preview !== 'empty') state('ready', '', '');
    }
  }
  map.on('idle', terrainCheck);
  map.on('error', event => {
    if (event.sourceId === 'terrain-dem' || event.sourceId === 'hillshade-dem') {
      errorShown = true;
      state('error', 'Elevation tiles unavailable', 'The route and profile remain available. A shaded map alone does not confirm 3D terrain. Check your connection and retry.');
    } else if (event.sourceId === 'osm-map') {
      errorShown = true;
      state('error', 'Map tiles are incomplete', 'Some online map tiles could not load. This public interactive service has no availability guarantee. Retry when connected.');
    }
  });
  map.once('load', () => {
    cameraButtons.forEach(id => { $(id).disabled = false; });
    if (route) {
      map.addSource('demo-route', { type: 'geojson', data: route.feature });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'demo-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#172a2b', 'line-width': 8, 'line-opacity': 0.9 } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'demo-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#e4ff89', 'line-width': 4 } });
      addMarker(api, route.points[0], 'Route start near Godawari garden. Unverified trailhead reference.');
      addMarker(api, route.points.at(-1), 'Phulchowki area: snapped routing destination, not verified summit access.', true);
      const el = document.createElement('div'); el.className = 'marker inspect';
      inspector = new api.Marker({ element: el }).setLngLat(route.points[0]).addTo(map);
      fitRoute();
    } else $('fit').disabled = true;
    terrainCheck();
  });
  map.on('move', () => {
    const pitch = Math.round(map.getPitch()), bearing = Math.round(map.getBearing());
    if ($('tilt').value !== String(pitch)) $('tilt').value = pitch;
    if ($('tilt-value').textContent !== `${pitch}°`) $('tilt-value').textContent = `${pitch}°`;
    if ($('bearing').textContent !== `${bearing}°`) $('bearing').textContent = `${bearing}°`;
  });
  map.getCanvas().addEventListener('webglcontextlost', () => state('error', 'Graphics context interrupted', 'The device stopped rendering the map. Your local research route and profile are retained. Reload to try again.'));
  startupTimer = setTimeout(() => {
    if (!terrainReady) state('error', 'Terrain has not finished loading', 'No complete terrain view is confirmed. Check network access or use the local profile; offline terrain regions are not implemented.');
  }, 25000);
}
async function boot() {
  if (preview || reducedMotion) {
    $('preview-label').hidden = false;
    $('preview-label').textContent = preview ? `State preview: ${preview}` : 'Reduced-motion preview';
  }
  const [geometry, profile] = await Promise.all([
    loadJSON('./data/route.geojson'),
    loadJSON('./data/elevation-profile.json').catch(() => null)
  ]);
  if (preview !== 'empty') route = readRoute(geometry);
  samples = preview === 'empty' ? [] : profile?.samples || [];
  showProfile();
  $('distance').textContent = route ? `${(route.distance / 1000).toFixed(2)} km` : '—';
  if (!route) {
    $('route-title').textContent = 'No demonstration route';
    document.querySelector('.endpoints').hidden = true;
  }
  if (preview === 'loading') return;
  if (preview === 'error') return state('error', 'Map could not be loaded', 'This is a labeled error-state preview. The route distance and DEM profile still work locally.');
  if (!navigator.onLine || preview === 'offline') return state('offline', 'Terrain is not downloaded', 'The local research profile can be read, but surrounding map and terrain tiles need a connection. This is not offline navigation.');
  if (preview === 'empty') state('empty', 'No route to explore yet', 'The map can be inspected, but no route distance, trailhead or elevation profile is available in this empty-state preview.');
  await initializeMap();
}

$('retry').addEventListener('click', () => { location.href = './'; });
$('details-toggle').addEventListener('click', () => {
  const collapsed = $('route-panel').classList.toggle('collapsed');
  $('details-toggle').setAttribute('aria-expanded', String(!collapsed));
  $('details-toggle').textContent = collapsed ? 'Show details' : 'Hide details';
  requestAnimationFrame(() => map?.resize());
});
$('profile-position').addEventListener('input', event => inspectProfile(Number(event.target.value)));
$('fit').addEventListener('click', fitRoute);
$('zoom-in').addEventListener('click', () => map.zoomIn({ duration: cameraDuration() }));
$('zoom-out').addEventListener('click', () => map.zoomOut({ duration: cameraDuration() }));
$('north').addEventListener('click', () => map.easeTo({ bearing: 0, duration: cameraDuration() }));
$('view-2d').addEventListener('click', () => setPerspective(false));
$('view-3d').addEventListener('click', () => setPerspective(true));
$('tilt').addEventListener('input', event => {
  const pitch = Number(event.target.value);
  if (pitch > 0 && !perspective) setPerspective(true);
  map.jumpTo({ pitch });
});
$('measure').addEventListener('click', () => {
  if (measuring) return;
  measuring = true; $('measure').disabled = true;
  const frames = []; let previous, first;
  function sample(now) {
    if (!first) first = now;
    if (previous) frames.push(now - previous);
    previous = now;
    if (now - first < 3000) return requestAnimationFrame(sample);
    frames.sort((a, b) => a - b);
    const median = frames[Math.floor(frames.length / 2)], p95 = frames[Math.floor(frames.length * 0.95)];
    $('performance').textContent = `3 s window · median ${median.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms rAF`;
    measuring = false; $('measure').disabled = false;
  }
  // A small intentional camera interaction, never an autoplay orbit.
  map.easeTo({ bearing: map.getBearing() + 35, duration: reducedMotion ? 0 : 2600 });
  requestAnimationFrame(sample);
});
addEventListener('offline', () => state('offline', 'Connection lost', 'Previously loaded tiles may remain visible, but no offline region is installed. The saved research profile remains readable.'));
addEventListener('online', () => state('error', 'Connection restored', 'Reload to request a fresh terrain view. Cached visuals are not a verified offline map.'));
addEventListener('pagehide', () => { clearTimeout(startupTimer); map?.remove(); });
boot().catch(() => state('error', 'The landscape is unavailable', 'Local data, renderer assets or graphics support could not be loaded. Serve this directory over HTTP and check WebGL support, then retry.'));
