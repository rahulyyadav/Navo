import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useNavo } from '@/context/NavoContext';
import { emptyJourneys, readJourneys, subscribeJourneys } from '@/lib/journey-store';
import type { JourneyLibrary } from '@/services/journeys/types';
export function useJourneys() {
    const { userId } = useNavo();
    const [snapshot, setSnapshot] = useState<{
        uid: string;
        data: JourneyLibrary;
        error: string;
        loaded: boolean;
        cached: boolean;
    }>({ uid: '', data: emptyJourneys(), error: '', loaded: false, cached: false });
    const generation = useRef(0);
    const reload = useCallback(async () => {
        const attempt = ++generation.current;
        if (!userId)
            return;
        try {
            let cached = false;
            const data = await readJourneys(userId, available => { cached = !available; });
            if (attempt === generation.current)
                setSnapshot({ uid: userId, data, error: '', loaded: true, cached });
        }
        catch (error) {
            if (attempt === generation.current)
                setSnapshot({ uid: userId, data: emptyJourneys(), error: error instanceof Error ? error.message : 'Could not read journeys.', loaded: true, cached: true });
        }
    }, [userId]);
    useFocusEffect(useCallback(() => { void reload(); return () => { generation.current++; }; }, [reload]));
    useEffect(() => subscribeJourneys(() => { void reload(); }), [reload]);
    return snapshot.uid === userId ? { ...snapshot, reload } : { uid: userId, data: emptyJourneys(), error: '', loaded: false, cached: false, reload };
}
