import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { router, useLocalSearchParams, useIsFocused, useFocusEffect } from 'expo-router';
import Animated, { FadeIn, FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { Text } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { JourneyShell } from '@/components/journeys/JourneyShell';
import { useJourneyStyles } from '@/components/journeys/journey-styles';
import { JourneyButton } from '@/components/journeys/JourneyMotion';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { StageTravelSheet } from '@/components/journeys/StageTravelSheet';
import { JourneyBoard } from '@/components/journeys/JourneyBoard';
import { useJourneys } from '@/hooks/useJourneys';
import { useTheme } from '@/context/ThemeContext';
import { useNavo } from '@/context/NavoContext';
import { useTrekLocation } from '@/hooks/useTrekLocation';
import { editJourney, saveJourneyDraft } from '@/lib/journey-store';
import { requestJourneyReview, decideJourneyRevision } from '@/services/journeys/api';
import { addDurationReferences } from '@/services/journeys/duration-references';
import { optionDurationLabel, durationLabel, checkpointLabel, chooseTravel, journeySummary, pointDistanceM, selectedOption, journeyReview, type PersonalJourney, type JourneySource, type Itinerary } from '@/services/journeys/types';
import { buildRoute, matchRoute } from '@/services/trekking/navigation';
import { distanceToRoute } from '@/services/route-distance';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
const relayout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);
export default function JourneyLevelsScreen() {
    const { id } = useLocalSearchParams<{
        id?: string;
    }>();
    const library = useJourneys();
    const [retrying, setRetrying] = useState(false);
    const retryLock = useRef(false);
    async function reload() { if (retryLock.current) return; retryLock.current = true; setRetrying(true); try { await library.reload(); } finally { retryLock.current = false; setRetrying(false); } }
    const { userId } = useNavo();
    const s = useJourneyStyles();
    const { palette } = useTheme();
    const journey = library.data.journeys.find(j => j.id === id);
    if (!library.loaded)
        return <JourneyShell><View style={{ alignItems: 'center', gap: 14, paddingTop: 60 }}><ActivityIndicator color={palette.green}/><Text style={s.subtitle}>Opening your journey…</Text></View></JourneyShell>;
    if (!journey)
        return <JourneyShell><Animated.View entering={entrance()} style={{ gap: 10 }}><Text style={s.eyebrow}>JOURNEY LIBRARY</Text><Text style={s.title}>Journey unavailable.</Text><Text style={s.error}>{library.error || 'Choose a saved journey or plan a new one.'}</Text><JourneyButton label="Retry loading journeys" busy={retrying} onPress={() => void reload()}/><JourneyButton label="← Your journeys" variant="outline" onPress={() => router.replace('/(tabs)/journeys')}/></Animated.View></JourneyShell>;
    return <JourneyDetails key={`${userId}:${journey.id}`} journey={journey} uid={userId} cached={library.cached} retrying={retrying} onReload={() => void reload()}/>;
}
function JourneyDetails({ journey: j, uid, cached, retrying, onReload }: {
    cached: boolean; retrying: boolean; onReload: () => void;
    journey: PersonalJourney;
    uid: string;
}) {
    const { palette } = useTheme();
    const s = useJourneyStyles();
    const [selected, setSelected] = useState<number | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [previewPath, setPreviewPath] = useState(false);
    useEffect(() => { if (!previewPath) return; const timer = setTimeout(() => setPreviewPath(false), 2200); return () => clearTimeout(timer); }, [previewPath]);
    const [saved, setSaved] = useState('');
    const [reviewError, setReviewError] = useState('');
    const summary = journeySummary(j);
    function openStage(index: number) { if (lock.current) return; setError(''); setSaved(''); setSelected(index); }
    const lock = useRef(false), alive = useRef(true), chatOpen = useRef(false);
    const focused = useIsFocused();
    const reduced = useReducedMotion();
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { let active = true; if (focused) void requestJourneyReview(j.id).catch(() => { if (active) setReviewError('Fresh conditions review is unavailable. Saved source notes remain available.'); }); return () => { active = false; }; }, [focused, j.id]);
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
    const pricedOptions = legs.map(leg => selectedOption(leg, j.selections));
    const knownTransportMax = pricedOptions.reduce((sum, option) => sum + (option.costNprPerPerson?.maximum ?? 0), 0);
    const unknownFares = pricedOptions.filter(option => option.mode !== 'walk' && !option.costNprPerPerson).length;
    const timedStages = pricedOptions.length - summary.unknownDurations;
    const routeStops = [legs[0]?.start, legs.find(leg => selectedOption(leg, j.selections).mode === 'walk')?.start, j.template.destination, legs[legs.length - 1]?.end]
        .filter((point): point is NonNullable<typeof point> => Boolean(point))
        .map(point => checkpointLabel(point))
        .filter((name, index, names) => index === 0 || name !== names[index - 1]);
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
        return; lock.current = true; setBusy(true); setError(''); setSaved(''); try {
        await editJourney(uid, j.id, edit);
        if (alive.current) setSaved('Saved to your account.');
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
    <JourneyShell scenery>
     <Animated.View entering={entrance()}><HomePressable accessibilityRole="button" accessibilityLabel="Back to your journeys" onPress={() => router.replace('/(tabs)/journeys')} style={[s.chip, { paddingHorizontal: 14 }]}><Text style={s.chipText}>← Your journeys</Text></HomePressable></Animated.View>
     <View style={{ gap: 10 }}><Text style={s.eyebrow}>YOUR JOURNEY · PLANNING REFERENCE</Text><Text style={[s.title, { fontSize: 26, lineHeight: 34 }]}>{j.template.destination.name}</Text><Text style={s.subtitle}>{routeStops.join(' → ')}</Text><Text style={s.text}>{summary.stages} stages · {timedStages} with approximate times</Text><Text style={s.small}>{summary.unknownDurations} stages need a time estimate · {summary.attention.length} need review · {j.completed} completed</Text>
       {summary.estimatedRange ? <Text style={s.small}>Combined movement time: {durationLabel(summary.estimatedRange.minimum).replace(' est.', '')}{summary.estimatedRange.minimum !== summary.estimatedRange.maximum ? `–${durationLabel(summary.estimatedRange.maximum).replace(' est.', '')}` : ''} approx. Spread walking across suitable days; breaks, overnight stays and waits are additional.</Text> : null}
       {addDurationReferences(j) !== j ? <JourneyButton label="Add sourced time estimates" busy={busy} onPress={() => void update(addDurationReferences)}/> : null}
       {summary.expired ? <Text style={s.error}>Saved research is out of date. Recheck access and transport before departure.</Text> : null}
       {summary.attention.length ? <JourneyButton label="Review next stage" variant="outline" disabled={busy} onPress={() => { const next = summary.attention.find(leg => legs.indexOf(leg) >= j.completed) ?? summary.attention[0]; openStage(legs.indexOf(next)); }}/>: null}
       <JourneyButton label={showNotes ? 'Hide research & open questions' : 'Research & open questions'} variant="quiet" onPress={() => setShowNotes(value => !value)}/>
     </View>
     {j.preferences.budget ? <View style={s.card}><Text style={s.eyebrow}>YOUR BUDGET</Text><Text style={s.cardTitle}>NPR {Number(j.preferences.budget).toLocaleString()} per person</Text><Text style={s.small}>{knownTransportMax ? `Known transport estimates: up to NPR ${knownTransportMax.toLocaleString()}. ` : 'No sourced transport fares are available yet. '}{unknownFares} {unknownFares === 1 ? 'transport stage needs' : 'transport stages need'} a fare. Meals, stays and permits are additional.</Text>{knownTransportMax > Number(j.preferences.budget) ? <Text style={s.error}>Known transport estimates exceed your budget. Review the travel choices below.</Text> : null}</View> : null}
     {cached ? <View style={s.card}><Text style={s.small}>Showing your saved copy. Account sync is unavailable; edits need a successful server connection.</Text><JourneyButton label="Retry account sync" variant="outline" busy={retrying} onPress={onReload}/></View> : null}
     {Boolean(error) ? <Animated.View entering={FadeIn.duration(200)} style={s.card}><Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text></Animated.View> : null}
     {missingDeparture ? <View style={s.card}><Text style={s.eyebrow}>STARTING FROM</Text><Text style={s.cardTitle}>{j.preferences.origin.name}</Text><Text style={s.small}>This saved plan is missing the travel leg from your starting point. Prepare it again to include the journey to the trailhead.</Text><JourneyButton label="Prepare from my starting point" busy={busy} onPress={() => void prepareFromOrigin()}/></View> : null}
     {proposal ? <Animated.View entering={entrance(45)} layout={reduced ? undefined : relayout} style={s.card}><Text style={s.eyebrow}>CURRENT ROUTE UPDATE</Text><Text style={s.text}>{proposal.summary || 'Maya found a source reporting a possible disruption on this route. Your saved journey and progress have not changed.'}</Text><Text style={s.small}>Review the current sources below. A replacement is applied only if you choose it. Navo has not confirmed the rest of the route is open.</Text>{proposalTemplate && proposal.status !== 'blocked' ? <><JourneyButton label={proposalTemplate.legs.some(leg => selectedOption(leg, {}).requiresUserDecision) ? 'Use updated route and keep flagged options' : 'Use updated route'} busy={busy} onPress={() => void decideUpdate('accept')}/><JourneyButton label="Keep my current route" variant="quiet" disabled={busy} onPress={() => void decideUpdate('reject')}/></> : <JourneyButton label="Keep my current route" variant="quiet" disabled={busy} onPress={() => void decideUpdate('reject')}/>}</Animated.View> : null}
    {current ? <Animated.View entering={entrance(90)} layout={reduced ? undefined : relayout} style={[s.card, s.highlight]}><Text style={s.eyebrow}>{j.phase === 'ready' || j.phase === 'draft' ? 'FIRST UP' : 'NEXT CHECKPOINT'}</Text><Text style={s.cardTitle}>{checkpointLabel(current.end)}</Text><Text style={s.subtitle}>{activeOption ? `${activeOption.label} · ${optionDurationLabel(activeOption)}` : ''}</Text>
      {j.phase === 'travelling' ? <><Text style={s.small}>{gps.stale || !gps.foreground ? 'Location unavailable or paused. You can confirm checkpoints manually.' : liveRatio !== null ? 'Live position · foreground tracking' : 'Location available · schematic stage; progress is confirmed manually.'}</Text><JourneyButton label={`I’ve reached ${checkpointLabel(current.end)}`} busy={busy} onPress={() => void update(v => ({ ...v, completed: Math.min(legs.length, v.completed + 1), phase: v.completed + 1 >= legs.length ? 'completed' : 'travelling' }))}/><JourneyButton label="Pause journey" variant="quiet" disabled={busy} onPress={() => void update(v => ({ ...v, phase: 'paused' }))}/></> : <JourneyButton label={!review.canStart ? 'Resolve planning decisions' : j.phase === 'paused' ? 'Resume journey' : 'Start journey'} disabled={missingDeparture} busy={busy} onPress={() => {
        if (!review.canStart) {
            const flagged = review.closed[0] ?? review.pending[0];
            if (flagged) openStage(legs.findIndex(leg => leg.id === flagged.id));
            else setShowNotes(true);
            return;
        }
        void update(v => ({ ...v, phase: 'travelling' }));
      }}/>
}
      <JourneyButton label="Ask Navo about this stage" variant="quiet" onPress={askNavo}/>
    </Animated.View> : <Animated.View entering={entrance(90)} style={[s.card, s.highlight]}><Text style={s.cardTitle}>You made it. ✨</Text><Text style={s.subtitle}>Every stage, one journey. Your route and choices are saved here.</Text><JourneyButton label="Undo last checkpoint" variant="outline" disabled={busy} onPress={() => void update(v => ({ ...v, completed: Math.max(0, v.completed - 1), phase: 'paused' }))}/></Animated.View>}
    {showNotes ? <View style={s.card}><Text style={s.eyebrow}>RESEARCH & OPEN QUESTIONS</Text><Text style={s.small}>Open a stage to see its travel notes, source dates and decisions to confirm.</Text>
      {j.template.modelEvidence?.length ? <View style={{ gap: 5 }}><Text style={s.text}>Model calls</Text>{j.template.modelEvidence.map((call, index) => <Text key={`${call.agent}-${index}`} style={s.small}>{call.agent} · {call.model} on {call.provider === 'nebius' ? 'Nebius Token Factory' : 'OpenRouter'} · {(call.elapsedMs / 1000).toFixed(1)}s{call.completionTokens != null ? ` · ${call.completionTokens} output tokens` : ''}</Text>)}<Text style={s.small}>These are completed inference calls. They do not verify trail access or the resulting plan.</Text></View> : <Text style={s.small}>This saved plan has no per-call model record.</Text>}
      {j.template.agentReview?.length ? j.template.agentReview.map((entry, index) => <View key={`${entry.agent}-${index}`} style={{ gap: 5 }}><Text style={s.text}>{entry.agent}</Text><Text style={s.small}>{entry.summary}{entry.legIds.length ? ` · ${entry.legIds.length} stages flagged` : ''}</Text>{j.template.sources.filter(source => entry.sourceIds.includes(source.id)).map(source => <HomePressable key={source.id} accessibilityRole="link" onPress={() => void open(source.url)}><Text style={s.link}>{source.title} ↗</Text></HomePressable>)}</View>) : <Text style={s.small}>This saved plan has no per-agent review record. The source notes and warnings below are available; no individual agent completion is inferred.</Text>}
      {j.template.warnings?.map((warning, index) => <Text key={index} style={s.small}>{warning}</Text>)}
      {review.pending.length ? <JourneyButton label={`Review first of ${review.pending.length} pending decisions`} variant="outline" busy={busy} onPress={() => openStage(legs.findIndex(item => item.id === review.pending[0].id))}/> : null}
      {review.needsAcknowledgement ? <><Text style={s.small}>Some route details could not be confirmed. Reviewing these notes does not verify availability or access.</Text><JourneyButton label="I've reviewed these notes" variant="outline" busy={busy} onPress={() => void update(v => ({ ...v, reviewAcknowledged: true }))}/></> : null}
      {review.invalidIdentity ? <Text style={s.error}>A checkpoint name contains route advice instead of a place. Prepare this journey again to resolve its identity.</Text> : null}
      {!j.template.agentReview?.length ? <><Text style={s.small}>This plan predates the stage identity checks. Preparing it again creates a separate plan and keeps this saved journey.</Text><JourneyButton label="Prepare a fresh plan" variant="outline" busy={busy} onPress={() => void prepareFromOrigin()}/></> : null}
      {j.template.readiness === 'blocked' || review.closed.length || review.invalidIdentity ? <><Text style={s.error}>This plan includes a reported route issue. You can inspect it here and prepare a replacement before travelling.</Text><JourneyButton label="Prepare another route" variant="outline" busy={busy} onPress={() => void prepareFromOrigin()}/></> : null}
    </View> : null}
    {reviewError ? <View style={s.card}><Text style={s.error}>{reviewError}</Text><JourneyButton label="Retry conditions review" variant="quiet" onPress={() => { setReviewError(''); void requestJourneyReview(j.id).catch(() => setReviewError('Conditions review could not be requested. Check your connection and try again.')); }}/></View> : null}
    {legs.length && j.phase !== 'travelling' ? <View style={{ gap: 4 }}><Text style={s.small}>Planning path · not a navigable track or live position</Text><JourneyButton label={previewPath ? "Previewing first stage…" : "Preview first stage"} variant="quiet" disabled={previewPath} onPress={() => setPreviewPath(true)}/></View> : null}
    <JourneyBoard legs={legs} selections={j.selections} completed={j.completed} previewIndex={previewPath ? 0 : null} liveRatio={liveRatio} onLeg={openStage}/>
    </JourneyShell>
    {detail && chosen && selected !== null ? <StageTravelSheet key={detail.id} leg={detail} provenance={j.template.provenance} chosen={chosen} index={selected} total={legs.length} sources={sources} completed={selected < j.completed} busy={busy} error={error} saved={saved} accepted={Boolean(j.acceptedUnverified?.includes(`${detail.id}:${chosen.id}`))}
      onClose={() => { if (!lock.current) { setSelected(null); setSaved(''); } }}
      onChoose={optionId => void update(value => chooseTravel(value, detail.id, optionId))}
      onAccept={() => void update(value => ({ ...value, acceptedUnverified: [...new Set([...(value.acceptedUnverified ?? []), `${detail.id}:${chosen.id}`])] }))}
      onOpenSource={url => void open(url)}/> : null}
  </View>;
}
