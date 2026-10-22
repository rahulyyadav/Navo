import { toJourneyPoint } from '@/services/journeys/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, interpolateColor, LinearTransition, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Text, TextInput } from '@/components/Typography';
import { TabIcon } from '@/components/TabIcon';
import { TopStatusBackdrop } from '@/components/TopStatusBackdrop';
import { NavoBrand } from '@/components/NavoBrand';
import { useNavo } from '@/context/NavoContext';
import { useJourneys } from '@/hooks/useJourneys';
import { treks } from '@/data/treks';
import { discoverTreks, destinationForTrek } from '@/services/trail-discovery';
import { cataloguePoint, journeyDestinations, matchingDestinations, queryMatchesPlaceName } from '@/services/journeys/catalogue';
import { searchPlaces } from '@/services/places/search';
import type { JourneyPoint } from '@/services/journeys/types';
import type { Place } from '@/services/places/types';
import { HomePressable } from './HomeMotion';
import { useHomeStyles } from './home-styles';
import { useTheme } from '@/context/ThemeContext';

const entrance = (delay = 0) => FadeInDown.duration(380).delay(delay).reduceMotion(ReduceMotion.System);
const transition = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);

function HomeIcon({ name }: { name: 'search' | 'filter' | 'close' }) {
  const { palette } = useTheme();
  const green = palette.green;
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === 'search' ? <Path d="M20 20l-4.5-4.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/> : name === 'filter' ? <Path d="M4 4h16l-6 7v8l-4 2V11Z"/> : <Path d="m6 6 12 12M6 18 18 6"/>}
  </Svg>;
}

export function JourneyHome() {
  const s = useHomeStyles();
  const { palette, scheme } = useTheme();
  const green = palette.green;
  useFocusEffect(useCallback(() => {
    StatusBar.setStyle(scheme === 'dark' ? 'light' : 'dark');
    return () => StatusBar.setStyle('light');
  }, [scheme]));
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const imageHeight = Math.round(Math.max(1, Math.min(width, 660) - Math.max(insets.left, 22) - Math.max(insets.right, 22) - 32) / 1.6);
  const { answers, profile } = useNavo();
  const journeys = useJourneys();
  const active = journeys.data.journeys.find(j => j.id === journeys.data.activeId);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('Any difficulty');
  const [region, setRegion] = useState('All regions');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remote, setRemote] = useState<{ query: string; items: Place[]; busy: boolean; error: string }>({ query: '', items: [], busy: false, error: '' });
  const fullName = profile?.fullName || answers.fullName || '';
  const initials = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'N';
  const applied = Number(difficulty !== 'Any difficulty') + Number(region !== 'All regions');
  const results = useMemo(() => discoverTreks(treks, query, region, difficulty), [query, region, difficulty]);
  const searchFocus = useSharedValue(0);
  const searchMotion = useAnimatedStyle(() => ({
    borderColor: interpolateColor(searchFocus.value, [0, 1], [palette.border, green]),
    backgroundColor: interpolateColor(searchFocus.value, [0, 1], [palette.search, palette.searchFocus]),
    transform: [{ translateY: -searchFocus.value * 1.5 }],
  }));

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setRemote({ query, items: [], busy: true, error: '' });
      void searchPlaces(query, { signal: controller.signal }).then(items => {
        if (!controller.signal.aborted) setRemote({ query, items, busy: false, error: '' });
      }).catch(() => {
        if (!controller.signal.aborted) setRemote({ query, items: [], busy: false, error: 'Place search is unavailable. You can still explore the trek overviews.' });
      });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function choose(place: JourneyPoint | Place) {
    // Photon results carry provider-only fields; send only the stable journey
    // point contract while retaining human-readable geography for research.
    const destination: JourneyPoint = {
      id: place.id,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      ...('fullName' in place && typeof place.fullName === 'string' ? { fullName: place.fullName } : {}),
      ...('region' in place && typeof place.region === 'string' ? { region: place.region } : {}),
      ...('country' in place && typeof place.country === 'string' ? { country: place.country } : {}),
      ...('type' in place && typeof place.type === 'string' ? { placeType: place.type } : {}),
      ...('provider' in place && place.provider ? { provider: place.provider, providerId: 'id' in place ? place.id : undefined } : {}),
      ...('canonicalId' in place && typeof place.canonicalId === 'string' ? { canonicalId: place.canonicalId } : {}),
      ...('destinationMeaning' in place && typeof place.destinationMeaning === 'string' ? { destinationMeaning: place.destinationMeaning } : {}),
    };
    router.push({ pathname: '/journey-setup', params: { destination: JSON.stringify(toJourneyPoint(destination)) } });
  }
  const localMapped = useMemo(() => matchingDestinations(query).map(cataloguePoint), [query]);
  const mappedPlaces = useMemo(() => {
    const remoteItems = remote.query === query ? remote.items.filter(point => queryMatchesPlaceName(query, point)) : [];
    return [...localMapped, ...remoteItems.filter(point => !localMapped.some(local => local.name.toLowerCase() === point.name.toLowerCase()))].slice(0, 8);
  }, [localMapped, query, remote.items, remote.query]);
  function reset() { setQuery(''); setDifficulty('Any difficulty'); setRegion('All regions'); }

  return <View style={s.page}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 22, paddingBottom: Math.max(insets.bottom, 20) + 110, paddingLeft: Math.max(insets.left, 22), paddingRight: Math.max(insets.right, 22) }]}>
      <Animated.View entering={entrance()} style={s.header}>
        <NavoBrand/>
        <View style={s.headerActions}>
          <HomePressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.navigate('/(tabs)/profile')} style={s.avatar}><Text style={s.initials}>{initials}</Text></HomePressable>
        </View>
      </Animated.View>
      <Animated.View entering={entrance(45)} style={[s.search, searchMotion]}>
        <HomeIcon name="search"/><TextInput accessibilityLabel="Search trails or places" placeholder="Find a trail or destination…" placeholderTextColor={palette.faint} value={query} onChangeText={setQuery} autoCorrect={false} maxLength={100} onFocus={() => { searchFocus.value = withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System }); }} onBlur={() => { searchFocus.value = withTiming(0, { duration: 180, reduceMotion: ReduceMotion.System }); }} style={s.searchInput}/>
        <View style={s.searchTools}>
        {query ? <HomePressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={s.clear}><HomeIcon name="close"/></HomePressable> : null}
        <HomePressable accessibilityRole="button" accessibilityLabel={`Filters${applied ? `, ${applied} active` : ''}`} onPress={() => setFiltersOpen(true)} style={[s.searchFilter, applied > 0 && s.searchFilterActive]}><HomeIcon name="filter"/></HomePressable>
        </View>
      </Animated.View>
      {query.trim().length >= 2 ? <Animated.View entering={entrance(90)} style={s.placeSection}>
        <Text style={s.cardTitle}>Search mapped places</Text>
        {remote.query === query && remote.busy ? <ActivityIndicator color={green} accessibilityLabel="Searching mapped places"/> : null}
        {remote.query === query && remote.error ? <Text style={s.error}>{remote.error}</Text> : null}
         {remote.query === query && !remote.busy && !remote.error ? mappedPlaces.map(point => <HomePressable key={point.id} accessibilityRole="button" accessibilityLabel={`Plan a journey to ${point.name}`} onPress={() => choose(point)} style={s.place}><TabIcon name="pin" color={green}/><View style={{ flex: 1, gap: 3 }}><Text style={s.greenCopy}>{point.name}</Text><Text style={s.meta}>{point.fullName || ('region' in point ? point.region : '')}</Text></View><Text style={s.greenCopy}>↗</Text></HomePressable>) : null}
         {remote.query === query && !remote.busy && !remote.error && !mappedPlaces.length ? <Text style={s.meta}>No mapped place matched yet. Add its region or country, or choose a trek overview below.</Text> : null}
      </Animated.View> : null}
      <Animated.View entering={entrance(105)} style={s.hero}>
        <Text style={s.eyebrow}>A LITTLE FURTHER. A LITTLE FREER.</Text>
        <Text accessibilityRole="header" style={s.title}>Find your route<Text style={{ color: green }}>.</Text></Text>
      </Animated.View>
      {active ? <Animated.View entering={entrance(125)}><HomePressable accessibilityRole="button" onPress={() => router.push({ pathname: '/journey-levels', params: { id: active.id } })} style={s.resume}>
        <View style={{ flex: 1, gap: 5 }}><Text style={s.eyebrow}>{active.phase === 'completed' ? 'YOUR LAST JOURNEY' : 'YOUR CURRENT JOURNEY'}</Text><Text style={s.cardTitle}>{active.template.title}</Text><Text style={s.meta}>{active.preferences.origin.name} · {active.preferences.startDate}</Text><Text style={s.greenCopy}>{active.phase === 'travelling' || active.phase === 'paused' ? 'Resume journey' : 'View journey'} →</Text></View><TabIcon name="route" color={green}/>
      </HomePressable></Animated.View> : null}
      {journeys.error ? <View style={s.notice}><Text style={s.error}>{journeys.error}</Text><HomePressable accessibilityRole="button" onPress={() => void journeys.reload()} style={s.retry}><Text style={s.greenCopy}>Retry saved journey</Text></HomePressable></View> : null}
      {applied ? <View style={s.activeFilters}>{[region, difficulty].filter(value => value !== 'All regions' && value !== 'Any difficulty').map(value => <HomePressable key={value} accessibilityRole="button" accessibilityLabel={`Remove ${value} filter`} onPress={() => value === region ? setRegion('All regions') : setDifficulty('Any difficulty')} style={s.selectedChip}><Text style={s.greenCopy}>{value} ×</Text></HomePressable>)}</View> : null}
      {!results.length ? <Animated.View entering={entrance()} style={s.empty}><TabIcon name="compass" color={green} size={32}/><Text style={s.cardTitle}>A different trail awaits</Text><Text style={s.subtitle}>Try another destination or adjust your filters.</Text><HomePressable accessibilityRole="button" onPress={reset} style={s.retry}><Text style={s.greenCopy}>Show all routes →</Text></HomePressable></Animated.View> : null}
      {results.map((trek, index) => {
        const destination = journeyDestinations.find(point => point.id === trek.id) ?? destinationForTrek(trek);
        return <Animated.View key={trek.id} entering={entrance(Math.min(index * 55, 165))} layout={transition} style={s.card}>
          <HomePressable accessibilityRole="button" accessibilityLabel={`View ${trek.name} overview`} onPress={() => router.push({ pathname: '/trek/[id]', params: { id: trek.id } })} style={s.cardPreview}>
            <View style={s.imageWrap}>
              <Image source={trek.image} accessibilityLabel={`${trek.name}, ${trek.region}`} resizeMode="cover" style={[s.image, { height: imageHeight }]}/>
            </View>
            <View style={s.cardHeading}><Text style={s.cardTitle}>{trek.name}</Text><Text style={s.altitude}>{trek.maxElevation.toLocaleString()} m</Text></View>
            <Text style={s.meta}>{trek.region}, Nepal</Text>
            <View style={s.details}><Text style={s.meta}>{trek.difficulty}</Text><View style={s.dot}/><Text style={s.meta}>{trek.days}</Text><View style={s.dot}/><Text style={s.meta}>{trek.route.length} reference stops</Text></View>
          </HomePressable>
          <View style={s.cardActions}>
            <HomePressable accessibilityRole="button" accessibilityLabel={`Plan ${trek.name}`} disabled={!destination} onPress={() => { if (destination) choose(destination); }} style={s.primary}><Text style={s.primaryText}>Plan journey</Text><Text style={s.primaryArrow}>↗</Text></HomePressable>
          </View>
        </Animated.View>;
      })}
      <Text style={s.reference}>Trek overviews are planning references. Review a verified walking route before heading out.</Text>
    </ScrollView>
    <TopStatusBackdrop topInset={insets.top}/>
    <Modal visible={filtersOpen} transparent animationType="none" onRequestClose={() => setFiltersOpen(false)}>
      <View style={s.modalBackdrop}><HomePressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={s.dismiss}/><Animated.View entering={entrance()} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 22) }]}>
        <View style={s.sheetHandle}/><View style={s.resultsHeader}><Text accessibilityRole="header" style={s.sheetTitle}>Find your kind of trail</Text><HomePressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={s.clear}><HomeIcon name="close"/></HomePressable></View>
        <ScrollView contentContainerStyle={{ gap: 18 }}><Text style={s.cardTitle}>Difficulty</Text><View style={s.activeFilters}>{['Any difficulty', 'Moderate', 'Challenging', 'Strenuous'].map(value => <HomePressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === difficulty }} onPress={() => setDifficulty(value)} style={[s.chip, difficulty === value && s.selectedChip]}><Text style={[s.chipText, difficulty === value && s.selectedText]}>{value}</Text></HomePressable>)}</View>
          <Text style={s.cardTitle}>Region</Text><View style={s.activeFilters}>{['All regions', ...new Set(treks.map(trek => trek.region))].map(value => <HomePressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === region }} onPress={() => setRegion(value)} style={[s.chip, region === value && s.selectedChip]}><Text style={[s.chipText, region === value && s.selectedText]}>{value}</Text></HomePressable>)}</View></ScrollView>
        <View style={s.cardActions}><HomePressable accessibilityRole="button" onPress={() => { setDifficulty('Any difficulty'); setRegion('All regions'); }} style={s.textButton}><Text style={s.greenCopy}>Reset</Text></HomePressable><HomePressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} style={s.primary}><Text style={s.primaryText}>Show {results.length} {results.length === 1 ? 'route' : 'routes'}</Text></HomePressable></View>
      </Animated.View></View>
    </Modal>
  </View>;
}
