import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { palettes, resolveTheme, validThemeMode, type ThemeMode, type ThemePalette, type ThemeScheme } from '@/theme/palettes';

const key = 'navo:appearance';
type ThemeContextValue = { mode: ThemeMode; scheme: ThemeScheme; palette: ThemePalette; ready: boolean; persistenceError: string; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue>({ mode: 'system', scheme: 'light', palette: palettes.light, ready: false, persistenceError: '', setMode: () => undefined });

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, updateMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const writes = useRef(Promise.resolve());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void AsyncStorage.getItem(key).then(saved => { if (alive.current && validThemeMode(saved)) updateMode(saved); })
      .catch(() => undefined).finally(() => { if (alive.current) setReady(true); });
    return () => { alive.current = false; };
  }, []);
  const setMode = useCallback((next: ThemeMode) => {
    if (!validThemeMode(next)) return;
    updateMode(next); setPersistenceError('');
    // Serialize writes so quick selections cannot restore an older choice on restart.
    writes.current = writes.current.catch(() => undefined).then(() => AsyncStorage.setItem(key, next)).catch(() => {
      if (alive.current) setPersistenceError('Your appearance changed, but could not be saved on this device. Try selecting it again.');
    });
  }, []);
  const scheme = resolveTheme(mode, system);
  const palette = palettes[scheme];
  useEffect(() => { void SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined); }, [palette.background]);
  const value = useMemo(() => ({ mode, scheme, palette, ready, persistenceError, setMode }), [mode, scheme, palette, ready, persistenceError, setMode]);
  return <ThemeContext.Provider value={value}>{ready ? children : <View style={{ flex: 1, backgroundColor: palette.background }}/>}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
