import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useFirebaseAuth } from '@/context/AuthContext';
import { collection, doc, limit, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { firestore, firebaseConfigured } from '@/lib/firebase/client';
import { apiBase, requestAPI, actionError } from '@/lib/api';
import type { TrekGroup } from '@/types/navo';
import type { CloudNotification, CloudProfile } from '@/types/cloud';

type CloudState = { ready: boolean; status: string; error: string; groups: TrekGroup[]; notifications: CloudNotification[]; remoteProfile: CloudProfile | null; retry: () => void; api: <T>(path: string, body?: unknown, method?: string) => Promise<T> };
const Context = createContext<CloudState | null>(null);
export function decodeCloud(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(decodeCloud);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeCloud(item)]));
  return value;
}
export function CloudProvider({ children }: PropsWithChildren) {
  const { user } = useFirebaseAuth();
  const userId = user?.uid ?? '';
  const isSignedIn = Boolean(user);
  const getToken = useCallback(() => user ? user.getIdToken() : Promise.resolve(null), [user]);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ uid: string; ready: boolean; status: string; error: string; groups: TrekGroup[]; notifications: CloudNotification[]; remoteProfile: CloudProfile | null }>({ uid: '', ready: false, status: 'Not connected', error: '', groups: [], notifications: [], remoteProfile: null });
  const api = useCallback(<T,>(path: string, body?: unknown, method?: string) => requestAPI<T>(getToken, path, body, method), [getToken]);
  useEffect(() => {
    let active = true;
    const cleanups: (() => void)[] = [];
    const uid = isSignedIn && userId ? userId : '';
    const initial = { uid, ready: false, status: 'Connecting', error: '', groups: [], notifications: [], remoteProfile: null };
    void (async () => {
      if (!active) return;
      setSnapshot(initial);
      if (!firestore || !firebaseConfigured || !apiBase || !uid) {
        if (active) setSnapshot({ ...initial, status: uid ? 'Backend setup required' : 'Signed out' });
        return;
      }
      try {
        await api('/session');
        if (!active) return;
        setSnapshot({ ...initial, ready: true, status: 'Connecting to Firestore' });
        const failure = () => { if (active) setSnapshot(current => ({ ...current, status: 'Connection interrupted', error: 'Could not sync Firebase data. Check your connection, Firestore rules and backend setup, then retry.' })); };
        cleanups.push(onSnapshot(query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid), orderBy('updatedAt', 'desc'), limit(50)), { includeMetadataChanges: true }, result => {
          if (active) setSnapshot(current => ({ ...current, groups: result.docs.map(item => ({ ...decodeCloud(item.data()) as TrekGroup, id: item.id })), status: result.metadata.fromCache ? 'Cached · reconnecting' : 'Connected', error: '' }));
        }, failure));
        cleanups.push(onSnapshot(query(collection(firestore, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)), result => {
          if (active) setSnapshot(current => ({ ...current, notifications: result.docs.map(item => ({ ...decodeCloud(item.data()) as CloudNotification, id: item.id })) }));
        }, failure));
        cleanups.push(onSnapshot(doc(firestore, 'users', uid), result => { if (active) setSnapshot(current => ({ ...current, remoteProfile: result.exists() ? decodeCloud(result.data()) as CloudProfile : null })); }, failure));
      } catch (error) { if (active) setSnapshot({ ...initial, status: 'Connection unavailable', error: actionError(error) }); }
    })();
    return () => { active = false; cleanups.forEach(stop => stop()); };
  }, [api, isSignedIn, userId, attempt]);
  const value = useMemo(() => ({ ...snapshot, ready: snapshot.uid === userId && snapshot.ready, groups: snapshot.uid === userId ? snapshot.groups : [], notifications: snapshot.uid === userId ? snapshot.notifications : [], remoteProfile: snapshot.uid === userId ? snapshot.remoteProfile : null, api, retry: () => setAttempt(value => value + 1) }), [snapshot, userId, api]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCloud() { const state = useContext(Context); if (!state) throw new Error('CloudProvider missing'); return state; }
