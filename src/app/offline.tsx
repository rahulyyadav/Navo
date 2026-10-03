import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Backdrop, Badge, Button, Card, Heading, Notice, SectionTitle } from '@/components/ui';
import { useNavo } from '@/context/NavoContext';
import { useCloud } from '@/context/CloudContext';
import { useGroupFeed } from '@/hooks/useGroupFeed';
import { trekById, treks } from '@/data/treks';
import { readJSON, writeJSON } from '@/lib/storage';
import { essentials, type Preparation } from '@/services/preparation';
import type { AIPlan, CloudMember } from '@/types/cloud';
import type { EmergencyContact, TrekGroup } from '@/types/navo';
import { colors } from '@/theme/tokens';

type Pack = { startDate?: string; outing?: TrekGroup['outing']; version: 1; savedAt: string; trekId: string; trekName: string; waypoints: { name: string; latitude: number; longitude: number; elevation: number }[]; members: CloudMember[]; contact: EmergencyContact | null; plan: AIPlan | null; preparation: Preparation | null };
export default function OfflineScreen() {
  const params = useLocalSearchParams<{ trek?: string; group?: string }>();
  const { userId, answers } = useNavo(); const cloud = useCloud(); const members = useGroupFeed<CloudMember>(params.group ?? '', 'members');
  const group = cloud.groups.find(item => item.id === params.group);
  const custom = params.trek === 'custom-hike';
  const trek = custom ? { id: 'custom-hike', name: group?.outing?.destination ?? 'Day hike', route: [] } : trekById(typeof params.trek === 'string' ? params.trek : '') ?? treks[0];
  const [stored, setStored] = useState<{ key: string; value: Pack | null }>({ key: '', value: null }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const key = `offline-pack:${userId}:${params.group ?? 'solo'}:${trek.id}`;
  const pack = stored.key === key ? stored.value : null;
  useEffect(() => { let active = true; readJSON<Pack>(key).then(value => { if (value && (value.version !== 1 || value.trekId !== trek.id || !Array.isArray(value.waypoints) || !Array.isArray(value.members))) throw new Error('Invalid pack'); if (active) setStored({ key, value }); }).catch(() => { if (active) setError('Could not read your saved trip pack.'); }); return () => { active = false; }; }, [key, trek.id]);
  async function save() {
    if (busy) return; setBusy(true); setError('');
    try {
      if (params.group && (!cloud.ready || members.loading || members.cached || members.error)) throw new Error('Wait for a fresh group roster before saving. Your existing pack is unchanged.');
      const [plan, preparation] = await Promise.all([readJSON<AIPlan>(`ai-plan:${userId}:${trek.id}`), readJSON<Preparation>(`preparation:${userId}:${trek.id}`)]);
      if (custom && !group?.outing) throw new Error('Reconnect to your hike group before saving its meeting plan.');
      const next: Pack = { startDate: group?.startDate, outing: group?.outing ?? null, version: 1, savedAt: new Date().toISOString(), trekId: trek.id, trekName: trek.name, waypoints: trek.route, members: params.group ? members.items : pack?.members ?? [], contact: answers.emergencyContact, plan, preparation };
      await writeJSON(key, next); setStored({ key, value: next });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save trip pack.'); }
    finally { setBusy(false); }
  }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll}><Heading title="Beyond the last signal." subtitle="Save a snapshot you can read on this device. Re-download before departure to update it." /><Notice message={error} />
    <Button label={pack ? 'Update saved trip pack' : 'Save trip pack on this device'} busy={busy} disabled={busy} onPress={() => void save()} />
    {pack && <><Badge label="SAVED ON THIS DEVICE" tone="lime" /><Text style={styles.copy}>Saved {new Date(pack.savedAt).toLocaleString()}. Group information is a snapshot, not live.</Text><Heading title={pack.trekName} /><SectionTitle title={pack.outing ? "MEETUP PLAN" : "APPROXIMATE WAYPOINTS"} />{pack.outing && <Card><Text style={styles.title}>{pack.outing.meetingPoint}</Text><Text style={styles.copy}>{pack.startDate ?? 'Date not saved'} · depart {pack.outing.startTime} NPT · {pack.outing.walkingHours} planned walking hours · {pack.outing.expectedPeople} expected people. No verified trail track is included.</Text></Card>}{pack.waypoints.map(point => <Card key={point.name}><Text style={styles.title}>{point.name} · {point.elevation} m</Text><Text style={styles.copy}>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text></Card>)}
      <SectionTitle title="EMERGENCY CONTACT" /><Text style={styles.copy}>{pack.contact ? `${pack.contact.name} · ${pack.contact.phone}` : 'No emergency contact saved. Add one in your profile.'}</Text>
      <SectionTitle title="LAST SAVED CREW" />{pack.members.map(member => <Text key={member.id} style={styles.copy}>{member.name}{member.lastLocation ? ` · ${member.lastLocation.latitude.toFixed(4)}, ${member.lastLocation.longitude.toFixed(4)} · recorded ${member.lastLocation.capturedAt}` : ' · no shared position'}</Text>)}
      <SectionTitle title="ITINERARY" />{pack.plan?.itinerary ? <><Badge label={pack.plan.status === 'rejected' ? 'REJECTED DRAFT' : 'GUIDE REVIEW REQUIRED'} tone="warning" />{pack.plan.itinerary.days.map(day => <Card key={day.day}><Text style={styles.title}>Day {day.day} · {day.start} → {day.end}</Text><Text style={styles.copy}>{day.notes}</Text></Card>)}</> : <Text style={styles.copy}>No AI itinerary saved. Generate one in AI copilot first.</Text>}
      <SectionTitle title="TRAIL CHECKLIST" />{essentials.map(item => <Text key={item.id} style={styles.copy}>{pack.preparation?.checked.includes(item.id) ? '✓' : '○'} {item.label}: {item.detail}</Text>)}
    </>}
    <Notice tone="warning" message="Map tiles, current weather, messages and new alerts require internet. Saved waypoints are approximate and do not replace a verified offline navigation map." />
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 20, paddingBottom: 48, gap: 16 }, title: { color: colors.ink, fontSize: 17, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 23 } });
