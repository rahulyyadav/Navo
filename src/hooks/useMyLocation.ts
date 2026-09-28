import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export type Coords = { latitude: number; longitude: number; accuracy: number | null; timestamp?: number };
export type LocationState = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

export function useMyLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [state, setState] = useState<LocationState>('idle');
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function locate(): Promise<Coords | null> {
    if (lock.current) return null;
    lock.current = true;
    setState('locating');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active.current) return null;
      if (status !== 'granted') { setState('denied'); return null; }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('GPS timeout')), 20000); }),
      ]);
      if (!active.current) return null;
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp };
      setCoords(next);
      setState('granted');
      return next;
    } catch {
      if (active.current) setState('unavailable');
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
      lock.current = false;
    }
  }
  return { coords, state, locate };
}
