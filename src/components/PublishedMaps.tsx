import { useState } from 'react';
import { Linking } from 'react-native';
import { Text } from './Typography';
import { Button, Card, Notice, SectionTitle } from './ui';
import type { Place } from '@/services/places/types';
import { colors } from '@/theme/tokens';
export function PublishedMaps({ destination }: { destination: Place }) {
  const [error, setError] = useState('');
  const phulchowki = destination.id === 'osm-reference:node:3490869705' || /phulch|pulchowki/i.test(destination.name);
  const annapurna = /annapurna.*base.*camp/i.test(destination.name);
  const open = async (url: string) => { setError(''); try { await Linking.openURL(url); } catch { setError('Could not open the map. Check your connection.'); } };
  return <Card><SectionTitle title="Map references for your hike" /><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22, marginVertical: 8 }}>Compare the routed line with terrain and published maps. A publisher’s map may describe a different itinerary; it does not verify today’s access or replace your selected route.</Text>
    <Button label="Open terrain map around destination" variant="outline" onPress={() => void open(`https://opentopomap.org/#map=15/${destination.latitude}/${destination.longitude}`)} />
    {phulchowki && <Button label="Phulchowki published route map · Access Nepal" variant="quiet" onPress={() => void open('https://accessnepaltour.com/tour/phulchowki-hike/#route-map')} />}
    {annapurna && <Button label="Annapurna published PDF map · Ambition Himalaya" variant="quiet" onPress={() => void open('https://www.ambitionhimalaya.com/wp-content/uploads/2022/05/Annapurna-Base-Camp-Trek-14-Days-Map.pdf')} />}
    <Notice message={error} />
  </Card>;
}
