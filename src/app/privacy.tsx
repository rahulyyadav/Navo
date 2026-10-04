import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { Backdrop, Button, Card, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { useFirebaseAuth } from '@/context/AuthContext';
import { clearLibrary } from '@/lib/trip-library-store';
import { clearTripDownloads } from '@/lib/storage';
import { colors } from '@/theme/tokens';

const support = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
const privacyURL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';
export default function PrivacyScreen() {
  const { user } = useFirebaseAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function clear() {
    if (!user || busy) return; setBusy(true); setMessage('');
    try { await clearTripDownloads(user.uid); await clearLibrary(user.uid); setConfirm(false); setMessage('Downloaded packs, local AI drafts, checklists, personal plans, bookmarks, expenses and activity summaries were removed from this device.'); }
    catch { setMessage('Could not clear every download. Please try again.'); }
    finally { setBusy(false); }
  }
  async function open(url: string) { try { await Linking.openURL(url); } catch { setMessage('Could not open this link. Check your device’s browser or email setup.'); } }
  return <Backdrop><ScrollView contentContainerStyle={styles.scroll}>
    <Reveal><Heading title="Your data, your choice." subtitle="Understand what stays on your phone and what your crew can see." /></Reveal>
    <Card><SectionTitle title="YOUR ACCOUNT" /><Text style={styles.copy}>Firebase manages sign-in. Your profile and emergency contact sync to your private account when connected. Group members can see the name you share with them, group messages and group alerts.</Text></Card>
    <Card><SectionTitle title="LOCATION IS YOUR CHOICE" /><Text style={styles.copy}>Navo requests a position when you tap a location action. Sharing a check-in sends that position to your group with a timestamp. Stop sharing from the group’s Safety tab to remove your current marker and pause reminders. Earlier check-ins remain in group history. An explicit location session uploads positions while the group Safety screen is open and opts you into nearby group alerts. Leaving or backgrounding pauses uploads; nearby eligibility expires after two minutes. Hide your last position to remove the current marker. Navo does not continuously track you in the background.</Text></Card>
    <Card><SectionTitle title="SAVED ON THIS DEVICE" /><Text style={styles.copy}>Your personal plans, starting places, stay notes, expense logs, bookmarks and activity summaries are saved locally for this account. The hike recorder keeps totals without storing a GPS history. Downloaded trip packs may contain your emergency contact and your crew’s last shared positions. They stay available to this account after sign-out. Clear them before giving away this device; keep needed trip information elsewhere first.</Text>
      {user && <Button label="Clear downloaded trip data" variant="outline" onPress={() => setConfirm(true)} />}
      {confirm && <><Text style={styles.copy}>Remove all downloaded packs, local AI drafts, preparation checklists, personal plans, bookmarks, expenses and activity summaries for this account from this device? Cloud group history is unaffected.</Text><Button label="Remove my local trip data" variant="danger" busy={busy} onPress={() => void clear()} /><Button label="Keep my downloads" variant="quiet" disabled={busy} onPress={() => setConfirm(false)} /></>}
    </Card>
    <Card><SectionTitle title="DIRECTIONS & WEATHER" /><Text style={styles.copy}>Opening road or bus directions sends the starting place and destination you chose to Google Maps. A weather check sends the trailhead coordinates and date to Open-Meteo. Your GPS is not sent to these services automatically. Invitation links remain on this device while you complete sign-in, and are cleared after you submit or close the invitation.</Text></Card>
    <Card><SectionTitle title="AI PLANNING" /><Text style={styles.copy}>When you generate an itinerary, your trek preferences and goals are sent to the Navo backend and its Nebius model service. Avoid entering private medical or identity information. Plans are saved to your account and need review by a qualified guide.</Text></Card>
    <Notice tone="info" message={message} />
    {/^https:\/\//.test(privacyURL) && <Button label="Read the privacy policy" variant="outline" onPress={() => void open(privacyURL)} />}
    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support) && <Button label="Contact support about my data" variant="outline" onPress={() => void open(`mailto:${support}?subject=Navo%20data%20request`)} />}
  </ScrollView></Backdrop>;
}
const styles = StyleSheet.create({ scroll: { padding: 22, paddingBottom: 48, gap: 18 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 25, marginBottom: 16 } });
