import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionHeading } from '@/components/SectionHeading';
import { StatusPill } from '@/components/StatusPill';
import { colors, radius } from '@/theme/tokens';

const packItems = [
  ['Route line', 'Stored on device'],
  ['Day plan', 'Stored on device'],
  ['Waypoints', 'Demo only'],
  ['Emergency details', 'Needs verification'],
];

export default function SafetyScreen() {
  return (
    <Screen>
      <View style={styles.intro}>
        <StatusPill label="Offline concept" />
        <SectionHeading eyebrow="Beyond coverage" title="Know what still works when the signal does not" />
        <Text style={styles.copy}>
          Navo separates offline information from actions that still require a network, carrier, or supported system feature.
        </Text>
      </View>

      <View style={styles.signalCard}>
        <View style={styles.signalHeader}>
          <View><Text style={styles.signalKicker}>LAST POSITION</Text><Text style={styles.signalTitle}>GPS fix available</Text></View>
          <View style={styles.signalIcon}><Text style={styles.signalIconText}>⌁</Text></View>
        </View>
        <Text style={styles.signalMeta}>Accuracy and timestamp will appear here when location integration is enabled.</Text>
      </View>

      <Text style={styles.sectionLabel}>TRIP PACK</Text>
      <View style={styles.packCard}>
        {packItems.map(([label, status], index) => (
          <View key={label} style={[styles.packRow, index === packItems.length - 1 && styles.lastRow]}>
            <View style={styles.checkCircle}><Text style={styles.check}>✓</Text></View>
            <Text style={styles.packLabel}>{label}</Text>
            <Text style={styles.packStatus}>{status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.boundaryCard}>
        <Text style={styles.boundaryKicker}>IMPORTANT BOUNDARY</Text>
        <Text style={styles.boundaryTitle}>Offline does not mean connected.</Text>
        <Text style={styles.boundaryCopy}>
          GPS may determine a position without mobile data. Calls, SMS, live weather, and rescue communication still depend on an available channel. Satellite capability varies by device, carrier, operating system, and region.
        </Text>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionLabel}>Emergency preparation</Text>
        <Text style={styles.actionTitle}>Coordinates + route + timestamp</Text>
        <Text style={styles.actionCopy}>The final flow will prepare these details for the phone's supported call or messaging experience. It will not claim to dispatch rescue automatically.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 14, paddingTop: 8 },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: -7 },
  signalCard: { backgroundColor: colors.forest, borderRadius: radius.lg, marginBottom: 28, marginTop: 24, padding: 20 },
  signalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  signalKicker: { color: '#AFC7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  signalTitle: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 5 },
  signalIcon: { alignItems: 'center', backgroundColor: '#294E40', borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  signalIconText: { color: colors.white, fontSize: 26 },
  signalMeta: { color: '#C8D8CE', fontSize: 12, lineHeight: 18, marginTop: 16, maxWidth: 300 },
  sectionLabel: { color: colors.ember, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  packCard: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, marginBottom: 20, paddingHorizontal: 15 },
  packRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 14 },
  lastRow: { borderBottomWidth: 0 },
  checkCircle: { alignItems: 'center', backgroundColor: colors.mist, borderRadius: 11, height: 22, justifyContent: 'center', marginRight: 10, width: 22 },
  check: { color: colors.moss, fontSize: 12, fontWeight: '900' },
  packLabel: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '800' },
  packStatus: { color: colors.muted, fontSize: 11 },
  boundaryCard: { backgroundColor: '#FBEADF', borderRadius: radius.lg, marginBottom: 20, padding: 20 },
  boundaryKicker: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  boundaryTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 8 },
  boundaryCopy: { color: '#74543C', fontSize: 13, lineHeight: 20, marginTop: 9 },
  actionCard: { borderColor: colors.sand, borderRadius: radius.lg, borderStyle: 'dashed', borderWidth: 1.5, padding: 20 },
  actionLabel: { color: colors.ember, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  actionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 8 },
  actionCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
});
