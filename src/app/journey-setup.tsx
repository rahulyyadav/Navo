import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Text, TextInput } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { JourneyDatePicker, journeyDateLabel } from '@/components/journeys/JourneyDatePicker';
import { SetupField, SetupIcon, SetupProgress } from '@/components/journeys/SetupUI';
import { useSetupStyles } from '@/components/journeys/setup-styles';
import { useTheme } from '@/context/ThemeContext';
import { DestinationSearch } from '@/components/journeys/DestinationSearch';
import { useNavo } from '@/context/NavoContext';
import { useMyLocation } from '@/hooks/useMyLocation';
import { readJourneyDraft, saveJourneyDraft, saveJourney } from '@/lib/journey-store';
import { itineraryStatus, prepareItinerary, connectOrigin, unconfirmedApproach, type PreparationStatus } from '@/services/journeys/api';
import { validDate, validPoint, type JourneyPoint, type JourneyPreferences } from '@/services/journeys/types';
import { nepalToday } from '@/services/day-hike';
import { NepalMap } from '@/components/NepalMap';
function parse(value: unknown): JourneyPoint | null { try {
    const p = JSON.parse(typeof value === 'string' ? value : '');
    return validPoint(p) ? p : null;
}
catch {
    return null;
} }
export default function JourneySetupScreen() {
    const s = useSetupStyles();
    const { scheme } = useTheme();
    const params = useLocalSearchParams<{
        destination?: string;
    }>();
    useFocusEffect(useCallback(() => { StatusBar.setStyle(scheme === 'dark' ? 'light' : 'dark'); return () => StatusBar.setStyle('light'); }, [scheme]));
    const destination = useMemo(() => parse(params.destination), [params.destination]);
    const { userId, isSignedIn } = useNavo();
    if (!destination)
        return <View style={[s.page, s.loading]}><Text style={s.title}>Choose a destination first.</Text><HomePressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/discover')} style={[s.continue, { flex: 0, width: '100%', maxWidth: 360 }]}><Text style={s.continueText}>Back to Home</Text></HomePressable></View>;
    if (!isSignedIn)
        return <View style={[s.page, s.loading]}><Text style={s.title}>Save your journey.</Text><Text style={s.muted}>Sign in to keep your plan and progress together.</Text><HomePressable accessibilityRole="button" onPress={() => router.push('/login')} style={[s.continue, { flex: 0, width: '100%', maxWidth: 360 }]}><Text style={s.continueText}>Sign in</Text></HomePressable></View>;
    return <Setup key={`${userId}:${destination.id}`} destination={destination} uid={userId}/>;
}
function Setup({ destination, uid }: {
    destination: JourneyPoint;
    uid: string;
}) {
    const s = useSetupStyles();
    const { palette } = useTheme();
    const green = palette.green;
    const [preferences, setPreferences] = useState<JourneyPreferences>({ origin: destination, startDate: nepalToday(), budget: '', currency: 'NPR', finishDate: '' });
    const [origin, setOrigin] = useState<JourneyPoint | null>(null), [editOrigin, setEditOrigin] = useState(false), [step, setStep] = useState(0), [hydrated, setHydrated] = useState(false), [error, setError] = useState(''), [saving, setSaving] = useState(false), [retry, setRetry] = useState(0);
    const [preparation, setPreparation] = useState<PreparationStatus | null>(null), [researchError, setResearchError] = useState('');
    const [preparedApproach, setPreparedApproach] = useState<Awaited<ReturnType<typeof connectOrigin>> | null>(null);
    const [mapChoicePrompt, setMapChoicePrompt] = useState<PreparationStatus['mapChoices']>();
    const [mapChoices, setMapChoices] = useState<Record<string, string>>({});
    const gps = useMyLocation();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const reduced = useReducedMotion();
    const scroll = useRef<ScrollView>(null);
    const revealSearch = useRef(false);
    const [mapNonce, setMapNonce] = useState(0);
    useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
    const lock = useRef(false);
    const personalId = useRef<string | null>(null);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { let active = true; void readJourneyDraft(uid, destination.id).then(v => { if (!active)
        return; if (v) {
        setPreferences(p => ({ ...p, ...v, origin: validPoint(v.origin) ? v.origin : p.origin }));
        if (validPoint(v.origin))
            setOrigin(v.origin);
    } setHydrated(true); }).catch(() => { if (active) {
        setError('Your earlier answers could not be restored. You can enter them again.');
        setHydrated(true);
    } }); return () => { active = false; }; }, [uid, destination.id]);
    useEffect(() => { if (!hydrated)
        return; const timer = setTimeout(() => { void saveJourneyDraft(uid, destination.id, { ...preferences, ...(origin ? { origin } : { origin: undefined }) }).catch(() => { if (alive.current)
        setError('Could not save these answers on this device.'); }); }, 300); return () => clearTimeout(timer); }, [uid, destination.id, preferences, origin, hydrated]);
    useEffect(() => {
        if (!hydrated || !origin || !validDate(preferences.startDate)) return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let failures = 0;
        const started = Date.now();
        async function poll(id: string) {
            try {
                const value = await itineraryStatus(id);
                if (!active)
                    return;
                failures = 0;
                receive(value);
            }
            catch (failure) {
                if (!active)
                    return;
                if (++failures >= 3) {
                    setResearchError(failure instanceof Error ? failure.message : 'Could not check the itinerary.');
                    return;
                }
                timer = setTimeout(() => { void poll(id); }, 5000);
            }
        }
        function receive(value: PreparationStatus) { if (!active)
            return; setPreparation(value); if (value.status === 'needs_user_choice') {
            if (!value.mapChoices || !Array.isArray(value.mapChoices.candidates) || !value.mapChoices.candidates.length) {
                setMapChoicePrompt(undefined);
                setResearchError('Navo could not safely identify a route checkpoint. Retry preparation so the saved research can be checked again.');
                return;
            }
            setResearchError('');
            setMapChoicePrompt(value.mapChoices);
            return;
        } if (value.status === 'ready' && value.template) {
            setResearchError(''); setMapChoicePrompt(undefined);
            void connectOrigin(value.template, origin!).then(approach => {
                if (active) setPreparedApproach(approach);
            }).catch(() => {
                if (active) setPreparedApproach(unconfirmedApproach(value.template!, origin!));
            });
        } if (value.status === 'failed') {
            setResearchError(value.message || 'Could not prepare this itinerary. Please retry.');
            return;
        } if (value.status === 'preparing') {
            // The backend bounds a full preparation at just under five minutes.
            // Keep polling long enough to receive its durable failure/checkpoint.
            if (Date.now() - started > 310000) {
                setResearchError('This is taking longer than expected. Your answers are saved. Retry to reconnect.');
                return;
            }
            timer = setTimeout(() => { void poll(value.id); }, 5000);
        } }
        void prepareItinerary(destination, origin, preferences.startDate, mapChoices).then(receive).catch(failure => { if (active)
            setResearchError(failure instanceof Error ? failure.message : 'Could not prepare this itinerary.'); });
        return () => { active = false; if (timer)
            clearTimeout(timer); };
    }, [destination, retry, origin, preferences.startDate, hydrated, mapChoices]);
    function resetPreparation() {
        setResearchError('');
        setPreparation(null);
        setPreparedApproach(null);
        setMapChoicePrompt(undefined);
    }
    function patch(value: Partial<JourneyPreferences>) {
        setError('');
        if (value.startDate !== undefined) {
            resetPreparation();
            setMapChoices({});
        }
        setPreferences(p => ({ ...p, ...value }));
    }
    async function locate() { setError(''); const point = await gps.locate(); if (!alive.current)
        return; if (!point) {
        setError('Location unavailable. Search for your starting place instead.');
        revealSearch.current = true; setEditOrigin(true);
        return;
    } if (point.accuracy !== null && point.accuracy > 500) {
        setError('Your location is too approximate. Choose a starting place below.');
        revealSearch.current = true; setEditOrigin(true);
        return;
    } resetPreparation(); setMapChoices({}); setOrigin({ id: `origin:${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`, name: 'Your current location', latitude: point.latitude, longitude: point.longitude }); setMapNonce(v => v + 1); setEditOrigin(false); }
    function next() { Keyboard.dismiss(); setError(''); if (step === 0 && !origin) {
        setError('Confirm your starting location first.');
        return;
    } if (step === 1 && !validDate(preferences.startDate)) {
        setError('Enter a valid date in YYYY-MM-DD format.');
        return;
    } setStep(Math.min(step + 1, 2)); }
    async function confirm() {
        if (lock.current || !origin || !preparation?.template || !preparedApproach)
            return;
        if (!validDate(preferences.startDate)) {
            setError('Choose a valid starting date.');
            return;
        }
        if (preferences.finishDate && !validDate(preferences.finishDate)) {
            setError('Use a valid finishing date or leave it blank.');
            return;
        }
        if (preferences.budget && !/^\d{1,9}(\.\d{1,2})?$/.test(preferences.budget)) {
            setError('Enter a budget amount or leave it blank.');
            return;
        }
        lock.current = true;
        if (!personalId.current)
            personalId.current = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 24).padStart(24, '0');
        const journeyId = personalId.current;
        setSaving(true);
        setError('');
        try {
            const template = preparation.template;
            const approach = preparedApproach;
            if (!alive.current)
                return;
            const now = new Date().toISOString();
            await saveJourney(uid, { version: 1, id: journeyId, template, preferences: { ...preferences, origin }, approach: approach.legs, approachSources: approach.sources, selections: {}, acceptedUnverified: [], completed: 0, phase: 'draft', createdAt: now, updatedAt: now });
            if (alive.current)
                router.replace({ pathname: '/journey-levels', params: { id: journeyId } });
        }
        catch (failure) {
            if (alive.current)
                setError(failure instanceof Error ? failure.message : 'Could not save your journey. Your answers are kept.');
        }
        finally {
            lock.current = false;
            if (alive.current)
                setSaving(false);
        }
    }
    if (!hydrated)
        return <View style={[s.page, s.loading]}><ActivityIndicator color={green}/><Text style={s.muted}>Restoring your answers…</Text></View>;
    const preparing = step === 2 && !researchError && (preparation === null || preparation.status === 'preparing' || preparation.status === 'ready' && !preparedApproach);
    const awaitingMapChoice = step === 2 && Boolean(mapChoicePrompt);
    const waiting = saving || preparing;
    const locating = gps.state === 'locating';
    function goBack() {
        Keyboard.dismiss(); setError('');
        if (step) setStep(v => v - 1);
        else if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover');
    }
    function toggleSearch() {
        if (editOrigin) Keyboard.dismiss();
        else revealSearch.current = true;
        setEditOrigin(!editOrigin);
    }
    function selectOrigin(point: JourneyPoint) {
        Keyboard.dismiss(); resetPreparation(); setMapChoices({}); setOrigin(point); setMapNonce(value => value + 1); setEditOrigin(false); setError('');
    }
    const primaryLabel = step < 2 ? 'Continue' : saving ? 'Connecting your start…' : researchError ? 'Retry preparation' : preparing ? 'Preparing…' : mapChoicePrompt ? 'Choose a map result above' : 'View my route';
    return <View style={s.page}><KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.header, { paddingTop: insets.top + 17, paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) }]}>
        <View style={s.headerRow}><Text style={s.eyebrow}>A NEW JOURNEY</Text><View style={s.stepTicket}><Text style={s.stepTicketText}>0{step + 1} / 03</Text></View></View>
        <View style={{ gap: 5 }}><Text numberOfLines={1} style={s.destination}>{destination.name}</Text><Text accessibilityRole="header" style={s.title}>{['Where will you start?', 'When do you set off?', 'Make it your journey.'][step]}</Text></View>
        <SetupProgress step={step}/>
      </View>
      <ScrollView ref={scroll} style={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        onContentSizeChange={() => { if (revealSearch.current) { revealSearch.current = false; scroll.current?.scrollToEnd({ animated: !reduced }); } }}
        contentContainerStyle={[s.content, { paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) }]}>
        <Animated.View key={step} entering={FadeInDown.duration(300).reduceMotion(ReduceMotion.System)} style={s.step}>
          {step === 0 ? <>
            <View style={[s.map, { height: Math.max(240, Math.min(450, height * .43)) }]}>
              <NepalMap hideCatalogue basemap="streets" region={{ latitude: (origin ?? destination).latitude, longitude: (origin ?? destination).longitude, latitudeDelta: .3, longitudeDelta: .3 }} regionNonce={mapNonce} selectedId={null} onSelectTrek={() => undefined} myCoords={null} focusPoint={{ ...(origin ?? destination), label: (origin ?? destination).name }}/>
            </View>
            <View style={s.mapCaption}><TabIcon name="pin" color={green} size={15}/><Text style={s.small}>{origin ? `Your start: ${origin.name}` : `Destination: ${destination.name}`}</Text></View>
            <Text style={s.prompt}>Where are you setting off from?</Text>
            <View style={s.choices}>
              <HomePressable accessibilityRole="button" accessibilityState={{ busy: locating, disabled: locating }} disabled={locating} onPress={() => void locate()} style={s.choice}><View style={s.choiceIcon}>{locating ? <ActivityIndicator color={green}/> : <TabIcon name="pin" color={green} size={21}/>}</View><View style={s.choiceCopy}><Text style={s.choiceTitle}>{locating ? 'Finding your location…' : origin ? 'Use my current location again' : 'Use my current location'}</Text><Text style={s.small}>Start from where you are now.</Text></View><SetupIcon name="arrow" size={18}/></HomePressable>
              <View style={s.divider}/>
              <HomePressable accessibilityRole="button" accessibilityState={{ expanded: editOrigin, disabled: locating }} disabled={locating} onPress={toggleSearch} style={s.choice}><View style={s.choiceIcon}><SetupIcon name="search" size={20}/></View><View style={s.choiceCopy}><Text style={s.choiceTitle}>{editOrigin ? 'Close place search' : 'Choose a starting place'}</Text><Text style={s.small}>Search for a city, village or trailhead.</Text></View><Text style={s.originTitle}>{editOrigin ? '−' : '+'}</Text></HomePressable>
            </View>
            {editOrigin ? <DestinationSearch light catalogue={false} label="Where will you begin?" onSelect={selectOrigin}/> : null}
            {origin ? <View style={s.selectedOrigin}><View style={s.headerRow}><View style={{ flex: 1, gap: 5 }}><Text style={s.eyebrow}>STARTING FROM</Text><Text style={s.originTitle}>{origin.name}</Text></View><HomePressable accessibilityRole="button" accessibilityLabel="Clear starting point" onPress={() => { resetPreparation(); setMapChoices({}); setOrigin(null); setMapNonce(value => value + 1); setError(''); }} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={s.small}>Clear</Text></HomePressable></View><Text style={s.small}>{origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}</Text></View> : null}
          </> : null}
          {step === 1 ? <JourneyDatePicker value={preferences.startDate} onChange={value => patch({ startDate: value })}/> : null}
          {step === 2 ? <>
            <View style={s.card}><View style={s.headerRow}><View style={{ gap: 4 }}><Text style={s.sectionTitle}>A budget that works for you</Text><Text style={s.optional}>Optional · Nepalese rupees</Text></View><SetupIcon name="wallet"/></View><View style={s.budgetRow}><Text style={s.currency}>NPR</Text><TextInput accessibilityLabel="Budget in Nepalese rupees, optional" placeholder="Your budget" placeholderTextColor="#A0ACA3" value={preferences.budget} onChangeText={value => patch({ budget: value })} keyboardType="decimal-pad" maxLength={12} editable={!saving} style={s.budgetInput}/></View></View>
            <SetupField label="Expected finishing date · optional" value={preferences.finishDate} onChangeText={value => patch({ finishDate: value })} placeholder="YYYY-MM-DD" maxLength={10} editable={!saving}/>
            <Text style={s.small}>Budget and finishing date are personal notes. They don’t change the route or transport prices.</Text>
            <View style={s.creamCard}><Text style={s.sectionLabel}>YOUR PLAN AT A GLANCE</Text>{[
              ['Starting from', origin?.name || 'Choose your start'], ['Heading to', destination.name], ['Setting off', journeyDateLabel(preferences.startDate)],
            ].map(([label, value]) => <View key={label} style={s.summaryRow}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View>)}</View>
            <View style={s.status}>
              <View style={s.statusRow}>{preparation?.status === 'ready' && preparedApproach && !researchError ? <SetupIcon name="check" size={19}/> : preparation?.status === 'needs_user_choice' ? <SetupIcon name="search" size={19}/> : researchError ? <SetupIcon name="back" size={19}/> : <ActivityIndicator color={green} size="small"/>}<Text style={[s.choiceTitle, { flex: 1 }]}>{researchError ? 'Journey research needs another try' : preparing && preparation?.status === 'ready' ? 'Connecting your starting point' : preparation?.status === 'ready' ? 'Journey information is ready' : preparation?.status === 'needs_user_choice' ? 'Choose a matching map result' : 'Preparing your journey'}</Text></View>
              <Text accessibilityLiveRegion="polite" style={s.small}>{researchError ? `${researchError} Your answers are saved.` : preparing && preparation?.status === 'ready' ? 'Preparing the travel leg from your starting point to the first route checkpoint.' : preparation?.status === 'ready' ? `${preparation.stage === 'complete' ? 'Hank, Julia, Thompson and Paul have completed their checks.' : 'The evidence review is complete.'}${preparation.template?.destinationMeaning ? ` Destination endpoint: ${preparation.template.destinationMeaning}.` : ''} You can review sources before saving.` : preparation?.status === 'needs_user_choice' ? `Select the map match for ${mapChoicePrompt?.stopName || 'this checkpoint'} to continue.` : preparation?.stage ? `Current stage: ${preparation.stage.replaceAll('_', ' ')} · ${preparation.modelCalls ?? 0} of 6 model calls` : 'You can review your details while we gather dated route evidence.'}</Text>
              {researchError ? <HomePressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/discover')} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}><Text style={s.backText}>Search for another destination</Text></HomePressable> : null}
            </View>
            {preparation?.template ? <Text style={s.small}>Your route is ready to view. Travel estimates and anything that needs confirmation will appear beside the route.</Text> : null}
            {mapChoicePrompt ? <View style={s.creamCard}><Text style={s.sectionTitle}>Choose the matching map result</Text><Text style={s.small}>Julia found more than one possible place for {mapChoicePrompt.stopName}. Select the right one to continue; Navo won’t guess.</Text>{mapChoicePrompt.candidates.map(candidate => <HomePressable key={candidate.id} accessibilityRole="button" onPress={() => { resetPreparation(); setMapChoices(values => ({ ...values, [String(mapChoicePrompt.stopIndex)]: candidate.id })); setMapChoicePrompt(undefined); setPreparation(null); setRetry(value => value + 1); }} style={s.choice}><View style={s.choiceCopy}><Text style={s.choiceTitle}>{candidate.name}</Text><Text style={s.small}>{[candidate.type, candidate.region].filter(Boolean).join(' · ')}</Text></View><SetupIcon name="arrow"/></HomePressable>)}</View> : null}
          </> : null}
        </Animated.View>
      </ScrollView>
      {error ? <View style={s.errorBox}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text></View> : null}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}><View style={[s.footerRow, { paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) }]}>
        <HomePressable accessibilityRole="button" accessibilityLabel={step ? 'Back to previous step' : 'Back to previous screen'} disabled={saving} onPress={goBack} style={[s.back, saving && s.disabled]}><SetupIcon name="back" size={18}/><Text style={s.backText}>Back</Text></HomePressable>
        <HomePressable accessibilityRole="button" accessibilityState={{ busy: waiting, disabled: waiting || locating || awaitingMapChoice }} disabled={waiting || locating || awaitingMapChoice} onPress={() => {
          Keyboard.dismiss();
          if (step < 2) { next(); return; }
          if (researchError) { resetPreparation(); setRetry(v => v + 1); return; }
          void confirm();
        }} style={[s.continue, (waiting || locating || awaitingMapChoice) && s.disabled]}>{waiting ? <ActivityIndicator color="#FFFFFF" size="small"/> : null}<Text style={s.continueText}>{primaryLabel}</Text>{!waiting && !mapChoicePrompt ? <SetupIcon name="arrow" color="#FFFFFF" size={19}/> : null}</HomePressable>
      </View></View>
    </KeyboardAvoidingView></View>;
}
