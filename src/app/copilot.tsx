import { useRef, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text } from '@/components/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Chip, Field, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { treks } from '@/data/treks';
import { actionError, requestId } from '@/lib/api';
import { writeJSON } from '@/lib/storage';
import { colors } from '@/theme/tokens';
import type { AIPlan } from '@/types/cloud';

export default function CopilotScreen() {
  const params = useLocalSearchParams<{ trek?: string }>(); const cloud = useCloud(); const { answers, userId } = useNavo();
  const [trek, setTrek] = useState(treks.some(t => t.id === params.trek) ? params.trek! : treks[0].id);
  const [days, setDays] = useState('7'); const [goals, setGoals] = useState('Photography and a gradual pace');
  const [plan, setPlan] = useState<AIPlan | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const pending = useRef({ input: '', id: requestId() });
  async function generate() {
    if (lock.current) return;
    if (!/^\d+$/.test(days) || Number(days) < 2 || Number(days) > 30) { setError('Choose 2–30 days.'); return; }
    const input = { trekId: trek, days: Number(days), experience: answers.level ?? 'first-timer', goals, maxDailyAscent: 800, maxDailyDistance: 15 };
    const signature = JSON.stringify(input); if (signature !== pending.current.input) pending.current = { input: signature, id: requestId() };
    lock.current = true; setBusy(true); setError(''); setPlan(null);
    try {
      const result = await cloud.api<AIPlan>('/plans', { ...input, requestId: pending.current.id }); setPlan(result);
      await writeJSON(`ai-plan:${userId}:${trek}`, result);
    } catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><Reveal><Badge label="POWERED BY NEMOTRON · NEBIUS" tone="lime" /><Heading title="A plan worth questioning." subtitle="Navo drafts, checks and asks Nemotron to repair issues. You see the evidence behind each revision." /></Reveal>
    <ScrollView horizontal contentContainerStyle={styles.chips}>{treks.map(t => <Chip key={t.id} label={t.name} selected={trek === t.id} onPress={() => { if (!busy) setTrek(t.id); }} />)}</ScrollView>
    <Field label="Days available" value={days} onChangeText={setDays} inputMode="numeric" editable={!busy} maxLength={2} /><Field label="Goals and constraints" value={goals} onChangeText={setGoals} multiline maxLength={500} editable={!busy} />
    <Notice message={error} /><Button label={busy ? 'Drafting and checking your plan…' : 'Generate with Nemotron'} busy={busy} disabled={!cloud.ready || busy} onPress={() => void generate()} />
    {!cloud.ready && <Text style={styles.copy}>Connect the Navo backend in Groups first. AI needs server-side Nebius configuration.</Text>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.copy}>This can take up to three minutes. Navo makes at most one draft and two repair requests.</Text>}
    {plan && <><SectionTitle title="AI PLAN AUDIT" /><Card><Badge label={plan.status === 'rejected' ? 'PLAN NEEDS REVISION' : 'GUIDE REVIEW REQUIRED'} tone="warning" />{plan.audit.map((entry, index) => <View key={index} style={styles.step}><Text style={styles.title}>{index + 1}. {entry.step === 'draft' ? 'Nemotron draft' : 'Nemotron repair'}</Text><Text style={styles.copy}>{entry.issues.length ? entry.issues.join(' · ') : 'No configured threshold violations found.'}</Text></View>)}<Text style={styles.copy}>Model: {plan.model}</Text>{plan.limitations.map(text => <Text key={text} style={styles.copy}>{text}</Text>)}</Card>
      {plan.itinerary && <><Heading title={plan.itinerary.title} subtitle={plan.itinerary.explanation} />{plan.itinerary.days.map(day => <Card key={day.day}><Badge label={`DAY ${day.day}${day.rest ? ' · REST' : ''}`} tone="lime" /><Text style={styles.title}>{day.start} → {day.end}</Text><Text style={styles.copy}>Model estimate: {day.distanceKm} km · +{day.ascentM} m · sleep {day.sleepingElevationM} m</Text><Text style={styles.copy}>{day.notes}</Text></Card>)}<Notice message={plan.itinerary.emergencyNotes} tone="info" /></>}
      <Button label="Review offline trip pack" onPress={() => router.push({ pathname: '/offline', params: { trek } })} />
    </>}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 16 }, chips: { gap: 8 }, title: { color: colors.ink, fontSize: 19, fontWeight: '700', marginTop: 12 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }, step: { borderBottomColor: colors.line, borderBottomWidth: 1, paddingBottom: 14 } });
