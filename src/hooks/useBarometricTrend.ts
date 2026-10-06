import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Barometer } from 'expo-sensors';
import { clamp } from '@/services/trekking/navigation';

/** Short relative trend only: pressure drift is not an absolute-altitude measurement. */
export function useBarometricTrend(enabled: boolean, walkingSpeed: number | null) {
  const speedRef = useRef(walkingSpeed);
  useEffect(() => { speedRef.current = walkingSpeed; }, [walkingSpeed]);
  const [trend, setTrend] = useState(0);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let cancelled = false;
    let subscription: ReturnType<typeof Barometer.addListener> | undefined;
    const samples: { pressure: number; timestamp: number }[] = [];
    void (async () => {
      try {
        if (!await Barometer.isAvailableAsync() || cancelled) return;
        const permission = await Barometer.getPermissionsAsync();
        const granted = permission.granted || (await Barometer.requestPermissionsAsync()).granted;
        if (!granted || cancelled) return;
        setAvailable(true); setTrend(0);
        Barometer.setUpdateInterval(2000);
        subscription = Barometer.addListener(({ pressure }) => {
          if (cancelled || !Number.isFinite(pressure) || pressure < 250 || pressure > 1100) return;
          const now = Date.now();
          samples.push({ pressure, timestamp: now });
          while (samples.length > 1 && now - samples[0].timestamp > 40000) samples.shift();
          const first = samples[0], seconds = (now - first.timestamp) / 1000;
          const delta = 44330 * (1 - (pressure / first.pressure) ** 0.1903);
          const speed = speedRef.current ?? 0;
          setTrend(seconds >= 20 && speed > 0.5 && Math.abs(delta) > 3 ? clamp(delta / (seconds * speed), -0.2, 0.2) : 0);
        });
      } catch { /* Optional sensor: GPS and route preview remain available. */ }
    })();
    return () => { cancelled = true; subscription?.remove(); };
  }, [enabled]);
  return { slope: enabled ? trend : 0, available: enabled && available };
}
