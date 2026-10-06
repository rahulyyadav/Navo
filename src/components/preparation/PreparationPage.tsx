import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, PanResponder, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text, TextInput } from '@/components/Typography';
import { TabIcon } from '@/components/TabIcon';
import { useReducedMotion } from '@/components/ui';
import { decidePreparation, essentials, preparationShare, trekkingResources, validDepartureDate, type Preparation } from '@/services/preparation';
import type { PreparationState } from '@/services/preparationSync';
import type { Trek } from '@/data/treks';

const lime = '#E4FF89';
type Props = PreparationState & { trek: Trek; onChange: (plan: Preparation) => void; onRetry: () => void; onBack: () => void; onStart: () => void };
type Item = typeof essentials[number];
function SmallIcon({ name, color = 'white', size = 22 }: { name: 'check' | 'close' | 'undo' | 'share' | 'calendar'; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{name === 'check' ? <Path d="m5 12 4 4 10-10" /> : name === 'close' ? <Path d="m6 6 12 12M18 6 6 18" /> : name === 'undo' ? <><Path d="M7 4 3 8l4 4M3 8h10a7 7 0 0 1 0 14" /></> : name === 'share' ? <><Path d="M12 16V3m-4 4 4-4 4 4M5 11v9h14v-9" /></> : <><Path d="M4 7h16v14H4ZM8 3v6M16 3v6M4 12h16" /></>}</Svg>;
}
function PreparationArtwork({ item }: { item: Item }) {
  const compact = useWindowDimensions().width < 360;
  const name = item.id === 'contact' || item.id === 'altitude' ? 'group' : item.id === 'navigation' ? 'map' : item.id === 'weather' ? 'compass' : item.id === 'respect' ? 'route' : 'pin';
  return <View style={[styles.artwork, compact && { height: 80, marginVertical: 6 }]} ><View style={[styles.orbit, compact && { width: 78, height: 78, borderRadius: 39 }]} /><View style={[styles.innerOrbit, compact && { width: 64, height: 64, borderRadius: 32 }]} /><View style={styles.artIcon}><TabIcon name={name} color={lime} size={compact ? 40 : 55} /></View><View style={styles.star}><Text style={styles.starText}>✦</Text></View></View>;
}
function SwipeCard({ item, index, prepared, onDecision }: { item: Item; index: number; prepared: boolean | null; onDecision: (prepared: boolean) => void }) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const compact = width < 360;
  const [x] = useState(() => new Animated.Value(0));
  const locked = useRef(false);
  useEffect(() => () => x.stopAnimation(), [x]);
  const commit = useCallback((ready: boolean) => {
    if (locked.current) return;
    locked.current = true;
    Animated.timing(x, { toValue: ready ? width + 80 : -width - 80, duration: reduced ? 0 : 220, useNativeDriver: true }).start(({ finished }) => { if (finished) onDecision(ready); else locked.current = false; });
  }, [x, width, reduced, onDecision]);
  const reset = useCallback(() => Animated.spring(x, { toValue: 0, useNativeDriver: true, tension: 90, friction: 12 }).start(), [x]);
  const shouldCapture = useCallback((dx: number, dy: number) => !locked.current && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4, []);
  const move = useCallback((dx: number) => { if (!locked.current) x.setValue(dx); }, [x]);
  // PanResponder stores event callbacks; it never reads the gesture lock during render.
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => shouldCapture(g.dx, g.dy),
    onPanResponderMove: (_, g) => move(g.dx),
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > Math.min(width * .22, 95) || (Math.abs(g.vx) > .7 && Math.abs(g.dx) > 22)) commit(g.dx > 0); else reset(); },
    onPanResponderTerminate: reset,
  }), [width, commit, reset, shouldCapture, move]);
  return <>
    <View style={styles.deck}>
      <View pointerEvents="none" style={[styles.backCard, styles.backCardFar]} /><View pointerEvents="none" style={styles.backCard} />
      <Animated.View {...pan.panHandlers} accessibilityLabel={`${item.label}. Swipe right for prepared, left for not prepared yet.`} style={[styles.card, compact && { minHeight: 300, padding: 18 }, { transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-12deg', '0deg', '12deg'] }) }] }]}>
        <View style={styles.cardTop}><Text style={styles.eyebrow}>{item.section.toUpperCase()}</Text><Text style={styles.cardNumber}>{String(index + 1).padStart(2, '0')} / {essentials.length}</Text></View>
        <PreparationArtwork item={item} />
        <View style={styles.cardCopy}><Text style={[styles.cardTitle, compact && { fontSize: 22, lineHeight: 27 }]}>{item.label}</Text><Text style={[styles.cardDetail, compact && { fontSize: 12, lineHeight: 19 }]}>{item.detail}</Text></View>
        <View style={[styles.cardBottom, compact && { marginTop: 14 }]}><Text style={styles.cardStatus}>{prepared === null ? 'ONE SMALL STEP. MORE CONFIDENCE.' : prepared ? '✓ MARKED PREPARED' : '○ NOT PREPARED YET'}</Text><TabIcon name="compass" color="rgba(255,255,255,.55)" size={19} /></View>
        <Animated.View pointerEvents="none" style={[styles.stamp, { opacity: x.interpolate({ inputRange: [0, 50, 100], outputRange: [0, .4, 1], extrapolate: 'clamp' }) }]}><Text style={styles.stampText}>PREPARED</Text></Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLeft, { opacity: x.interpolate({ inputRange: [-100, -50, 0], outputRange: [1, .4, 0], extrapolate: 'clamp' }) }]}><Text style={[styles.stampText, { color: '#FFD0BE' }]}>NOT YET</Text></Animated.View>
      </Animated.View>
    </View>
    <View style={styles.swipeHints}><Text style={styles.hint}>← Not prepared yet</Text><Text style={styles.hint}>Prepared →</Text></View>
    <View style={styles.decisions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mark not prepared yet" onPress={() => commit(false)} style={({ pressed }) => [styles.decision, styles.notYet, pressed && styles.pressed]}><SmallIcon name="close" color="#FFD0BE" size={28} /><Text style={styles.decisionText}>Not yet</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Mark prepared" onPress={() => commit(true)} style={({ pressed }) => [styles.decision, styles.prepared, pressed && styles.pressed]}><SmallIcon name="check" color="#243322" size={29} /><Text style={[styles.decisionText, { color: '#243322' }]}>Prepared</Text></Pressable>
    </View>
  </>;
}
export function PreparationPage(props: Props) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 360;
  const scrollRef = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  const focusDeck = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: !reduced }), [reduced]);
  return <View style={styles.page}><LinearGradient colors={['#8AA9C4', '#536D86', '#3C5872']} locations={[0, .4, 1]} style={StyleSheet.absoluteFill} />
    <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
      <View style={[styles.header, compact && { marginBottom: 16 }]}><Pressable accessibilityRole="button" accessibilityLabel="Back to trek" onPress={props.onBack} style={styles.back}><Text style={styles.backArrow}>←</Text></Pressable><Text style={styles.headerTitle}>TREK PREPARATION</Text><TabIcon name="route" color="white" size={23} /></View>
      <View style={styles.trekHeading}><Text style={styles.overline}>{props.trek.region.toUpperCase()} / YOUR NEXT JOURNEY</Text><Text style={[styles.trekName, compact && { fontSize: 26, lineHeight: 30 }]}>{props.trek.name}</Text><Text style={styles.metadata}>{props.trek.days} · {props.trek.maxElevation.toLocaleString()} m · {props.trek.difficulty}</Text></View>
      {props.loaded ? <PreparationContent {...props} onFocusDeck={focusDeck} /> : <View style={styles.loading}><ActivityIndicator color={lime} /><Text style={styles.detail}>Loading your preparation…</Text>{props.error ? <><Text style={styles.error}>{props.error}</Text><Pressable accessibilityRole="button" onPress={props.onRetry}><Text style={styles.link}>Retry</Text></Pressable></> : null}</View>}
    </ScrollView>
  </View>;
}
function PreparationContent({ trek, plan, status, error, onChange, onRetry, onStart, onFocusDeck }: Props & { onFocusDeck: () => void }) {
  const compact = useWindowDimensions().width < 360;
  const first = essentials.findIndex(item => !plan.reviewed.includes(item.id));
  const [cursor, setCursor] = useState(first < 0 ? essentials.length : first);
  const [history, setHistory] = useState<{ index: number; previous: boolean | null }[]>([]);
  const [details, setDetails] = useState(false);
  const [date, setDate] = useState(plan.date);
  const [notes, setNotes] = useState(plan.notes);
  const [message, setMessage] = useState('');
  const [review, setReview] = useState(false);
  const item = essentials[cursor];
  const decision = useCallback((prepared: boolean) => {
    const previous = plan.checked.includes(item.id) ? true : plan.reviewed.includes(item.id) ? false : null;
    setHistory(current => [...current, { index: cursor, previous }]);
    onChange(decidePreparation(plan, item.id, prepared));
    setCursor(cursor + 1);
  }, [plan, item, cursor, onChange]);
  function undo() {
    const previous = history[history.length - 1]; if (!previous) return;
    onChange(decidePreparation(plan, essentials[previous.index].id, previous.previous));
    setCursor(previous.index); setHistory(history.slice(0, -1)); onFocusDeck();
  }
  async function share() {
    try { await Share.share({ message: preparationShare(trek.name, plan) }); }
    catch { setMessage('Sharing is unavailable on this device.'); }
  }
  function saveDetails() {
    if (!validDepartureDate(date)) { setMessage('Use a real departure date in YYYY-MM-DD format.'); return; }
    onChange({ ...plan, date, notes }); setMessage(''); setDetails(false);
  }
  return <>
    <View style={[styles.progressHeader, compact && { marginTop: 16 }]}><Text style={styles.progressTitle}>{plan.checked.length}<Text style={styles.progressMuted}> / {essentials.length} prepared</Text></Text><View style={styles.sync}><View style={[styles.syncDot, status !== 'saved' && { backgroundColor: '#FFD0BE' }]} /><Text accessibilityLiveRegion="polite" style={styles.syncText}>{status === 'saved' ? 'Saved to account' : status === 'saving' ? 'Saving…' : 'Sync pending'}</Text></View></View>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${plan.checked.length / essentials.length * 100}%` }]} /></View>
    <View style={[styles.intro, compact && { marginTop: 14, marginBottom: 14 }]}><Text style={styles.introTitle}>{item ? 'Pack a little peace of mind.' : 'Your preparation, at a glance.'}</Text><Text style={styles.detail}>{item ? 'One card at a time. Swipe to make it yours.' : `${plan.reviewed.length} reviewed · ${plan.reviewed.length - plan.checked.length} not prepared yet · ${essentials.length - plan.reviewed.length} to review`}</Text></View>
    {item ? <SwipeCard key={`${cursor}:${history.length}`} item={item} index={cursor} prepared={plan.checked.includes(item.id) ? true : plan.reviewed.includes(item.id) ? false : null} onDecision={decision} /> : <View style={styles.complete}><View style={styles.completeIcon}><SmallIcon name="check" color={lime} size={40} /></View><Text style={styles.completeTitle}>{plan.checked.length === essentials.length ? 'Everything marked prepared.' : 'A good start. Keep preparing.'}</Text><Text style={styles.detail}>{plan.checked.length === essentials.length ? 'Your checklist is ready to review with your team.' : 'Revisit any card below when you’re ready.'}</Text><Pressable accessibilityRole="button" onPress={() => { setCursor(0); onFocusDeck(); }} style={styles.reviewButton}><Text style={styles.link}>Review all cards ↗</Text></Pressable></View>}
    <View style={styles.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo last preparation choice" accessibilityState={{ disabled: !history.length }} disabled={!history.length} onPress={undo} style={[styles.tool, !history.length && { opacity: .35 }]}><SmallIcon name="undo" size={19} /><Text style={styles.toolText}>Undo</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: review }} onPress={() => setReview(!review)} style={styles.tool}><SmallIcon name="check" size={19} /><Text style={styles.toolText}>All items</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Share preparation with friends or group" onPress={() => void share()} style={styles.tool}><SmallIcon name="share" size={19} /><Text style={styles.toolText}>Share</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={styles.tool}><SmallIcon name="calendar" size={19} /><Text style={styles.toolText}>Details</Text></Pressable>
    </View>
    {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry saving preparation" onPress={onRetry}><Text style={styles.link}>Retry ↗</Text></Pressable></View> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null}
    {details && <View style={styles.panel}><Text style={styles.panelTitle}>The little details</Text><Text style={styles.inputLabel}>Departure date · optional</Text><TextInput accessibilityLabel="Departure date" placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,.45)" value={date} onChangeText={setDate} maxLength={10} style={styles.input} /><Text style={styles.inputLabel}>Check-ins & notes</Text><TextInput accessibilityLabel="Preparation notes" multiline placeholder="Guide contact, overnight stops, check-in times…" placeholderTextColor="rgba(255,255,255,.45)" value={notes} onChangeText={setNotes} maxLength={2000} style={[styles.input, { minHeight: 110 }]} /><Pressable accessibilityRole="button" onPress={saveDetails} style={styles.saveDetails}><Text style={styles.saveText}>Save details</Text></Pressable></View>}
    {(review || !item) && <View style={styles.panel}><Text style={styles.panelTitle}>Your essentials</Text>{essentials.map((entry, index) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Review ${entry.label}: ${plan.checked.includes(entry.id) ? 'prepared' : plan.reviewed.includes(entry.id) ? 'not prepared yet' : 'not reviewed'}`} onPress={() => { setCursor(index); onFocusDeck(); }} style={styles.itemRow}><View style={styles.itemSymbol}>{plan.checked.includes(entry.id) ? <SmallIcon name="check" color={lime} size={19} /> : <CircleIndicator reviewed={plan.reviewed.includes(entry.id)} />}</View><Text style={styles.itemLabel}>{entry.label}</Text><Text style={styles.itemArrow}>↗</Text></Pressable>)}</View>}
    <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => [styles.start, pressed && styles.pressed]}><TabIcon name="route" color="#243322" size={22} /><Text style={styles.startText}>Start trek</Text><Text style={styles.startArrow}>↗</Text></Pressable>
    <View style={styles.resources}><Text style={styles.resourceTitle}>BEFORE YOU LEAVE</Text><View style={styles.resourceLinks}>{trekkingResources.map((resource, i) => <Pressable accessibilityRole="link" key={resource.url} onPress={() => void Linking.openURL(resource.url).catch(() => setMessage('Could not open the source. Check your connection.'))}><Text style={styles.resourceLink}>{['Permits', 'Weather', 'Altitude'][i]} ↗</Text></Pressable>)}</View></View>
    <Text style={styles.footnote}>Prepared means you’ve checked the item. Review your itinerary and current conditions with your guide.</Text>
  </>;
}
function CircleIndicator({ reviewed }: { reviewed: boolean }) { return <Svg width={18} height={18} viewBox="0 0 18 18"><Circle cx={9} cy={9} r={6} fill="none" stroke={reviewed ? '#FFD0BE' : 'rgba(255,255,255,.4)'} strokeWidth={1.5} />{reviewed && <Path d="M6 9h6" stroke="#FFD0BE" />}</Svg>; }
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#536D86' }, scroll: { paddingHorizontal: 22, width: '100%', maxWidth: 540, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(224,236,244,.16)', justifyContent: 'center', alignItems: 'center' }, backArrow: { color: 'white', fontSize: 27, lineHeight: 31 }, headerTitle: { color: 'white', fontSize: 10, letterSpacing: 2.2, fontWeight: '700' },
  trekHeading: { gap: 7 }, overline: { color: lime, fontSize: 9, letterSpacing: 1.8, fontWeight: '700' }, trekName: { color: 'white', fontSize: 29, lineHeight: 34, fontWeight: '700' }, metadata: { color: 'rgba(255,255,255,.7)', fontSize: 12 },
  progressHeader: { marginTop: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, progressTitle: { color: lime, fontSize: 22, fontWeight: '700' }, progressMuted: { color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: '400' }, sync: { flexDirection: 'row', alignItems: 'center', gap: 5 }, syncDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: lime }, syncText: { fontSize: 9, color: 'rgba(255,255,255,.7)' }, progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,.17)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }, progressFill: { height: '100%', backgroundColor: lime },
  intro: { marginTop: 22, marginBottom: 20, gap: 4 }, introTitle: { color: 'white', fontSize: 18, fontWeight: '500' }, detail: { color: 'rgba(255,255,255,.65)', fontSize: 12, lineHeight: 19 },
  deck: { marginHorizontal: 3, paddingBottom: 20 }, backCard: { position: 'absolute', top: 14, bottom: 9, left: 12, right: 12, borderRadius: 31, backgroundColor: '#64849E', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', transform: [{ rotate: '3deg' }] }, backCardFar: { top: 28, bottom: 0, left: 24, right: 24, backgroundColor: '#56728C', transform: [{ rotate: '-3deg' }] },
  card: { minHeight: 365, backgroundColor: '#3F5B74', borderWidth: 1, borderColor: 'rgba(216,234,247,.26)', borderRadius: 30, padding: 23, shadowColor: '#172D40', shadowOffset: { width: 0, height: 12 }, shadowOpacity: .18, shadowRadius: 20, elevation: 5 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, eyebrow: { color: 'rgba(255,255,255,.75)', fontSize: 9, letterSpacing: 1.2, fontWeight: '700', flex: 1 }, cardNumber: { color: 'rgba(255,255,255,.5)', fontSize: 10 },
  artwork: { height: 132, alignItems: 'center', justifyContent: 'center', marginVertical: 8 }, orbit: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(228,255,137,.15)', position: 'absolute' }, innerOrbit: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(228,255,137,.06)', position: 'absolute' }, artIcon: { transform: [{ rotate: '-10deg' }] }, star: { position: 'absolute', top: 8, right: '26%' }, starText: { color: lime, fontSize: 25 },
  cardCopy: { gap: 12 }, cardTitle: { color: 'white', fontSize: 26, lineHeight: 31, fontWeight: '700' }, cardDetail: { color: 'rgba(255,255,255,.73)', fontSize: 13, lineHeight: 21 }, cardBottom: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardStatus: { color: 'rgba(255,255,255,.5)', fontSize: 8, letterSpacing: 1.1, flex: 1 },
  stamp: { position: 'absolute', top: 55, left: 22, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: lime, borderRadius: 8, transform: [{ rotate: '-12deg' }], backgroundColor: '#3F5B74' }, stampLeft: { borderColor: '#FFD0BE', left: undefined, right: 22, transform: [{ rotate: '12deg' }] }, stampText: { color: lime, fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  swipeHints: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8, marginBottom: 15 }, hint: { color: 'rgba(255,255,255,.65)', fontSize: 11 }, decisions: { flexDirection: 'row', justifyContent: 'center', gap: 15 }, decision: { flex: 1, height: 59, borderRadius: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, notYet: { backgroundColor: 'rgba(213,227,238,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }, prepared: { backgroundColor: lime }, decisionText: { color: 'white', fontSize: 13, fontWeight: '700' }, pressed: { opacity: .75 },
  tools: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 25 }, tool: { minWidth: 50, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 7 }, toolText: { color: 'rgba(255,255,255,.7)', fontSize: 10 },
  complete: { alignItems: 'center', padding: 26, gap: 12, borderRadius: 30, backgroundColor: 'rgba(213,227,238,.12)' }, completeIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(228,255,137,.12)', alignItems: 'center', justifyContent: 'center' }, completeTitle: { color: 'white', fontSize: 23, fontWeight: '700', textAlign: 'center' }, reviewButton: { padding: 10 },
  panel: { padding: 19, borderRadius: 24, backgroundColor: 'rgba(215,230,241,.1)', marginBottom: 20 }, panelTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 }, inputLabel: { color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 8 }, input: { color: 'white', backgroundColor: 'rgba(25,41,58,.25)', borderRadius: 16, padding: 14, fontSize: 13, marginBottom: 18 }, saveDetails: { backgroundColor: lime, borderRadius: 24, padding: 14, alignItems: 'center' }, saveText: { color: '#243322', fontSize: 13, fontWeight: '700' }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.1)' }, itemSymbol: { width: 20 }, itemLabel: { color: 'white', fontSize: 12, lineHeight: 18, flex: 1 }, itemArrow: { color: 'rgba(255,255,255,.5)', fontSize: 18 },
  start: { backgroundColor: lime, borderRadius: 30, minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 10 }, startText: { color: '#243322', fontSize: 14, fontWeight: '700', flex: 1 }, startArrow: { color: '#243322', fontSize: 25 }, resources: { marginTop: 27, gap: 14 }, resourceTitle: { color: 'rgba(255,255,255,.48)', fontSize: 9, letterSpacing: 1.5 }, resourceLinks: { flexDirection: 'row', justifyContent: 'space-between' }, resourceLink: { color: 'rgba(255,255,255,.8)', fontSize: 12, paddingVertical: 10 }, footnote: { color: 'rgba(255,255,255,.42)', fontSize: 10, lineHeight: 16, marginTop: 15 },
  errorBox: { borderRadius: 18, backgroundColor: 'rgba(25,41,58,.35)', padding: 15, gap: 10, marginBottom: 18 }, error: { color: '#FFE0D4', fontSize: 12, lineHeight: 18 }, link: { color: lime, fontSize: 13, fontWeight: '700' }, loading: { paddingVertical: 80, alignItems: 'center', gap: 15 },
});
