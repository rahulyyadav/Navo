import { useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Text } from '@/components/Typography';
import { TabIcon } from '@/components/TabIcon';
import { JourneyShell } from '@/components/journeys/JourneyShell';
import { useJourneyStyles } from '@/components/journeys/journey-styles';
import { JourneyButton } from '@/components/journeys/JourneyMotion';
import { HomePressable } from '@/components/journeys/HomeMotion';
import { JourneyDeck, JourneyCardFace } from '@/components/journeys/JourneyDeck';
import { useJourneys } from '@/hooks/useJourneys';
import { useNavo } from '@/context/NavoContext';
import { useTheme } from '@/context/ThemeContext';
import { changeJourneys } from '@/lib/journey-store';
import type { PersonalJourney } from '@/services/journeys/types';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
export default function JourneysScreen() {
    const library = useJourneys();
    const { userId } = useNavo();
    const s = useJourneyStyles();
    const { palette } = useTheme();
    const [error, setError] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState(false);
    const journeys = useMemo(() => {
        const list = [...library.data.journeys];
        const active = library.data.activeId;
        if (active)
            list.sort((a, b) => (b.id === active ? 1 : 0) - (a.id === active ? 1 : 0));
        return list;
    }, [library.data.journeys, library.data.activeId]);
    const active = journeys.find(j => j.id === library.data.activeId) ?? null;
    const previous = journeys.filter(j => j.id !== library.data.activeId);
    async function activate(journey: PersonalJourney) { try {
        await changeJourneys(userId, v => ({ ...v, activeId: journey.id, journeys: v.journeys.map(item => item.id !== journey.id && item.phase === 'travelling' ? { ...item, phase: 'paused' } : item) }));
        router.push({ pathname: '/journey-levels', params: { id: journey.id } });
    }
    catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Could not open this journey.');
    } }
    return <JourneyShell dock>
    <Animated.View entering={entrance()} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={s.eyebrow}>YOUR PLACES. YOUR PROGRESS.</Text>
        <Text accessibilityRole="header" style={s.title}>Journeys</Text>
      </View>
      {previous.length ? <HomePressable accessibilityRole="button" accessibilityLabel="Earlier plans and recordings" onPress={() => setHistoryOpen(true)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' }}>
        <TabIcon name="map" color={palette.green} size={20}/>
      </HomePressable> : null}
    </Animated.View>
    {error || library.error ? <Animated.View entering={entrance(45)} style={s.card}><Text style={s.error}>{error || library.error}</Text><JourneyButton label="Retry" variant="quiet" onPress={() => void library.reload()}/></Animated.View> : null}
    {library.loaded && !journeys.length ? <Animated.View entering={entrance(45)} style={[s.card, s.highlight]}><Text style={s.cardTitle}>Your first journey starts with a place.</Text><Text style={s.subtitle}>Search for ABC or somewhere you’ve been dreaming of.</Text><JourneyButton label="Find a destination" onPress={() => router.navigate('/(tabs)/discover')}/></Animated.View> : null}
    {journeys.length ? <Animated.View entering={entrance(90)}>
      <JourneyDeck journeys={journeys} activeId={library.data.activeId} onOpen={journey => void activate(journey)}/>
    </Animated.View> : null}
    {active ? <Animated.View entering={entrance(140)} style={{ gap: 2 }}>
      <JourneyButton label="Remove this journey from this device" variant="quiet" onPress={() => setRemoveConfirm(v => !v)}/>
      {removeConfirm ? <Animated.View entering={FadeIn.duration(200)} style={{ gap: 8 }}>
        <Text style={s.small}>Remove “{active.template.title}” and its progress? Shared destination research is kept.</Text>
        <JourneyButton label="Remove journey" variant="danger" onPress={() => { void changeJourneys(userId, v => ({ ...v, activeId: null, journeys: v.journeys.filter(item => item.id !== active.id) })).then(() => setRemoveConfirm(false)).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not remove journey.')); }}/>
        <JourneyButton label="Keep journey" variant="quiet" onPress={() => setRemoveConfirm(false)}/>
      </Animated.View> : null}
    </Animated.View> : null}
    <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHandle}/>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 40, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={[s.title, { fontSize: 22 }]}>Earlier journeys</Text>
              <JourneyButton label="Close" variant="quiet" onPress={() => setHistoryOpen(false)}/>
            </View>
            {previous.length ? previous.map((journey, index) => <Animated.View key={journey.id} entering={entrance(Math.min(60 + index * 70, 400))}>
                <HomePressable accessibilityRole="button" accessibilityLabel={`Open ${journey.template.title}`} onPress={() => { setHistoryOpen(false); void activate(journey); }} style={{ height: 350 }}>
                  <JourneyCardFace journey={journey} activeId={library.data.activeId} compact/>
                </HomePressable>
              </Animated.View>) : <Text style={s.subtitle}>No earlier journeys yet.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}
