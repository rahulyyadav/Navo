import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Typography';
import { TabIcon } from '@/components/TabIcon';
import { NepalMap } from '@/components/NepalMap';
import { buildRoute, distance, formatDistance, nextCheckpoints, sampleRoute } from '@/services/trekking/navigation';
import type { Trek } from '@/data/treks';
import { regionForTrek } from '@/data/treks';
import { useBarometricTrend } from '@/hooks/useBarometricTrend';
import { useTrekSession } from '@/hooks/useTrekSession';
import { CinematicScene } from './CinematicScene';

export function TrekJourney({ trek, userId, onExit, initialDemo = false }: { trek: Trek; userId?: string; onExit: () => void; initialDemo?: boolean }) {
  const insets = useSafeAreaInsets();
  const route = useMemo(() => buildRoute(trek.route), [trek]);
  const session = useTrekSession(route, userId ? `trek-session:${userId}:${trek.id}` : undefined, initialDemo);
  const [view, setView] = useState<'scene' | 'map'>('scene');
  const [cameraNonce, setCameraNonce] = useState(0);
  const [follow, setFollow] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const demo = session.mode === 'demo';
  const running = session.phase === 'active';
  const usable = running && !session.location.stale && session.location.state === 'tracking';
  const barometer = useBarometricTrend(!demo && usable, session.location.fix?.speed ?? null);
  const sceneProgress = demo ? session.progress : session.match?.progress ?? 0;
  const point = sampleRoute(route, sceneProgress);
  const checkpoints = demo ? nextCheckpoints(route, sceneProgress) : session.location.fix ? trek.route.map(p => ({ ...p, distance: distance(session.location.fix!, p), gain: 0 })).sort((a, b) => a.distance - b.distance).slice(0, 3) : [];
  const next = checkpoints[0];
  const coords = demo ? null : session.location.fix;
  const baseRegion = regionForTrek(trek);
  const region = follow && coords ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : baseRegion;
  const ready = session.phase === 'ready';
  const ended = session.phase === 'ended';
  const status = ready ? 'PREPARE TO EXPLORE' : ended ? 'JOURNEY COMPLETE' : demo ? 'DEMO · SIMULATED JOURNEY' : session.phase === 'paused' ? 'GPS PAUSED' : session.location.state === 'denied' ? 'LOCATION PERMISSION OFF' : session.location.state === 'acquiring' ? 'FINDING YOUR POSITION' : !usable ? 'WAITING FOR A CLEAR GPS FIX' : session.match?.confident ? 'LIVE GPS · ROUTE OVERVIEW' : 'LIVE GPS · AWAY FROM OVERVIEW';
  const slope = demo ? point.slope : session.slope || barometer.slope;
  const trend = slope > 0.02 ? 'Climbing' : slope < -0.02 ? 'Descending' : 'Moving gently';
  const elapsed = `${Math.floor(session.elapsed / 3600).toString().padStart(2, '0')}:${Math.floor(session.elapsed / 60 % 60).toString().padStart(2, '0')}:${Math.floor(session.elapsed % 60).toString().padStart(2, '0')}`;
  return <View style={styles.root}>
    {view === 'scene' ? <CinematicScene image={trek.image} route={route} progress={sceneProgress} heading={demo ? point.heading : session.location.fix?.heading ?? point.heading} slope={slope} moving={running && (demo || usable && (session.location.fix?.speed ?? 0) > 0.5)} located={demo || usable && Boolean(session.match?.confident)} /> : <View style={[styles.map, { top: insets.top + 122, bottom: insets.bottom + 210 }]}><NepalMap myCoords={coords} selectedId={trek.id} region={region} regionNonce={cameraNonce} onSelectTrek={() => undefined} followUser={follow} /></View>}
    <LinearGradient pointerEvents="none" colors={['rgba(10,27,37,0.6)', 'transparent']} style={styles.topShade} />
    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(10,27,37,0.96)']} style={styles.bottomShade} />
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topRow}><Control label={ready || ended ? 'Back' : 'Pause and leave'} icon="back" onPress={() => { if (running) session.togglePause(); onExit(); }} /><Text style={styles.brand}>NAVO / JOURNEY</Text><Control label={view === 'scene' ? 'Switch to map' : 'Switch to cinematic view'} icon={view === 'scene' ? 'map' : 'scene'} onPress={() => setView(value => value === 'scene' ? 'map' : 'scene')} /></View>
      <Text style={styles.trekName}>{trek.name}</Text><Text style={styles.kicker}>{status}</Text>
    </View>
    {!ready && !ended && view === 'scene' && <View pointerEvents="none" style={[styles.landmarks, { top: insets.top + 168 }]}>{checkpoints.slice(0, 2).map((checkpoint, index) => <View key={checkpoint.name} style={[styles.landmark, index === 1 && styles.distant]}><View style={styles.checkpointDot} /><Text style={styles.landmarkName}>{checkpoint.name}</Text><Text style={styles.landmarkDistance}>{formatDistance(checkpoint.distance)}{demo ? ` · ${checkpoint.gain >= 0 ? '+' : ''}${Math.round(checkpoint.gain)} m` : ' · direct'}</Text></View>)}</View>}
    {view === 'map' && !demo && coords && <Pressable accessibilityRole="button" style={[styles.recentre, { bottom: insets.bottom + 228 }]} onPress={() => { setFollow(value => !value); setCameraNonce(value => value + 1); }}><TabIcon name="compass" color="#E4FF89" /><Text style={styles.small}>{follow ? 'Route overview' : 'Follow my GPS'}</Text></Pressable>}
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      {ready || !session.loaded ? <View style={styles.setup}>
        <Text style={styles.heading}>Your journey, unfolding.</Text><Text style={styles.description}>A calm view of the mountains, your movement and the places along the way.</Text>
        <Text style={styles.disclosure}>These route points are approximate. Preview the journey, or record your live GPS position. Trail guidance needs a verified track.</Text>
        <Action label={session.loaded ? 'Preview this journey' : 'Restoring session…'} disabled={!session.loaded} onPress={() => session.start('demo')} />
        <Action label="Start live GPS" outline disabled={!session.loaded} onPress={() => session.start('live')} />
      </View> : ended ? <View style={styles.setup}><Text style={styles.kicker}>{demo ? 'PREVIEW COMPLETE' : 'SESSION ENDED'}</Text><Text style={styles.heading}>A moment to take it in.</Text><Text style={styles.description}>{elapsed} · {demo ? 'Simulated route overview' : `${formatDistance(session.travelled)} recorded movement`}</Text><Action label="Start a new journey" onPress={() => session.start(session.mode)} /><Action label="Back to trek" outline onPress={onExit} /></View> : <>
        <View style={styles.infoRow}><View style={styles.infoCopy}><Text style={styles.kicker}>{session.phase === 'paused' ? 'TAKE YOUR TIME' : demo ? trend.toUpperCase() : usable ? `${trend.toUpperCase()}${barometer.available && !session.slope ? ' · PRESSURE TREND' : ''}` : 'SIGNAL STATUS'}</Text><Text style={styles.nextName}>{session.phase === 'paused' ? 'Journey paused' : next ? next.name : 'Waiting for GPS'}</Text><Text style={styles.small}>{demo ? next ? `${formatDistance(next.distance)} ahead · approximate geometry` : 'At the final overview point' : coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} · ±${Math.round(coords.accuracy ?? 0)} m` : 'Find a clear view of the sky'}</Text></View><View style={styles.elapsed}><Text style={styles.time}>{elapsed}</Text><Text style={styles.small}>{demo ? 'Preview time' : 'Session time'}</Text></View></View>
        {demo && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${sceneProgress / route.total * 100}%` }]} /></View>}
        {!demo && (!usable || session.location.state === 'denied') && <Pressable accessibilityRole="button" onPress={() => session.location.state === 'denied' ? void Linking.openSettings() : session.location.retry()}><Text style={styles.signal}>{session.location.state === 'denied' ? 'Enable location in Settings →' : session.phase === 'paused' ? 'Foreground session · resume to reacquire GPS' : `GPS updates unavailable${session.location.age !== null ? ` · last fix ${session.location.age}s ago` : ''} · Retry →`}</Text></Pressable>}
        <Text style={styles.disclaimer}>{demo ? 'Simulated movement · schematic terrain · not trail navigation' : 'Approximate route overview · GPS distance to places is direct'}</Text>
        {session.storageError && <Text style={styles.signal}>Session could not be saved on this device.</Text>}
        {confirmEnd ? <View style={styles.controls}><Action label="End journey" onPress={() => { session.end(); setConfirmEnd(false); }} /><Action label="Keep going" outline onPress={() => setConfirmEnd(false)} /></View> : <View style={styles.controls}><Action label={session.phase === 'paused' ? 'Resume journey' : 'Pause journey'} onPress={session.togglePause} /><Pressable accessibilityRole="button" accessibilityLabel={demo ? 'Change preview speed' : 'Re-centre GPS map'} style={styles.utility} onPress={demo ? session.cycleSpeed : () => { setFollow(true); setView('map'); setCameraNonce(n => n + 1); }}><Text style={styles.utilityText}>{demo ? `${session.speed}×` : '◎'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="End journey" style={styles.utility} onPress={() => setConfirmEnd(true)}><Text style={styles.utilityText}>■</Text></Pressable></View>}
      </>}
    </View>
  </View>;
}
function Action({ label, onPress, outline = false, disabled = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, outline && styles.actionOutline, (pressed || disabled) && { opacity: 0.6 }]}><Text style={[styles.actionText, outline && { color: 'white' }]}>{label}</Text></Pressable>; }
function Control({ label, icon, onPress }: { label: string; icon: 'map' | 'scene' | 'back'; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.control, pressed && { opacity: 0.6 }]}>{icon === 'map' ? <TabIcon name="map" color="white" size={21} /> : <Text style={styles.controlSymbol}>{icon === 'back' ? '←' : '△'}</Text>}</Pressable>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#192F3E' }, map: { position: 'absolute', left: 0, right: 0, borderRadius: 20, overflow: 'hidden' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 }, bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 330 },
  header: { paddingHorizontal: 22 }, topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: 'white', fontSize: 10, letterSpacing: 2.7, fontWeight: '700' },
  control: { height: 46, width: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)' }, controlSymbol: { color: 'white', fontSize: 26 },
  trekName: { color: 'white', fontSize: 22, fontWeight: '500', marginTop: 18 }, kicker: { color: '#E4FF89', fontSize: 9, fontWeight: '700', letterSpacing: 1.7, marginTop: 7 },
  landmarks: { paddingHorizontal: 26, gap: 48 }, landmark: { alignSelf: 'flex-end', paddingLeft: 14, borderLeftColor: 'rgba(228,255,137,0.4)', borderLeftWidth: 1 }, distant: { alignSelf: 'flex-start', opacity: 0.5, marginTop: 10 }, checkpointDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E4FF89', position: 'absolute', left: -3, top: 3 }, landmarkName: { color: 'white', fontSize: 16 }, landmarkDistance: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 5 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 16 }, setup: { gap: 12, padding: 18, backgroundColor: 'rgba(20,43,56,0.88)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' }, heading: { color: 'white', fontSize: 27, fontWeight: '500', lineHeight: 33 }, description: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 21 }, disclosure: { color: 'rgba(255,255,255,0.63)', fontSize: 12, lineHeight: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, infoCopy: { flex: 1 }, nextName: { color: 'white', fontSize: 22, fontWeight: '500', marginVertical: 6 }, small: { color: 'rgba(255,255,255,0.66)', fontSize: 10.5, lineHeight: 16 }, elapsed: { alignItems: 'flex-end' }, time: { color: 'white', fontSize: 13, fontVariant: ['tabular-nums'] }, progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }, progressFill: { height: 2, backgroundColor: '#E4FF89' }, disclaimer: { color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 15, marginVertical: 10 }, signal: { color: '#FFCE97', fontSize: 11, lineHeight: 17, marginTop: 8 },
  controls: { flexDirection: 'row', gap: 9 }, action: { flexGrow: 1, height: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4FF89', paddingHorizontal: 15 }, actionOutline: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }, actionText: { color: '#19293A', fontSize: 14, fontWeight: '500' }, utility: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }, utilityText: { color: 'white', fontSize: 19 }, recentre: { position: 'absolute', right: 15, backgroundColor: '#19293A', borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
