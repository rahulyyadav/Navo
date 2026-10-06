import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/Typography';
import { useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Heading, Notice, SectionTitle } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { useCloud } from '@/context/CloudContext';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import { trekById, treks } from '@/data/treks';
import { readJSON, writeJSON } from '@/lib/storage';
import { essentials, type Preparation } from '@/services/preparation';
import type { AIPlan, CloudMember } from '@/types/cloud';
import type { EmergencyContact } from '@/types/navo';
import { colors } from '@/theme/tokens';

type Pack = { version: 1; savedAt: string; trekId: string; trekName: string; waypoints: { name: string; latitude: number; longitude: number; elevation: number }[]; members: CloudMember[]; contact: EmergencyContact | null; plan: AIPlan | null; preparation: Preparation | null };
export default function OfflineScreen() {
  const params = useLocalSearchParams<{ trek?: string; group?: string }>();
  const trek = trekById(typeof params.trek === 'string' ? params.trek : '') ?? treks[0];
  const { userId, answers } = useNavo(); const cloud = useCloud(); const members = useGroupFeed<CloudMember>(params.group ?? '', 'members');
  const [pack, setPack] = useState<Pack | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const key = `offline-pack:${userId}:${trek.id}`;
  useEffect(() => { let active = true; readJSON<Pack>(key).then(value => { if (active) setPack(value); }).catch(() => { if (active) setError('Could not read your saved trip pack.'); }); return () => { active = false; }; }, [key]);
  async function save() {
    if (busy) return; setBusy(true); setError('');
    try {
      if (params.group && (!cloud.ready || members.loading || members.cached || members.error)) throw new Error('Wait for a fresh group roster before saving. Your existing pack is unchanged.');
      const [plan, preparation] = await Promise.all([readJSON<AIPlan>(`ai-plan:${userId}:${trek.id}`), readJSON<Preparation>(`preparation:${userId}:${trek.id}`)]);
      const next: Pack = { version: 1, savedAt: new Date().toISOString(), trekId: trek.id, trekName: trek.name, waypoints: trek.route, members: members.items, contact: answers.emergencyContact, plan, preparation };
      await writeJSON(key, next); setPack(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save trip pack.'); }
    finally { setBusy(false); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll}><Heading title="Beyond the last signal." subtitle="Save a snapshot you can read on this device. Re-download before departure to update it." /><Notice message={error} />
    <Button label={pack ? 'Update saved trip pack' : 'Save trip pack on this device'} busy={busy} disabled={busy} onPress={() => void save()} />
    {pack && <><Badge label="SAVED ON THIS DEVICE" tone="lime" /><Text style={styles.copy}>Saved {new Date(pack.savedAt).toLocaleString()}. Group information is a snapshot, not live.</Text><Heading title={pack.trekName} /><SectionTitle title="APPROXIMATE WAYPOINTS" />{pack.waypoints.map(point => <Card key={point.name}><Text style={styles.title}>{point.name} · {point.elevation} m</Text><Text style={styles.copy}>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text></Card>)}
      <SectionTitle title="EMERGENCY CONTACT" /><Text style={styles.copy}>{pack.contact ? `${pack.contact.name} · ${pack.contact.phone}` : 'No emergency contact saved. Add one in your profile.'}</Text>
      <SectionTitle title="LAST SAVED CREW" />{pack.members.map(member => <Text key={member.id} style={styles.copy}>{member.name}{member.lastLocation ? ` · ${member.lastLocation.latitude.toFixed(4)}, ${member.lastLocation.longitude.toFixed(4)} · recorded ${member.lastLocation.capturedAt}` : ' · no shared position'}</Text>)}
      <SectionTitle title="ITINERARY" />{pack.plan?.itinerary ? <><Badge label={pack.plan.status === 'rejected' ? 'REJECTED DRAFT' : 'GUIDE REVIEW REQUIRED'} tone="warning" />{pack.plan.itinerary.days.map(day => <Card key={day.day}><Text style={styles.title}>Day {day.day} · {day.start} → {day.end}</Text><Text style={styles.copy}>{day.notes}</Text></Card>)}</> : <Text style={styles.copy}>No AI itinerary saved. Generate one in AI copilot first.</Text>}
      <SectionTitle title="TRAIL CHECKLIST" />{essentials.map(item => <Text key={item.id} style={styles.copy}>{pack.preparation?.checked.includes(item.id) ? '✓' : '○'} {item.label}: {item.detail}</Text>)}
    </>}
    <Notice tone="warning" message="Map tiles, current weather, messages and new alerts require internet. Saved waypoints are approximate and do not replace a verified offline navigation map." />
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 16 }, title: { color: colors.ink, fontSize: 17, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 23 } });
