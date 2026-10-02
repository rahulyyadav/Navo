import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Backdrop, Badge, Button, Card, Eyebrow, Heading, Notice, Reveal, SectionTitle } from '@/components/ui';
import { TabIcon } from '@/components/TabIcon';
import { useMyLocation } from '@/hooks/useMyLocation';
import { useNavo } from '@/context/NavoContext';
import { trekkingResources } from '@/services/preparation';
import { colors, radius } from '@/theme/tokens';

const packItems = [
  ['Trek overviews', 'Bundled with app'],
  ['Saved preparation', 'On this device'],
  ['Map tiles', 'Internet required'],
  ['Weather & advisories', 'Internet required'],
  ['Group alerts', 'Connection required'],
] as const;

export default function SafetyScreen() {
  const { coords, state, locate } = useMyLocation();
  const { profile, groups } = useNavo();
  const [error, setError] = useState('');
  async function sharePosition() {
    if (!coords) return;
    try { await Share.share({ message: `My Navo location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}\nAccuracy: ${coords.accuracy === null ? 'unknown' : `±${Math.round(coords.accuracy)} m`}\nRecorded: ${new Date(coords.timestamp ?? Date.now()).toISOString()}\nhttps://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}#map=15/${coords.latitude}/${coords.longitude}\nPlease contact me to confirm my situation.` }); }
    catch { setError('Could not open sharing. You can read your coordinates above.'); }
  }
  async function open(url: string) { try { await Linking.openURL(url); } catch { setError('Could not open this action on your device.'); } }


  return (
    <Backdrop>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Reveal>
          <View style={styles.badgeRow}><Badge label="TRAIL ESSENTIALS" tone="info" /></View>
          <Heading
            subtitle="Navo separates the information that stays readable offline from the actions that still need a network, a carrier, or a supported system feature."
            title="Know what still works when the signal does not"
          />
        </Reveal>

        <View style={styles.section}><SectionTitle title="YOUR GROUP SAFETY" />{groups.map(group => <Button key={group.id} label={`${group.name} · check in / SOS`} variant="outline" onPress={() => router.push(`/group/${group.id}`)} />)}{!groups.length && <Button label="Find or create your trail group" variant="outline" onPress={() => router.push('/(tabs)/groups')} />}</View>
        <Reveal delay={50}>
          <Card>
            <View style={styles.fixHeader}>
              <View style={styles.fixCopy}>
                <Eyebrow>LAST POSITION</Eyebrow>
                <Text style={styles.fixTitle}>{coords ? 'GPS fix available' : state === 'locating' ? 'Looking for satellites…' : 'No fix yet'}</Text>
              </View>
              <View style={styles.fixIcon}><TabIcon color={colors.lime} name="pin" size={24} /></View>
            </View>

            {coords ? (
              <View style={styles.fixGrid}>
                <FixCell label="LATITUDE" value={coords.latitude.toFixed(5)} />
                <FixCell label="LONGITUDE" value={coords.longitude.toFixed(5)} />
                <FixCell label="ACCURACY" value={coords.accuracy ? `±${Math.round(coords.accuracy)} m` : 'Unknown'} />
              </View>
            ) : (
              <Text style={styles.fixHint}>
                A fix comes from the phone’s GPS, so it works without mobile data. Take one before you lose signal and
                check the timestamp and accuracy before sharing it.
              </Text>
            )}

            <Button
              busy={state === 'locating'}
              disabled={state === 'locating'}
              label={coords ? 'Refresh my position' : 'Get my position'}
              onPress={() => void locate()}
              style={styles.fixButton}
              variant="outline"
            />
            {coords && <><Text style={styles.fixHint}>Recorded {coords.timestamp ? new Date(coords.timestamp).toLocaleTimeString() : 'time unknown'} · refresh before sharing.</Text><Button label="Share my coordinates" onPress={() => void sharePosition()} style={styles.fixButton} /></>}
            {profile?.emergencyContact?.phone && <Button label={`Call ${profile.emergencyContact.name || 'emergency contact'}`} variant="outline" onPress={() => void open(`tel:${profile.emergencyContact!.phone.replace(/[^+0-9]/g, '')}`)} style={styles.fixButton} />}
            <Notice message={error} />
            {coords && <Button label="Copy coordinates" variant="quiet" onPress={() => void Clipboard.setStringAsync(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`).catch(() => setError('Could not copy coordinates.'))} />}
            {state === 'denied' ? <Notice message="Location permission is off. Enable it in Settings to get your coordinates." tone="warning" /> : null}
            {state === 'unavailable' ? <Notice message="No new GPS fix. Try again outdoors. Any displayed coordinates are the previous fix." tone="info" /> : null}
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <View style={styles.section}>
            <SectionTitle title="TRIP PACK" />
            <Card padded={false} style={styles.pack}>
              {packItems.map(([label, status], index) => (
                <View key={label} style={[styles.packRow, index === packItems.length - 1 && styles.lastRow]}>
                  <View style={styles.check}><Text style={styles.checkMark}>·</Text></View>
                  <Text style={styles.packLabel}>{label}</Text>
                  <Text style={styles.packStatus}>{status}</Text>
                </View>
              ))}
            </Card>
          </View>
        </Reveal>

        <Reveal delay={110}>
          <View style={[styles.section, styles.boundary]}>
            <Eyebrow>IMPORTANT BOUNDARY</Eyebrow>
            <Text style={styles.boundaryTitle}>Offline does not mean connected.</Text>
            <Text style={styles.boundaryCopy}>
              GPS can place you without mobile data. Calls, SMS, live weather, and rescue communication still depend on
              an available channel, and satellite capability varies by device, carrier, operating system, and region.
            </Text>
          </View>
        </Reveal>

        <View style={styles.section}><SectionTitle title="RELIABLE LOCAL SOURCES" />{trekkingResources.map(resource => <Button key={resource.url} label={resource.label} variant="quiet" onPress={() => void open(resource.url)} />)}</View>
        <Reveal delay={140}>
          <View style={[styles.section, styles.pending]}>
            <Eyebrow>EMERGENCY PREPARATION</Eyebrow>
            <Text style={styles.pendingTitle}>Coordinates + route + timestamp</Text>
            <Text style={styles.boundaryCopy}>
              Use “Share my coordinates” to choose a contact in your phone’s share sheet. Sending needs a working communication channel. Navo does not dispatch rescue or notify other group members.
            </Text>
          </View>
        </Reveal>
      </ScrollView>
    </Backdrop>
  );
}

function FixCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fixCell}>
      <Text style={styles.fixCellLabel}>{label}</Text>
      <Text style={styles.fixCellValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 20 },
  badgeRow: { marginBottom: 16 },
  fixHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  fixCopy: { flex: 1 },
  fixTitle: { color: colors.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  fixIcon: { alignItems: 'center', backgroundColor: colors.slate, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  fixGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
  fixCell: { backgroundColor: colors.slate, borderRadius: radius.md, flex: 1, padding: 12 },
  fixCellLabel: { color: colors.faint, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  fixCellValue: { color: colors.lime, fontSize: 15, fontWeight: '800', marginTop: 6 },
  fixHint: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginTop: 12 },
  fixButton: { marginTop: 18 },
  section: { marginTop: 28 },
  pack: { paddingHorizontal: 16 },
  packRow: { alignItems: 'center', borderBottomColor: colors.lineSoft, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 14 },
  lastRow: { borderBottomWidth: 0 },
  check: { alignItems: 'center', backgroundColor: colors.slate, borderRadius: 11, height: 22, justifyContent: 'center', marginRight: 11, width: 22 },
  checkMark: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  packLabel: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '600' },
  packStatus: { color: colors.muted, fontSize: 11.5 },
  boundary: { backgroundColor: 'rgba(255,184,107,0.12)', borderColor: 'rgba(255,184,107,0.35)', borderRadius: radius.lg, borderWidth: 1, padding: 20 },
  boundaryTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.4, lineHeight: 27 },
  boundaryCopy: { color: colors.muted, fontSize: 13.5, lineHeight: 21, marginTop: 9 },
  pending: { borderColor: colors.line, borderRadius: radius.lg, borderStyle: 'dashed', borderWidth: 1.5, padding: 20 },
  pendingTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
});
