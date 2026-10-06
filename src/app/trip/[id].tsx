import { Text } from '@/components/Typography';
import { usePageLayout } from '@/hooks/usePageLayout';
import { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Field, Heading, Notice, SectionTitle } from '@/components/ui';
import { useTripLibrary } from '@/hooks/useTripLibrary';
import { type PersonalTrip, npr, parseNPR, tripBudget } from '@/services/trip-library';
import { directionsURL, finishTime } from '@/services/day-hike';
import { requestId } from '@/lib/api';
import { colors } from '@/theme/tokens';

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const library = useTripLibrary();
  const trip = library.data.trips.find(item => item.id === id);
  if (!trip) return <Backdrop><View style={styles.page}><Heading title={library.loaded ? 'Plan not found' : 'Opening your plan…'} subtitle={library.error || 'Saved plans belong to the account and device that created them.'} /><Button label="Your trips" onPress={() => router.replace('/trips')} /></View></Backdrop>;
  return <TripDetails key={trip.id} trip={trip} library={library} />;
}
function TripDetails({ trip, library }: { trip: PersonalTrip; library: ReturnType<typeof useTripLibrary> }) {
  const layout = usePageLayout();
  const [returnNotes, setReturnNotes] = useState(trip.returnNotes); const [stayNotes, setStayNotes] = useState(trip.stayNotes);
  const [budget, setBudget] = useState(String(trip.budgetPaisa / 100)); const [expense, setExpense] = useState(''); const [amount, setAmount] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [remove, setRemove] = useState(false);
  const locked = useRef(false);
  const totals = tripBudget(trip);
  const finish = trip.approachMinutes === null ? null : finishTime(trip.date, trip.time, trip.walkingHours, trip.approachMinutes);
  async function change(edit: (current: PersonalTrip) => PersonalTrip) {
    if (locked.current) return; locked.current = true; setBusy(true); setMessage('');
    try {
      await library.update(data => { if (!data.trips.some(item => item.id === trip.id)) throw new Error('Plan removed'); return { ...data, trips: data.trips.map(item => item.id === trip.id ? { ...edit(item), updatedAt: new Date().toISOString() } : item) }; });
      setMessage('Saved on this device.'); setExpense(''); setAmount('');
    } catch { setMessage('Could not save. Your existing plan is unchanged. Check device storage and retry.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function directions(mode: 'driving' | 'transit') { try { await Linking.openURL(directionsURL(trip.meeting, trip.origin, mode)); } catch { setMessage('Could not open maps. Try your map app using the meeting place above.'); } }
  return <Backdrop><ScrollView contentContainerStyle={[styles.page, layout.page]} keyboardShouldPersistTaps="handled">
    <Badge label="YOUR TRIP · SAVED ON THIS DEVICE" tone="lime" /><Heading title={trip.name} subtitle={trip.date + ' · depart ' + trip.time + ' NPT'} />
    <Card><SectionTitle title="THE DAY AT A GLANCE" /><Text style={styles.title}>{trip.origin || 'Starting place not set'} → {trip.meeting}</Text><Text style={styles.copy}>{trip.people} people planned · {trip.walkingHours} walking hours</Text><Text style={styles.copy}>{trip.approachMinutes === null ? 'Approach time not added' : trip.approachMinutes + ' min planned approach'}{finish ? '\nBack at trailhead ≈ ' + finish + ' NPT' : ''}</Text><Text style={styles.copy}>This is your personal plan. Group membership and a booking are not created by saving it.</Text></Card>
    <Card><SectionTitle title="GET THERE & COME HOME" /><Text style={styles.copy}>Open Google Maps with this plan’s start and meeting place. Confirm the last bus or a return pickup locally.</Text><Button label="Road / cab directions" variant="outline" onPress={() => void directions('driving')} /><Button label="Transit options" variant="quiet" onPress={() => void directions('transit')} /><Field label="Return transport and turnaround plan" value={returnNotes} onChangeText={setReturnNotes} multiline maxLength={1000} placeholder="Pickup point, latest turnaround time, last bus…" /></Card>
    <Card><SectionTitle title="SOMEWHERE TO REST" /><Field label="Stay details / confirmation notes" value={stayNotes} onChangeText={setStayNotes} multiline maxLength={1000} placeholder="Lodge name, contact and details you confirmed" /><Text style={styles.copy}>Keep arrangements here after confirming directly with the property.</Text></Card>
    <Card><SectionTitle title="TRIP BUDGET · NPR" /><Text style={styles.total}>{npr(totals.spent)}</Text><Text style={styles.copy}>Logged expenses · {npr(totals.perPerson)} each if split equally</Text><Badge label={totals.remaining < 0 ? npr(-totals.remaining) + ' over budget' : npr(totals.remaining) + ' remaining'} tone={totals.remaining < 0 ? 'warning' : 'lime'} /><Field label="Total budget · rupees" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" maxLength={11} /><Button label="Save arrangements & budget" busy={busy} disabled={busy} onPress={() => { const paisa = parseNPR(budget); if (paisa === null) { setMessage('Enter a valid NPR budget with at most two decimal places.'); return; } void change(current => ({ ...current, returnNotes, stayNotes, budgetPaisa: paisa })); }} />
    </Card>
    <Notice message={message || library.error} />
    <Card><SectionTitle title="ADD AN EXPENSE" /><Field label="What was it for?" value={expense} onChangeText={setExpense} maxLength={100} placeholder="Bus, food, guide, stay…" /><Field label="Amount · NPR" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={11} /><Button label="Add to expense log" variant="outline" disabled={busy} onPress={() => { const paisa = parseNPR(amount); if (!expense.trim() || paisa === null || paisa <= 0) { setMessage('Add an expense name and an amount greater than zero.'); return; } const entry = { id: requestId(), label: expense.trim(), paisa }; void change(current => { if (current.expenses.length >= 100) throw new Error('Expense limit reached'); return { ...current, expenses: [...current.expenses, entry] }; }); }} /><Text style={styles.copy}>This is a personal expense log. It does not charge a card or transfer money.</Text>{trip.expenses.map(item => <View key={item.id} style={styles.expense}><Text style={styles.title}>{item.label}</Text><Text style={styles.copy}>{npr(item.paisa)}</Text><Button label={'Remove ' + item.label} variant="quiet" disabled={busy} onPress={() => void change(current => ({ ...current, expenses: current.expenses.filter(e => e.id !== item.id) }))} /></View>)}</Card>
    <Button label="Record this hike" onPress={() => router.push({ pathname: '/record-hike', params: { name: trip.name } })} />
    <Button label="Remove saved plan" variant="quiet" disabled={busy} onPress={() => setRemove(true)} />{remove && <Card><Text style={styles.copy}>Remove this personal plan and its expense log from this device? This does not cancel a group or a reservation.</Text><Button label="Keep plan" variant="outline" onPress={() => setRemove(false)} /><Button label="Confirm remove plan" variant="danger" busy={busy} disabled={busy} onPress={() => { setBusy(true); void library.update(data => ({ ...data, trips: data.trips.filter(item => item.id !== trip.id) })).then(() => router.replace('/trips')).catch(() => { setMessage('Could not remove this plan. Please retry.'); setBusy(false); }); }} /></Card>}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 18, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, title: { color: colors.ink, fontSize: 19, fontWeight: '600', lineHeight: 27 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 10 }, total: { color: colors.lime, fontSize: 32, fontWeight: '700', marginBottom: 10 }, expense: { borderTopWidth: 1, borderColor: colors.line, marginTop: 14, paddingTop: 14 } });
