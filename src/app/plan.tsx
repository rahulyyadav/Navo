import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Chip, Field, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { treks } from '@/data/treks';
import { readJSON, writeJSON } from '@/lib/storage';
import { emptyPreparation, essentials, normalizePreparation, trekkingResources, validDepartureDate, type Preparation } from '@/services/preparation';
import { colors, radius } from '@/theme/tokens';

export default function PlanScreen() {
  const { userId } = useNavo();
  const params = useLocalSearchParams<{ trek?: string }>();
  const [trekId, setTrekId] = useState(treks.find(t => t.id === params.trek)?.id ?? treks[0].id);
  const [plan, setPlan] = useState<Preparation>(emptyPreparation);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const trek = treks.find(t => t.id === trekId)!;
  const key = `preparation:${userId}:${trekId}`;
  useEffect(() => {
    let active = true;
    readJSON(key).then(value => { if (active) { setPlan(normalizePreparation(value)); setLoaded(true); } }).catch(() => { if (active) setError('Your saved preparation could not be loaded. Reopen this screen to retry.'); });
    return () => { active = false; };
  }, [key]);
  function change(patch: Partial<Preparation>) { setPlan(current => ({ ...current, ...patch })); setSaved(false); }
  async function save() {
    if (!loaded || lock.current) return false;
    if (!validDepartureDate(plan.date)) { setError('Use a real departure date in YYYY-MM-DD format.'); return false; }
    lock.current = true; setBusy(true); setError('');
    try { await writeJSON(key, plan); setSaved(true); return true; }
    catch { setError('Could not save on this device. Your changes are still on screen; try again.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  async function share() {
    try { await Share.share({ message: `My Navo trek preparation\n${trek.name}\nDeparture: ${plan.date || 'Not set'}\n${plan.checked.length}/${essentials.length} preparation items checked\n${plan.notes}\nApproximate route overview only. Confirm itinerary, conditions and permits with a qualified local guide.` }); }
    catch { setError('Sharing is unavailable on this device.'); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Reveal><Badge label="YOUR TRAIL PREPARATION" tone="lime" /><Heading title="A little planning. A better journey." subtitle="Build a practical checklist for your Nepal trek. Save it on this device before you leave." /></Reveal>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{treks.map(t => <Chip key={t.id} label={t.name} selected={t.id === trekId} onPress={() => { if (!busy && t.id !== trekId) { void save().then(ok => { if (ok) { setLoaded(false); setSaved(false); setError(''); setTrekId(t.id); } }); } }} />)}</ScrollView>
    <Reveal delay={60}><Card><Text style={styles.title}>{trek.name}</Text><Text style={styles.copy}>{trek.days} suggested · up to {trek.maxElevation.toLocaleString()} m · {trek.difficulty}</Text><Text style={styles.copy}>Timing is approximate. Build in acclimatisation and contingency days with your guide.</Text><View style={styles.progress}><View style={[styles.fill, { width: `${plan.checked.length / essentials.length * 100}%` }]} /></View><Text accessibilityLiveRegion="polite" style={styles.count}>{plan.checked.length} of {essentials.length} essentials checked</Text></Card></Reveal>
    <Notice message={error} />
    {loaded && <>
      <Field label="Departure date (optional)" placeholder="YYYY-MM-DD" value={plan.date} maxLength={10} editable={!busy} onChangeText={date => change({ date })} />
      {[...new Set(essentials.map(item => item.section))].map(section => <View key={section} style={styles.section}><SectionTitle title={section.toUpperCase()} />{essentials.filter(item => item.section === section).map(item => {
        const checked = plan.checked.includes(item.id);
        return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: busy }} disabled={busy} onPress={() => change({ checked: checked ? plan.checked.filter(id => id !== item.id) : [...plan.checked, item.id] })} style={({ pressed }) => [styles.check, checked && styles.checked, pressed && { opacity: .7 }]}><Text style={styles.tick}>{checked ? '✓' : '○'}</Text><View style={styles.checkCopy}><Text style={styles.label}>{item.label}</Text><Text style={styles.copy}>{item.detail}</Text></View></Pressable>;
      })}</View>)}
      <Field label="Your route, check-in plan & notes" multiline maxLength={2000} value={plan.notes} editable={!busy} onChangeText={notes => change({ notes })} placeholder="Guide contact, overnight stops, check-in times…" />
      <Button label={saved ? 'Saved on this device ✓' : 'Save preparation'} busy={busy} disabled={busy} onPress={() => void save()} />
      <Button label="Share my plan" variant="outline" onPress={() => void share()} style={styles.section} />
    </>}
    <View style={styles.section}><SectionTitle title="CHECK BEFORE DEPARTURE" />{trekkingResources.map(resource => <Button key={resource.url} label={resource.label} variant="quiet" onPress={() => void Linking.openURL(resource.url).catch(() => setError('Could not open the source. Check your connection.'))} />)}</View>
    <Text style={styles.copy}>Checklist completion is not a safety certification. Saved preparation is local to this device; map tiles and current advisories need internet.</Text>
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 16 }, chips: { gap: 8 }, section: { marginTop: 12 }, title: { color: colors.ink, fontSize: 23, fontWeight: '800' }, copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 }, count: { color: colors.lime, fontSize: 13, fontWeight: '700' }, progress: { height: 6, borderRadius: 3, backgroundColor: colors.slate, marginVertical: 16, overflow: 'hidden' }, fill: { height: 6, backgroundColor: colors.lime }, check: { flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 16, marginBottom: 10, backgroundColor: colors.navy }, checked: { borderColor: 'rgba(228,255,137,.4)' }, checkCopy: { flex: 1 }, tick: { color: colors.lime, fontSize: 24 }, label: { color: colors.ink, fontSize: 15, fontWeight: '700' } });
