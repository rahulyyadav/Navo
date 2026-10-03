import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text } from 'react-native';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCloud } from '@/context/CloudContext';
import { useMyLocation } from '@/hooks/useMyLocation';
import { actionError, requestId } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { Badge, Button, Card, Notice, SectionTitle } from './ui';

/** Explicit, foreground-only sharing. Never implies background tracking. */
export function TrekLocationSession({ groupId }: { groupId: string }) {
  const { api, ready } = useCloud(); const { locate } = useMyLocation();
  const [sharing, setSharing] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [updated, setUpdated] = useState('');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const pendingWrite = useRef<Promise<unknown>>(Promise.resolve());
  const generation = useRef(0); const sending = useRef(false); const lastSent = useRef(0);
  const stop = useCallback(() => {
    generation.current++; subscription.current?.remove(); subscription.current = null; setSharing(false);
  }, []);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => {
      // This counter invalidates asynchronous permission and GPS callbacks on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++; subscription.current?.remove(); listener.remove();
    };
  }, [stop]);
  useEffect(() => { if (ready) return; const timer = setTimeout(stop, 0); return () => clearTimeout(timer); }, [ready, stop]);
  async function start() {
    if (busy || sharing) return;
    setBusy(true); setError(''); setUpdated(''); const run = ++generation.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Allow location access to share your position. You can still use the group without it.');
      if (generation.current !== run) return;
      const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 15000 }, position => {
        if (generation.current !== run || sending.current || Date.now() - lastSent.current < 15000) return;
        if (position.coords.accuracy == null || position.coords.accuracy > 100) { setError('Waiting for a GPS fix accurate to 100 m or better.'); return; }
        sending.current = true;
        pendingWrite.current = api(`/groups/${groupId}/location`, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }, 'PUT').then(() => {
          if (generation.current === run) { lastSent.current = Date.now(); setUpdated(new Date().toLocaleTimeString()); setError(''); }
        }).catch(failure => { if (generation.current === run) { setError(actionError(failure)); stop(); } }).finally(() => { sending.current = false; });
      }, reason => { if (generation.current === run) { setError(reason); stop(); } });
      if (generation.current !== run) watcher.remove();
      else { subscription.current = watcher; setSharing(true); }
    } catch (failure) { if (generation.current === run) setError(actionError(failure)); } finally { setBusy(false); }
  }
  return <Card><SectionTitle title="WALK TOGETHER" /><Badge label={sharing ? 'FOREGROUND SHARING ON' : 'LOCATION SESSION OFF'} tone={sharing ? 'lime' : 'neutral'} />
    <Text style={{ color: colors.muted, lineHeight: 21, marginVertical: 12 }}>Share with this group and opt into nearby alerts while this Safety screen is open. Sharing stops when you leave or lock the phone. Your last position remains visible until you hide it; nearby eligibility expires after 2 minutes.</Text>
    {updated && <Text style={{ color: colors.lime }}>Last server-confirmed update: {updated}</Text>}
    <Notice message={error} />
    <Button label={sharing ? 'Pause location session' : 'Start sharing & enable nearby alerts'} busy={busy} disabled={!ready || busy} onPress={() => sharing ? stop() : void start()} />
    <Button label="Hide position & pause check-ins" variant="quiet" disabled={busy || !ready} onPress={() => { stop(); setBusy(true); void pendingWrite.current.then(() => api(`/groups/${groupId}/location`, undefined, 'DELETE')).then(() => { setUpdated(''); setError(''); }).catch(failure => setError(actionError(failure))).finally(() => setBusy(false)); }} />
    <Button label="Send nearby group alert · 500 m" variant="outline" disabled={busy || !ready} onPress={() => { setBusy(true); setError(''); void (async () => {
      const coords = await locate(); if (!coords || coords.accuracy == null || coords.accuracy > 100) throw new Error('Get a GPS fix accurate to 100 m or better before sending.');
      const result = await api<{ id: string }>(`/groups/${groupId}/alerts`, { kind: 'nearby', confirmed: true, requestId: requestId(), message: 'Please check on me. I am asking nearby group members to respond.', position: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, capturedAt: new Date(coords.timestamp ?? Date.now()).toISOString() } });
      router.push({ pathname: '/alert', params: { groupId, alertId: result.id } });
    })().catch(failure => setError(actionError(failure))).finally(() => setBusy(false)); }} />
    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>Only opted-in group members with recent positions qualify. A queued alert is not proof anyone heard it. Check acknowledgements or contact your crew directly.</Text>
  </Card>;
}
