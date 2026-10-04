import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Chip, Heading, Notice, SectionTitle } from '@/components/ui';
import { TrekCard } from '@/components/TrekCard';
import { useTripLibrary } from '@/hooks/useTripLibrary';
import { treks } from '@/data/treks';
import { colors } from '@/theme/tokens';
import { npr, tripBudget } from '@/services/trip-library';

export default function TripsScreen() {
  const library = useTripLibrary();
  const params = useLocalSearchParams<{ section?: string }>();
  const [tab, setTab] = useState(params.section === 'saved' ? 'Saved treks' : params.section === 'activity' ? 'Activity' : 'Plans');
  return <Backdrop><ScrollView contentContainerStyle={styles.page}>
    <Badge label="YOUR OWN LITTLE ESCAPE" tone="lime" /><Heading title="Outside starts here." subtitle="Your plans, saved places and recorded walks. Available on this device, for this account." />
    <View style={styles.row}>{['Plans', 'Saved treks', 'Activity'].map(label => <Chip key={label} label={label} selected={tab === label} onPress={() => setTab(label)} />)}</View>
    <Notice message={library.error} />{Boolean(library.error) && <Button label="Retry saved trips" variant="outline" onPress={() => void library.reload()} />}
    {!library.loaded && !library.error && <Text style={styles.copy}>Opening your trip library…</Text>}
    {tab === 'Plans' && <><Button label="Plan a day outside" onPress={() => router.push('/day-hike')} />
      {library.loaded && library.data.trips.length === 0 && <Card><SectionTitle title="YOUR FIRST PLAN" /><Text style={styles.copy}>Pick a meeting point and a day. Save it privately, add transport and stay notes, then invite a group when connected.</Text></Card>}
      {library.data.trips.map(trip => <Pressable key={trip.id} accessibilityRole="button" accessibilityLabel={'Open ' + trip.name} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}><Card><Badge label={trip.date + ' · ' + trip.time + ' NPT'} tone="lime" /><Text style={styles.title}>{trip.name}</Text><Text style={styles.copy}>{trip.meeting}</Text><Text style={styles.copy}>{trip.people} people planned · {trip.walkingHours} walking hours</Text><Text style={styles.link}>{npr(tripBudget(trip).spent)} logged · Open plan →</Text></Card></Pressable>)}
    </>}
    {tab === 'Saved treks' && <>{library.loaded && !library.data.savedTrekIds.length && <Card><Text style={styles.title}>Keep a place in mind.</Text><Text style={styles.copy}>Open a trek and tap Save trek. Your shortlist will appear here.</Text><Button label="Explore treks" variant="quiet" onPress={() => router.push('/(tabs)/discover')} /></Card>}{treks.filter(t => library.data.savedTrekIds.includes(t.id)).map(trek => <TrekCard key={trek.id} trek={trek} onPress={() => router.push({ pathname: '/trek/[id]', params: { id: trek.id } })} />)}</>}
    {tab === 'Activity' && <><Button label="Record a hike" onPress={() => router.push('/record-hike')} />{library.loaded && !library.data.activities.length && <Text style={styles.copy}>Your saved distance and active time will appear here after a recorded walk.</Text>}{library.data.activities.map(item => <Card key={item.id}><Badge label="RECORDED WALK" tone="lime" /><Text style={styles.title}>{item.name}</Text><Text style={styles.copy}>{new Date(item.finishedAt).toLocaleDateString()} · {(item.distanceM / 1000).toFixed(2)} km · {Math.round(item.activeSeconds / 60)} active min</Text><Text style={styles.copy}>GPS estimate · {item.samples} accepted fixes · no background segments recorded.</Text></Card>)}</>}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 18, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 10 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 8 }, link: { color: colors.lime, marginTop: 14, fontWeight: '600' } });
