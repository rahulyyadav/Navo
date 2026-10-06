import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { distance, elevationTrend, matchRoute, type Fix, type RouteModel } from '@/services/trekking/navigation';
import { useTrekLocation } from './useTrekLocation';

type Phase = 'ready' | 'active' | 'paused' | 'ended';
type Mode = 'live' | 'demo';
export function useTrekSession(route: RouteModel, storageKey?: string, initialDemo = false) {
  const [loaded, setLoaded] = useState(!storageKey);
  const [mode, setMode] = useState<Mode>('demo');
  const [storedPhase, setPhase] = useState<Phase>(initialDemo ? 'active' : 'ready');
  const [progress, setProgress] = useState(0);
  const phase: Phase = mode === 'demo' && progress >= route.total ? 'ended' : storedPhase;
  const [elapsed, setElapsed] = useState(0);
  const [travelled, setTravelled] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [storageError, setStorageError] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active' || AppState.currentState === null);
  const location = useTrekLocation(loaded && mode === 'live' && phase === 'active');
  const fixes = useRef<Fix[]>([]);
  const lastMeasured = useRef<Fix | null>(null);
  const [slope, setSlope] = useState(0);
  const match = useMemo(() => location.fix ? matchRoute(route, location.fix) : null, [location.fix, route]);
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (cancelled || !raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.version !== 1 || !['demo', 'live'].includes(data.mode)) return;
        setMode(data.mode);
        setProgress(typeof data.progress === 'number' && Number.isFinite(data.progress) ? Math.max(0, Math.min(route.total, data.progress)) : 0);
        setElapsed(typeof data.elapsed === 'number' && Number.isFinite(data.elapsed) ? Math.max(0, data.elapsed) : 0);
        setTravelled(typeof data.travelled === 'number' && Number.isFinite(data.travelled) ? Math.max(0, data.travelled) : 0);
        setPhase(data.phase === 'ended' ? 'ended' : 'paused');
      } catch { /* Ignore invalid saved session. */ }
    }).catch(() => { if (!cancelled) setStorageError(true); }).finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [route.total, storageKey]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { const active = state === 'active'; setForeground(active); if (!active) setPhase(current => current === 'active' ? 'paused' : current); });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!loaded || phase !== 'active' || !foreground) { lastMeasured.current = null; return; }
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(); const delta = Math.min((now - previous) / 1000, 2); previous = now;
      setElapsed(value => value + delta);
      if (mode === 'demo') setProgress(value => Math.min(route.total, value + route.total / 180 * delta * speed));
    }, 250);
    return () => clearInterval(timer);
  }, [phase, mode, route.total, speed, loaded, foreground]);
  useEffect(() => {
    const fix = location.fix;
    if (!fix || mode !== 'live' || phase !== 'active' || location.stale) return;
    if (lastMeasured.current && fix.timestamp > lastMeasured.current.timestamp) {
      const moved = distance(lastMeasured.current, fix);
      if (moved > Math.max(5, Math.max(fix.accuracy ?? 100, lastMeasured.current.accuracy ?? 100))) { setTravelled(value => value + moved); lastMeasured.current = fix; }
    }
    if (!lastMeasured.current) lastMeasured.current = fix;
    fixes.current = [...fixes.current.filter(point => fix.timestamp - point.timestamp <= 60000), fix];
    setSlope(elevationTrend(fixes.current));
  }, [location.fix, location.stale, mode, phase]);
  // Debounce progress persistence; phase changes flush immediately. No raw coordinates are saved.
  const snapshot = useRef({ version: 1, mode, phase, progress, elapsed, travelled });
  useEffect(() => { snapshot.current = { version: 1, mode, phase, progress, elapsed, travelled }; }, [mode, phase, progress, elapsed, travelled]);
  useEffect(() => {
    if (!storageKey || !loaded || phase === 'ready') return;
    const save = () => { void AsyncStorage.setItem(storageKey, JSON.stringify(snapshot.current)).catch(() => setStorageError(true)); };
    save(); const timer = setInterval(save, 5000);
    return () => { clearInterval(timer); save(); };
  }, [storageKey, loaded, mode, phase]);
  function start(nextMode: Mode) {
    lastMeasured.current = null; fixes.current = [];
    setProgress(0); setElapsed(0); setTravelled(0); setSlope(0); setMode(nextMode); setPhase('active');
  }
  return { loaded, mode, phase, progress, elapsed, travelled, slope, speed, storageError, location, match, start, togglePause: () => setPhase(value => value === 'active' ? 'paused' : value === 'paused' ? 'active' : value), end: () => setPhase('ended'), cycleSpeed: () => setSpeed(value => value === 1 ? 3 : value === 3 ? 6 : 1) };
}
