import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useNavo } from '@/context/NavoContext';
import { changeLibrary, readLibrary, subscribeLibrary } from '@/lib/trip-library-store';
import { emptyLibrary, type TripLibrary } from '@/services/trip-library';

export function useTripLibrary() {
  const { userId } = useNavo();
  const [state, setState] = useState({ owner: '', data: emptyLibrary(), loaded: false, error: '' });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    try { const data = await readLibrary(userId); if (sequence.current === version) setState({ owner: userId, data, loaded: true, error: '' }); }
    catch { if (sequence.current === version) setState({ owner: userId, data: emptyLibrary(), loaded: false, error: 'Could not open saved trips. Your existing data is unchanged. Retry when device storage is available.' }); }
  }, [userId]);
  useFocusEffect(useCallback(() => { void reload(); return () => { sequence.current++; }; }, [reload]));
  useEffect(() => subscribeLibrary(userId, () => void reload()), [reload, userId]);
  const update = useCallback((change: (data: TripLibrary) => TripLibrary) => changeLibrary(userId, change), [userId]);
  return { data: state.owner === userId ? state.data : emptyLibrary(), loaded: state.owner === userId && state.loaded, error: state.owner === userId ? state.error : '', reload, update };
}
