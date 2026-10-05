import { useRef, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Chip, Field, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { CloudStatus } from '@/components/CloudStatus';
import { usePageLayout } from '@/hooks/usePageLayout';
import { useCloud } from '@/context/CloudContext';
import { useNavo } from '@/context/NavoContext';
import { treks } from '@/data/treks';
import { actionError, requestId } from '@/lib/api';
import { writeJSON } from '@/lib/storage';
import { colors } from '@/theme/tokens';
import type { AIPlan } from '@/types/cloud';

export default function CopilotScreen() {
  const layout = usePageLayout();
  const params = useLocalSearchParams<{ trek?: string }>(); const cloud = useCloud(); const { answers, userId } = useNavo();
  const [trek, setTrek] = useState(treks.some(t => t.id === params.trek) ? params.trek! : treks[0].id);
  const [days, setDays] = useState('7'); const [goals, setGoals] = useState('Photography and a gradual pace');
  const [ascent, setAscent] = useState('800'); const [distance, setDistance] = useState('15');
  const [showEvidence, setShowEvidence] = useState(false);
  const [plan, setPlan] = useState<AIPlan | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const pending = useRef({ input: '', id: requestId() });
  async function generate(demonstrateRepair = false) {
    if (lock.current) return;
    if (!/^\d+$/.test(days) || Number(days) < 2 || Number(days) > 30) { setError('Choose 2–30 days.'); return; }
    if (!/^\d+$/.test(ascent) || Number(ascent) < 200 || Number(ascent) > 1200 || !distance.trim() || !Number.isFinite(Number(distance)) || Number(distance) < 3 || Number(distance) > 25) { setError('Choose 200–1,200 m daily ascent and 3–25 km daily distance. These are planning limits, not verified trail measurements.'); return; }
    const input = { trekId: trek, days: Number(days), experience: answers.level ?? 'first-timer', goals, maxDailyAscent: Number(ascent), maxDailyDistance: Number(distance), demonstrateRepair };
    const signature = JSON.stringify(input); if (signature !== pending.current.input) pending.current = { input: signature, id: requestId() };
    lock.current = true; setBusy(true); setError(''); setPlan(null);
    try {
      const result = await cloud.api<AIPlan>('/plans', { ...input, requestId: pending.current.id }); setPlan(result);
      try { await writeJSON(`ai-plan:${userId}:${trek}`, result); } catch { setError('Your plan is shown below, but could not be saved on this device. Retry storage before going offline.'); }
    } catch (failure) { setError(actionError(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Backdrop><ScrollView contentContainerStyle={[styles.scroll, layout.page]} keyboardShouldPersistTaps="handled"><Reveal><Badge label="POWERED BY NEMOTRON · NEBIUS" tone="lime" /><Heading title="A plan worth questioning." subtitle="Navo drafts, checks and asks Nemotron to repair issues. You see the evidence behind each revision." /></Reveal>
    {!cloud.ready && <Card><SectionTitle title="KEEP PLANNING TODAY" /><Text style={styles.copy}>AI generation needs Navo’s connected model service. Build a personal day-hike plan now without waiting for email verification.</Text><Button label="Build a personal hike plan" onPress={() => router.push('/day-hike')} /><CloudStatus /></Card>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{treks.map(t => <Chip key={t.id} label={t.name} selected={trek === t.id} onPress={() => { if (!busy) { setTrek(t.id); setPlan(null); } }} />)}</ScrollView>
    <Field label="Days available" value={days} onChangeText={value => { setDays(value); setPlan(null); }} inputMode="numeric" editable={!busy} maxLength={2} /><Field label="Goals and constraints" value={goals} onChangeText={value => { setGoals(value); setPlan(null); }} multiline maxLength={500} editable={!busy} />
    <Card><SectionTitle title="YOUR PLANNING LIMITS" /><Text style={styles.copy}>Navo checks the model’s proposal against these limits and the supplied route stops. Distances remain model estimates until a verified trail is available.</Text><Field label="Maximum ascent per day · metres" value={ascent} onChangeText={value => { setAscent(value); setPlan(null); }} inputMode="numeric" maxLength={4} editable={!busy} /><Field label="Maximum distance per day · kilometres" value={distance} onChangeText={value => { setDistance(value); setPlan(null); }} inputMode="decimal" maxLength={4} editable={!busy} /></Card>
    <Notice message={error} /><Button label={busy ? 'Drafting and checking your plan…' : 'Generate with Nemotron'} busy={busy} disabled={!cloud.ready || busy} onPress={() => void generate()} />
    {process.env.EXPO_PUBLIC_ENABLE_DEMO === 'true' && <Button label="Demo · inject an ascent issue and repair" variant="outline" disabled={busy || !cloud.ready} onPress={() => void generate(true)} />}
    {!cloud.ready && <Text style={styles.copy}>AI generation becomes available when your account and Navo’s model service are connected.</Text>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.copy}>This can take up to three minutes. Navo makes at most one draft and two repair requests.</Text>}
    {plan && <>{plan.evidence && <Card><SectionTitle title="WHAT THE CHECKS FOUND" /><Text style={styles.title}>{plan.evidence.initialIssueCount} initial issues → {plan.evidence.finalIssueCount} remaining</Text><Text style={styles.copy}>{plan.evidence.attempts} draft/repair attempts · {(plan.evidence.elapsedMs / 1000).toFixed(1)} seconds. These counts measure configured checks, not real-world safety.</Text><Button label={showEvidence ? 'Hide model run details' : 'View model run details'} variant="quiet" onPress={() => setShowEvidence(value => !value)} />{showEvidence && <><Badge label={plan.evidence.liveInference ? 'LIVE INFERENCE RESULT' : 'TEST ADAPTER · NOT LIVE AI'} tone={plan.evidence.liveInference ? 'lime' : 'warning'} /><Text style={styles.copy}>{plan.evidence.provider} · generated {new Date(plan.evidence.generatedAt).toLocaleString()}</Text>{plan.evidence.calls.map((call, index) => <Text key={index} style={styles.copy}>Call {index + 1}: {call.model}{'\n'}{(call.elapsedMs / 1000).toFixed(1)} s · input {call.promptTokens ?? 'unreported'} tokens · output {call.completionTokens ?? 'unreported'} tokens</Text>)}</>}</Card>}<SectionTitle title="AI PLAN AUDIT" /><Card><Badge label={plan.status === 'rejected' ? 'PLAN NEEDS REVISION' : 'GUIDE REVIEW REQUIRED'} tone="warning" />{plan.audit.map((entry, index) => <View key={index} style={styles.step}><Text style={styles.title}>{index + 1}. {entry.step === 'draft' ? 'Nemotron draft' : 'Nemotron repair'}</Text>{entry.simulatedFault && <Badge label="DEMO · INJECTED ASCENT ERROR" tone="warning" />}<Text style={styles.copy}>{entry.changedDays?.length ? 'Revised days: ' + entry.changedDays.join(', ') : ''}</Text><Text style={styles.copy}>{entry.issues.length ? entry.issues.join(' · ') : 'No configured threshold violations found.'}</Text></View>)}<Text style={styles.copy}>Model: {plan.model}</Text>{plan.limitations.map(text => <Text key={text} style={styles.copy}>{text}</Text>)}</Card>
      {plan.itinerary && <><Heading title={plan.itinerary.title} subtitle={plan.itinerary.explanation} />{plan.itinerary.days.map(day => <Card key={day.day}><Badge label={`DAY ${day.day}${day.rest ? ' · REST' : ''}`} tone="lime" /><Text style={styles.title}>{day.start} → {day.end}</Text><Text style={styles.copy}>Model estimate: {day.distanceKm} km · +{day.ascentM} m · sleep {day.sleepingElevationM} m</Text><Text style={styles.copy}>{day.notes}</Text></Card>)}<Notice message={plan.itinerary.emergencyNotes} tone="info" /></>}
      <Button label="Review offline trip pack" onPress={() => router.push({ pathname: '/offline', params: { trek } })} />
    </>}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 16 }, chips: { gap: 8 }, title: { color: colors.ink, fontSize: 19, fontWeight: '700', marginTop: 12 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }, step: { borderBottomColor: colors.line, borderBottomWidth: 1, paddingBottom: 14 } });
