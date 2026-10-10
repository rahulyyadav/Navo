import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { acceptFix, type Fix } from '@/services/trekking/navigation';

export function useTrekLocation(enabled: boolean, onFix?: (fix: Fix) => void) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [state, setState] = useState<'idle' | 'acquiring' | 'tracking' | 'denied' | 'poor' | 'unavailable'>('idle');
  const [foreground, setForeground] = useState(AppState.currentState === 'active' || AppState.currentState === null);
  const [now, setNow] = useState(() => Date.now());
  const [retryNonce, setRetryNonce] = useState(0);
  const previous = useRef<Fix | null>(null);
  const fixCallback = useRef(onFix);
  useEffect(() => { fixCallback.current = onFix; }, [onFix]);
  useEffect(() => { const sub = AppState.addEventListener('change', value => setForeground(value === 'active')); return () => sub.remove(); }, []);
  useEffect(() => {
    if (!enabled || !foreground) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled, foreground]);
  useEffect(() => {
    if (!enabled || !foreground) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    previous.current = null;
    let acquisitionTimeout: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) { clearTimeout(acquisitionTimeout); setState('denied'); return; }
        setFix(null); setState('acquiring');
        acquisitionTimeout = setTimeout(() => { if (!cancelled && !previous.current) setState('unavailable'); }, 25000);
        const receive = (position: Location.LocationObject) => {
          if (cancelled) return;
          const next: Fix = { ...position.coords, timestamp: position.timestamp };
          if (!acceptFix(next, previous.current, Date.now())) { setState('poor'); return; }
          clearTimeout(acquisitionTimeout);
          previous.current = next;
          setFix(next); setNow(Date.now()); setState('tracking'); fixCallback.current?.(next);
        };
        const watching = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 }, receive, () => { if (!cancelled) setState('unavailable'); });
        if (cancelled) watching.remove(); else subscription = watching;
      } catch { clearTimeout(acquisitionTimeout); if (!cancelled) setState('unavailable'); }
    })();
    return () => { cancelled = true; clearTimeout(acquisitionTimeout); subscription?.remove(); };
  }, [enabled, foreground, retryNonce]);
  const stale = !fix || now - fix.timestamp > 15000;
  return { fix, state, foreground, stale, age: fix ? Math.max(0, Math.floor((now - fix.timestamp) / 1000)) : null, retry: () => setRetryNonce(n => n + 1) };
}
