import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Backdrop, Badge, Button, Card, Field, Heading, Notice, SectionTitle } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { useTripLibrary } from '@/hooks/useTripLibrary';
import { emptyTrack, recordFix, activeTime } from '@/services/hike-recording';
import { requestId } from '@/lib/api';
import { colors } from '@/theme/tokens';

export default function RecordHikeScreen() {
  const { userId } = useNavo();
  return <RecordHikeSession key={userId} />;
}

function RecordHikeSession() {
  const params = useLocalSearchParams<{ name?: string }>();
  const library = useTripLibrary();
  const [name, setName] = useState(typeof params.name === 'string' ? params.name.slice(0, 60) : 'My hike');
  const [running, setRunning] = useState(false); const [busy, setBusy] = useState(false);
  const [distance, setDistance] = useState(0); const [seconds, setSeconds] = useState(0); const [samples, setSamples] = useState(0);
  const [message, setMessage] = useState(''); const [lastSaved, setLastSaved] = useState('');
  const track = useRef(emptyTrack()); const elapsed = useRef(0); const started = useRef<number | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null); const generation = useRef(0);
  const id = useRef(requestId()); const mounted = useRef(true); const pending = useRef(false);
  const currentName = useRef(name);
  useEffect(() => { currentName.current = name; }, [name]);
  const updater = useRef(library.update);
  useEffect(() => { updater.current = library.update; }, [library.update]);
  const totalSeconds = useCallback(() => Math.floor((elapsed.current + (started.current === null ? 0 : Math.max(0, Date.now() - started.current))) / 1000), []);
  const save = useCallback(async () => {
    const duration = totalSeconds();
    if (!duration && !track.current.samples) return;
    const item = { id: id.current, name: currentName.current.trim() || 'My hike', finishedAt: new Date().toISOString(), distanceM: track.current.distanceM, activeSeconds: duration, samples: track.current.samples };
    await updater.current(data => {
      if (data.activities.length >= 200 && !data.activities.some(a => a.id === item.id)) throw new Error('Activity library full');
      return { ...data, activities: [item, ...data.activities.filter(a => a.id !== item.id)] };
    });
    if (mounted.current) setLastSaved(new Date().toLocaleTimeString());
  }, [totalSeconds]);
  const pause = useCallback(() => {
    generation.current++; watcher.current?.remove(); watcher.current = null;
    if (started.current !== null) { elapsed.current += Math.max(0, Date.now() - started.current); started.current = null; }
    track.current.last = null;
    if (mounted.current) { setRunning(false); setSeconds(totalSeconds()); }
    void save().catch(() => { if (mounted.current) setMessage('Could not save the summary. Keep this screen open and retry when storage is available.'); });
  }, [save, totalSeconds]);
  useFocusEffect(useCallback(() => () => pause(), [pause]));
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    const timer = setInterval(() => {
      if (started.current !== null) {
        const duration = totalSeconds(); setSeconds(duration);
        if (duration >= 57600) { pause(); setMessage('Recording paused after 16 active hours.'); }
      }
    }, 1000);
    const checkpoint = setInterval(() => { if (started.current !== null) void save().catch(() => { pause(); if (mounted.current) setMessage('Recording paused because the summary could not be saved. Retry saving before continuing.'); }); }, 30000);
    return () => {
      mounted.current = false; listener.remove(); clearInterval(timer); clearInterval(checkpoint);
      // Invalidate pending permission/watch setup even after the screen unmounts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++; watcher.current?.remove();
    };
  }, [pause, save, totalSeconds]);
  async function start() {
    if (pending.current || started.current !== null) return;
    pending.current = true; setBusy(true); setMessage(''); const run = ++generation.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (generation.current !== run) return;
      if (!permission.granted) throw new Error('Location permission is needed to record distance. Your saved plans still work without it.');
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 }, position => {
        if (generation.current !== run) return;
        if (position.coords.accuracy == null) return;
        const next = recordFix(track.current, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp });
        track.current = next; setDistance(next.distanceM); setSamples(next.samples);
      }, () => { if (generation.current === run) { pause(); setMessage('GPS stopped responding. Recording paused; try again outside with a clear view of the sky.'); } });
      if (generation.current !== run) subscription.remove();
      else { watcher.current = subscription; started.current = Date.now(); setRunning(true); }
    } catch (error) { if (mounted.current && generation.current === run) setMessage(error instanceof Error ? error.message : 'Could not start recording. Try again.'); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Badge label={running ? 'RECORDING · SCREEN OPEN' : 'READY WHEN YOU ARE'} tone="lime" /><Heading title="Every step, your story." subtitle="Record a walk, then keep the distance and active time in your trip library." />
    <Field label="Name this walk" value={name} onChangeText={setName} maxLength={60} editable={!running} />
    <Card style={styles.summary}><SectionTitle title="HIKE SUMMARY" /><Text style={styles.distance}>{(distance / 1000).toFixed(2)}</Text><Text style={styles.unit}>kilometres · GPS estimate</Text><View style={styles.stats}><View><Text style={styles.value}>{activeTime(seconds)}</Text><Text style={styles.copy}>Active time</Text></View><View><Text style={styles.value}>{samples}</Text><Text style={styles.copy}>Accepted fixes</Text></View></View></Card>
    <Notice message={message || library.error} />
    <Text style={styles.copy}>Recording pauses when you leave this screen or lock the phone. Only your summary is saved on this device; no location history is uploaded or stored. Poor GPS, pauses and signal gaps can reduce measured distance.</Text>
    {running && samples < 2 && <Text style={styles.copy}>Waiting for accurate movement samples. Start walking outside; distance will update after enough reliable movement.</Text>}
    <Button label={running ? 'Pause & save summary' : seconds ? 'Resume recording' : 'Start recording'} busy={busy} disabled={busy || !library.loaded} onPress={() => running ? pause() : void start()} />
    {!running && <Button label="Save summary" variant="outline" disabled={busy || (!seconds && !samples)} onPress={() => { if (pending.current) return; pending.current = true; setBusy(true); void save().then(() => setMessage('Summary saved to Your trips → Activity.')).catch(() => setMessage('Could not save. Please retry before leaving.')).finally(() => { pending.current = false; setBusy(false); }); }} />}
    {Boolean(lastSaved) && <Text style={styles.copy}>Summary last saved at {lastSaved}. Active recordings checkpoint every 30 seconds.</Text>}
    <Button label="Your recorded walks" variant="quiet" disabled={running || busy} onPress={() => router.push({ pathname: '/trips', params: { section: 'activity' } })} />
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 18, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, summary: { backgroundColor: colors.navySoft, borderRadius: 34, paddingVertical: 28 }, distance: { color: colors.lime, fontSize: 64, fontWeight: '700', textAlign: 'center' }, unit: { color: colors.muted, textAlign: 'center', fontSize: 16 }, stats: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20, marginTop: 28 }, value: { color: colors.ink, fontSize: 25, fontWeight: '600' }, copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 6 } });
