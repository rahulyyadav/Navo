import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, useIsFocused, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { Text } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { JourneyShell } from '@/components/journeys/JourneyShell';
import { useJourneyStyles } from '@/components/journeys/journey-styles';
import { JourneyButton } from '@/components/journeys/JourneyMotion';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { JourneyBoard } from '@/components/journeys/JourneyBoard';
import { useJourneys } from '@/hooks/useJourneys';
import { useTheme } from '@/context/ThemeContext';
import { useNavo } from '@/context/NavoContext';
import { useTrekLocation } from '@/hooks/useTrekLocation';
import { editJourney, saveJourneyDraft } from '@/lib/journey-store';
import { requestJourneyReview, decideJourneyRevision } from '@/services/journeys/api';
import { durationLabel, modeIcon, pointDistanceM, selectedOption, journeyReview, type PersonalJourney, type JourneySource, type Itinerary } from '@/services/journeys/types';
import { buildRoute, matchRoute } from '@/services/trekking/navigation';
import { distanceToRoute } from '@/services/route-distance';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
const footerEnter = FadeInUp.duration(380).delay(320).reduceMotion(ReduceMotion.System);
const relayout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);
export default function JourneyLevelsScreen() {
    const { id } = useLocalSearchParams<{
        id?: string;
    }>();
    const library = useJourneys();
    const { userId } = useNavo();
    const s = useJourneyStyles();
    const { palette } = useTheme();
    const journey = library.data.journeys.find(j => j.id === id);
    if (!library.loaded)
        return <JourneyShell><View style={{ alignItems: 'center', gap: 14, paddingTop: 60 }}><ActivityIndicator color={palette.green}/><Text style={s.subtitle}>Opening your journey…</Text></View></JourneyShell>;
    if (!journey)
        return <JourneyShell><Animated.View entering={entrance()} style={{ gap: 10 }}><Text style={s.eyebrow}>JOURNEY LIBRARY</Text><Text style={s.title}>Journey unavailable.</Text><Text style={s.error}>{library.error || 'Choose a saved journey or plan a new one.'}</Text><JourneyButton label="← Your journeys" variant="outline" onPress={() => router.replace('/(tabs)/journeys')}/></Animated.View></JourneyShell>;
    return <JourneyDetails key={`${userId}:${journey.id}`} journey={journey} uid={userId}/>;
}
function JourneyDetails({ journey: j, uid }: {
    journey: PersonalJourney;
    uid: string;
}) {
    const { palette, scheme } = useTheme();
    const s = useJourneyStyles();
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState<number | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const lock = useRef(false), alive = useRef(true), chatOpen = useRef(false);
    const focused = useIsFocused();
    const reduced = useReducedMotion();
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { if (focused) void requestJourneyReview(j.id).catch(() => undefined); }, [focused, j.id]);
    useFocusEffect(useCallback(() => { chatOpen.current = false; return undefined; }, []));
    function askNavo() {
        if (chatOpen.current) { router.back(); return; }
        chatOpen.current = true;
        router.push({ pathname: '/(tabs)/ai', params: { journeyId: j.id } });
    }
    const legs = useMemo(() => [...j.approach, ...j.template.legs], [j.approach, j.template.legs]);
    const missingDeparture = !j.approach.length && (j.phase === 'draft' || j.phase === 'ready') && j.completed === 0 &&
        (j.template.legs[0].start.coordinatesApproximate || pointDistanceM(j.preferences.origin, j.template.legs[0].start) >= 500);
    async function prepareFromOrigin() {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError('');
        try {
            await saveJourneyDraft(uid, j.template.destination.id, j.preferences);
            if (alive.current) router.push({ pathname: '/journey-setup', params: { destination: JSON.stringify(j.template.destination) } });
        } catch {
            if (alive.current) setError('Could not restore your starting point. Please retry.');
        } finally {
            lock.current = false;
            if (alive.current) setBusy(false);
        }
    }
    const review = journeyReview(j);
    const proposal = j.proposedRevision as ({ sources?: JourneySource[]; template?: Itinerary; status?: string; summary?: string } | null | undefined);
    const proposalTemplate = proposal?.template;
    const current = legs[j.completed];
    const activeOption = current ? selectedOption(current, j.selections) : null;
    const gps = useTrekLocation(j.phase === 'travelling' && focused);
    const liveModel = useMemo(() => {
        if (!current || current.geometry.length < 2 || current.geometryKind === 'schematic' || activeOption?.mode === 'flight') return null;
        try { return buildRoute(current.geometry.map(p => ({ ...p, elevation: 0 }))); }
        catch { return null; }
    }, [current, activeOption?.mode]);
    const liveRatio = useMemo(() => {
        if (!liveModel || !gps.fix || gps.stale || !gps.foreground || gps.fix.accuracy === null || gps.fix.accuracy > 50 || !current)
            return null;
        const cross = distanceToRoute(gps.fix, current.geometry);
        if (cross === null || cross - gps.fix.accuracy > 60)
            return null;
        const match = matchRoute(liveModel, gps.fix);
        return match.confident && liveModel.total > 0 ? Math.max(0, Math.min(1, match.progress / liveModel.total)) : null;
    }, [liveModel, gps.fix, gps.stale, gps.foreground, current]);
    async function update(edit: (v: PersonalJourney) => PersonalJourney) { if (lock.current)
        return; lock.current = true; setBusy(true); setError(''); try {
        await editJourney(uid, j.id, edit);
    }
    catch (failure) {
        if (alive.current)
            setError(failure instanceof Error ? failure.message : 'Could not save this change.');
    }
    finally {
        lock.current = false;
        if (alive.current)
            setBusy(false);
    } }
    async function decideUpdate(decision: 'accept' | 'reject') {
        if (lock.current) return;
        lock.current = true; setBusy(true); setError('');
        try {
            const acceptedUnverified = decision === 'accept' && proposalTemplate ? proposalTemplate.legs.flatMap(leg => {
                const option = selectedOption(leg, {});
                return option.requiresUserDecision && option.verification === 'unconfirmed' ? [`${leg.id}:${option.id}`] : [];
            }) : [];
            await decideJourneyRevision(j.id, decision, acceptedUnverified);
            await editJourney(uid, j.id, value => decision === 'accept' && proposalTemplate
                ? { ...value, template: proposalTemplate, proposedRevision: null, acceptedUnverified, selections: {}, updatedAt: new Date().toISOString() }
                : { ...value, proposedRevision: null, updatedAt: new Date().toISOString() });
        } catch (failure) {
            if (alive.current) setError(failure instanceof Error ? failure.message : 'Could not apply the reviewed route.');
        } finally {
            lock.current = false;
            if (alive.current)
                setBusy(false);
        }
    }
    const detail = selected === null ? null : legs[selected];
    const chosen = detail ? selectedOption(detail, j.selections) : null;
    // Source IDs belong to their route snapshot. Approach sources can repeat
    // template IDs, and a proposed revision may reuse IDs for different URLs.
    const detailSources = selected !== null && selected < j.approach.length ? j.approachSources : j.template.sources;
    const sources = [...new Map(detailSources.map(source => [source.id, source])).values()];
    async function open(url: string) { try {
        if (!url.startsWith('https://'))
            throw new Error();
        await Linking.openURL(url);
    }
    catch {
        setError('Could not open this source. Please retry.');
    } }
    return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <JourneyShell padBottom={64}>
     <Animated.View entering={entrance()}><HomePressable accessibilityRole="button" accessibilityLabel="Back to your journeys" onPress={() => router.replace('/(tabs)/journeys')} style={[s.chip, { paddingHorizontal: 14 }]}><Text style={s.chipText}>← Your journeys</Text></HomePressable></Animated.View>
     {Boolean(error) ? <Animated.View entering={FadeIn.duration(200)} style={s.card}><Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text></Animated.View> : null}
     {missingDeparture ? <View style={s.card}><Text style={s.eyebrow}>STARTING FROM</Text><Text style={s.cardTitle}>{j.preferences.origin.name}</Text><Text style={s.small}>This saved plan is missing the travel leg from your starting point. Prepare it again to include the journey to the trailhead.</Text><JourneyButton label="Prepare from my starting point" busy={busy} onPress={() => void prepareFromOrigin()}/></View> : null}
     {proposal ? <Animated.View entering={entrance(45)} layout={reduced ? undefined : relayout} style={s.card}><Text style={s.eyebrow}>CURRENT ROUTE UPDATE</Text><Text style={s.text}>{proposal.summary || 'Maya found a source reporting a possible disruption on this route. Your saved journey and progress have not changed.'}</Text><Text style={s.small}>Review the current sources below. A replacement is applied only if you choose it. Navo has not confirmed the rest of the route is open.</Text>{proposalTemplate && proposal.status !== 'blocked' ? <><JourneyButton label={proposalTemplate.legs.some(leg => selectedOption(leg, {}).requiresUserDecision) ? 'Use updated route and keep flagged options' : 'Use updated route'} busy={busy} onPress={() => void decideUpdate('accept')}/><JourneyButton label="Keep my current route" variant="quiet" disabled={busy} onPress={() => void decideUpdate('reject')}/></> : <JourneyButton label="Keep my current route" variant="quiet" disabled={busy} onPress={() => void decideUpdate('reject')}/>}</Animated.View> : null}
    {current ? <Animated.View entering={entrance(90)} layout={reduced ? undefined : relayout} style={[s.card, s.highlight]}><Text style={s.eyebrow}>{j.phase === 'ready' || j.phase === 'draft' ? 'FIRST UP' : 'NEXT CHECKPOINT'}</Text><Text style={s.cardTitle}>{current.end.name}</Text><Text style={s.subtitle}>{activeOption ? `${modeIcon[activeOption.mode]} ${activeOption.label} · ${durationLabel(activeOption.minutes)}` : ''}</Text>
      {j.phase === 'travelling' ? <><Text style={s.small}>{gps.stale || !gps.foreground ? 'Location unavailable or paused. You can confirm checkpoints manually.' : liveRatio !== null ? 'Live position · foreground tracking' : 'Location available · schematic stage; progress is confirmed manually.'}</Text><JourneyButton label={`I’ve reached ${current.end.name}`} busy={busy} onPress={() => void update(v => ({ ...v, completed: Math.min(legs.length, v.completed + 1), phase: v.completed + 1 >= legs.length ? 'completed' : 'travelling' }))}/><JourneyButton label="Pause journey" variant="quiet" disabled={busy} onPress={() => void update(v => ({ ...v, phase: 'paused' }))}/></> : <JourneyButton label={!review.canStart ? 'Review route notes' : j.phase === 'paused' ? 'Resume journey' : 'Start journey'} disabled={missingDeparture} busy={busy} onPress={() => {
        if (!review.canStart) {
            const flagged = review.closed[0] ?? review.pending[0];
            if (flagged) setSelected(legs.findIndex(leg => leg.id === flagged.id));
            else setShowNotes(true);
            return;
        }
        void update(v => ({ ...v, phase: 'travelling' }));
      }}/>
}
    </Animated.View> : <Animated.View entering={entrance(90)} style={[s.card, s.highlight]}><Text style={s.cardTitle}>You made it. ✨</Text><Text style={s.subtitle}>Every stage, one journey. Your route and choices are saved here.</Text><JourneyButton label="Undo last checkpoint" variant="outline" disabled={busy} onPress={() => void update(v => ({ ...v, completed: Math.max(0, v.completed - 1), phase: 'paused' }))}/></Animated.View>}
    {(j.template.warnings?.length || !review.canStart) ? <View style={s.card}><Text style={s.eyebrow}>ROUTE NOTES</Text><Text style={s.small}>Your route is saved. Check the details below before setting off; you can explore every stage now.</Text>
      <JourneyButton label={showNotes ? 'Hide route notes' : 'Review route notes'} variant="quiet" onPress={() => setShowNotes(value => !value)}/>
      {showNotes ? <>
      {j.template.warnings?.map((warning, index) => <Text key={index} style={s.small}>{warning}</Text>)}
      {review.pending.map(leg => <JourneyButton key={leg.id} label={`Review ${leg.start.name} → ${leg.end.name}`} variant="outline" busy={busy} onPress={() => setSelected(legs.findIndex(item => item.id === leg.id))}/>)}
      {review.needsAcknowledgement ? <><Text style={s.small}>Some route details could not be confirmed. Reviewing these notes does not verify availability or access.</Text><JourneyButton label="I've reviewed these notes" variant="outline" busy={busy} onPress={() => void update(v => ({ ...v, reviewAcknowledged: true }))}/></> : null}
      {j.template.readiness === 'blocked' || review.closed.length ? <><Text style={s.error}>This plan includes a reported route issue. You can inspect it here and prepare a replacement before travelling.</Text><JourneyButton label="Prepare another route" variant="outline" busy={busy} onPress={() => void prepareFromOrigin()}/></> : null}
      </> : null}
    </View> : null}
    <JourneyBoard legs={legs} selections={j.selections} completed={j.completed} previewIndex={null} liveRatio={liveRatio} onLeg={index => setSelected(index)}/>
    </JourneyShell>
    <Animated.View entering={reduced ? undefined : footerEnter} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 10), alignItems: 'center' }}>
      <HomePressable accessibilityRole="button" accessibilityLabel="Ask Navo about this journey" onPress={askNavo} style={[styles.askDock, scheme === 'dark' && styles.askDockLight]}>
        <Text style={[styles.askLabel, scheme === 'dark' && { color: '#111111' }]}>Ask Navo</Text>
      </HomePressable>
    </Animated.View>
    <Modal visible={detail !== null} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={() => setSelected(null)}><View style={s.backdrop}><View style={s.sheet}><View style={s.sheetHandle}/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: 42, gap: 14 }}><JourneyButton label="Close" variant="quiet" align="left" onPress={() => setSelected(null)}/>{detail ? <><Text style={s.eyebrow}>TRAVEL BETWEEN CHECKPOINTS</Text><Text style={[s.title, { fontSize: 25 }]}>{detail.start.name} → {detail.end.name}</Text><Text style={s.small}>{selected !== null && selected < j.completed ? 'Completed stage. Your recorded choice is kept.' : 'Choose how you want to travel. Updates save immediately.'}</Text>{detail.options.map((option, optionIndex) => { const isChosen = chosen?.id === option.id; const locked = busy || selected !== null && selected < j.completed; return <Animated.View key={option.id} entering={reduced ? undefined : entrance(Math.min(optionIndex * 45, 220))}>
        <HomePressable accessibilityRole="radio" accessibilityState={{ selected: isChosen, disabled: locked }} disabled={locked} onPress={() => { void update(v => ({ ...v, ...(v.completed === 0 ? { phase: 'draft' as const } : {}), selections: { ...v.selections, [detail.id]: option.id } })); }} style={[s.card, isChosen && { borderColor: palette.green, backgroundColor: palette.mint }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isChosen ? palette.background : palette.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 21 }}>{modeIcon[option.mode]}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={s.cardTitle}>{option.label}</Text><Text style={s.small}>{durationLabel(option.minutes)}</Text></View>{isChosen ? <Text style={{ color: palette.green, fontSize: 18, fontWeight: '700' }}>✓</Text> : null}</View>
          <Text style={s.small}>{option.note}</Text>
          {option.warning ? <Text style={s.error}>{option.warning}</Text> : null}
          {option.verification === 'closed-confirmed' ? <Text style={s.error}>Reported closed. Choose another option or prepare a replacement route.</Text> : null}
        </HomePressable>
      </Animated.View>; })}{chosen?.requiresUserDecision && chosen.verification === 'unconfirmed' && !j.acceptedUnverified?.includes(`${detail.id}:${chosen.id}`) ? <JourneyButton label="Keep this option with its warning" variant="outline" busy={busy} onPress={() => void update(v => ({ ...v, acceptedUnverified: [...(v.acceptedUnverified ?? []), `${detail.id}:${chosen.id}`] }))}/> : null}<View style={{ gap: 2 }}>{sources.filter(source => chosen?.sourceIds.includes(source.id)).map(source => <HomePressable key={source.id} accessibilityRole="link" onPress={() => void open(source.url)}><Text style={s.link}>{source.title} ↗</Text></HomePressable>)}</View>{error ? <Text style={s.error}>{error}</Text> : null}</> : null}</ScrollView></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  askDock: { height: 58, paddingHorizontal: 40, borderRadius: 999, backgroundColor: '#111314', borderWidth: 1, borderColor: '#25282A', alignItems: 'center', justifyContent: 'center', shadowColor: '#101713', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 7 },
  askDockLight: { backgroundColor: '#FFFFFF', borderColor: '#E5E5E7', shadowColor: '#000000', shadowOpacity: 0.3 },
  askLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
