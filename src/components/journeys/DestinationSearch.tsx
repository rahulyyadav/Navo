import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/Typography';
import { Field } from '@/components/ui';
import { searchPlaces } from '@/services/places/search';
import { cataloguePoint, matchingDestinations, queryMatchesPlaceName } from '@/services/journeys/catalogue';
import type { JourneyPoint } from '@/services/journeys/types';
import type { Place } from '@/services/places/types';
import { useJourneyStyles } from './journey-styles';
import { SetupField } from './SetupUI';
import { useSetupStyles } from './setup-styles';
import { useTheme } from '@/context/ThemeContext';
export function DestinationSearch({ onSelect, label = 'Where do you want to go?', catalogue = true, light = false }: {
    onSelect: (point: JourneyPoint) => void;
    label?: string;
    catalogue?: boolean;
    light?: boolean;
}) {
    const s = useJourneyStyles();
    const lightStyles = useSetupStyles();
    const { palette } = useTheme();
    const setupGreen = palette.green;
    const [query, setQuery] = useState('');
    const [remote, setRemote] = useState<{
        query: string;
        items: Place[];
        busy: boolean;
        error: string;
    }>({ query: '', items: [], busy: false, error: '' });
    useEffect(() => {
        if (query.trim().length < 2)
            return;
        const abort = new AbortController();
        const timer = setTimeout(() => {
            setRemote({ query, items: [], busy: true, error: '' });
            void searchPlaces(query, { signal: abort.signal }).then(items => { if (!abort.signal.aborted)
                setRemote({ query, items, busy: false, error: '' }); }).catch(() => { if (!abort.signal.aborted)
                setRemote({ query, items: [], busy: false, error: 'Place search is unavailable. Try again or choose a saved destination.' }); });
        }, 400);
        return () => { clearTimeout(timer); abort.abort(); };
    }, [query]);
    const local = catalogue ? matchingDestinations(query).map(cataloguePoint) : [];
    // A mapped feature's region is context, not its identity. This prevents a
    // broad query such as "Annapurna" from showing Poon Hill as if it were the
    // requested destination when the canonical ABC result is available.
    const other = remote.query === query ? remote.items.filter(p => queryMatchesPlaceName(query, p) && !local.some(l => l.name.toLowerCase() === p.name.toLowerCase())) : [];
    const Input = light ? SetupField : Field;
    return <View style={{ gap: 12 }}><Input label={label} placeholder={catalogue ? 'ABC, Mardi Himal, or another destination…' : 'Search a city, village or starting place…'} value={query} onChangeText={setQuery} autoFocus={light} autoCorrect={false} maxLength={100}/>
    {remote.query === query && remote.busy ? <ActivityIndicator accessibilityLabel="Searching destinations" color={light ? setupGreen : palette.green}/> : null}
    {[...local, ...other].slice(0, 8).map(point => { const mapped = point as Place; const journeyPoint = point as JourneyPoint; const isMapped = typeof mapped.fullName === 'string'; return <Pressable key={point.id} accessibilityRole="button" accessibilityLabel={`Choose ${point.name}`} onPress={() => onSelect({ id: point.id, name: point.name, latitude: point.latitude, longitude: point.longitude, ...(isMapped ? { fullName: mapped.fullName, region: mapped.region, country: mapped.country, placeType: 'placeType' in point ? point.placeType : mapped.type, provider: 'provider' in point ? journeyPoint.provider : mapped.provider, providerId: 'providerId' in point ? journeyPoint.providerId : mapped.id } : {}) , ...('canonicalId' in point && journeyPoint.canonicalId ? { canonicalId: journeyPoint.canonicalId } : {}), ...('destinationMeaning' in point && journeyPoint.destinationMeaning ? { destinationMeaning: journeyPoint.destinationMeaning } : {}) })} style={({ pressed }) => [light ? lightStyles.card : s.card, { padding: 16, opacity: pressed ? 0.7 : 1 }]}><View style={s.row}><View style={{ flex: 1, gap: 4 }}><Text style={light ? lightStyles.choiceTitle : s.text}>{point.name}</Text><Text style={light ? lightStyles.small : s.small}>{isMapped ? mapped.fullName : 'Trek destination'}</Text></View><Text style={light ? lightStyles.originTitle : s.text}>↗</Text></View></Pressable>; })}
    {remote.query === query && !remote.busy && Boolean(remote.error) ? <Text style={light ? lightStyles.error : s.error}>{remote.error}</Text> : null}
    {query.length >= 2 && remote.query === query && !remote.busy && !remote.error && !local.length && !other.length ? <Text style={light ? lightStyles.muted : s.subtitle}>No matching place. Try adding the region or country.</Text> : null}
  </View>;
}
