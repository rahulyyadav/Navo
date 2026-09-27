import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionHeading } from '@/components/SectionHeading';
import { StatusPill } from '@/components/StatusPill';
import { auditChecks, samplePlan } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function PlanScreen() {
  return (
    <Screen>
      <View style={styles.intro}>
        <StatusPill label="Demonstration plan" tone="orange" />
        <SectionHeading eyebrow="Annapurna region" title="Six days, shaped around your limits" />
        <Text style={styles.disclaimer}>The route facts below are interface placeholders, not verified trekking guidance.</Text>
      </View>

      <View style={styles.summary}>
        <View><Text style={styles.summaryLabel}>PACE</Text><Text style={styles.summaryValue}>Steady</Text></View>
        <View style={styles.divider} />
        <View><Text style={styles.summaryLabel}>DAYS</Text><Text style={styles.summaryValue}>6</Text></View>
        <View style={styles.divider} />
        <View><Text style={styles.summaryLabel}>HIGH POINT</Text><Text style={styles.summaryValue}>Demo</Text></View>
      </View>

      <Text style={styles.sectionLabel}>DAY BY DAY</Text>
      <View style={styles.timeline}>
        {samplePlan.map((item, index) => (
          <View key={item.day} style={styles.dayRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.dayDot, item.status === 'watch' && styles.dayDotWatch]}><Text style={styles.dayNumber}>{item.day}</Text></View>
              {index < samplePlan.length - 1 ? <View style={styles.rail} /> : null}
            </View>
            <View style={styles.dayCard}>
              <View style={styles.dayTopline}>
                <Text style={styles.dayRoute}>{item.from} → {item.to}</Text>
                <StatusPill label={item.status === 'watch' ? 'Review' : 'Checked'} tone={item.status === 'watch' ? 'orange' : 'green'} />
              </View>
              <Text style={styles.dayMeta}>{item.duration} · {item.elevation} · {item.distance}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.auditCard}>
        <Text style={styles.auditKicker}>AI PLAN AUDIT</Text>
        <Text style={styles.auditTitle}>The plan does not pass silently.</Text>
        <Text style={styles.auditCopy}>Navo exposes the checks, gaps, and repair requests behind the final itinerary.</Text>
        <View style={styles.checks}>
          {auditChecks.map(([label, value]) => (
            <View key={label} style={styles.checkRow}>
              <Text style={styles.checkLabel}>{label}</Text>
              <Text style={[styles.checkValue, value.includes('Review') && styles.checkWarning]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 14, paddingTop: 8 },
  disclaimer: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: -10 },
  summary: { alignItems: 'center', backgroundColor: colors.forest, borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28, marginTop: 22, paddingVertical: 20 },
  summaryLabel: { color: '#AFC7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 5 },
  summaryValue: { color: colors.white, fontSize: 17, fontWeight: '800' },
  divider: { backgroundColor: '#3D5B50', height: 35, width: 1 },
  sectionLabel: { color: colors.ember, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14 },
  timeline: { gap: 0 },
  dayRow: { flexDirection: 'row', minHeight: 118 },
  timelineRail: { alignItems: 'center', marginRight: 12, width: 36 },
  dayDot: { alignItems: 'center', backgroundColor: colors.moss, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  dayDotWatch: { backgroundColor: colors.ember },
  dayNumber: { color: colors.white, fontSize: 13, fontWeight: '900' },
  rail: { backgroundColor: colors.line, flex: 1, width: 2 },
  dayCard: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: radius.md, borderWidth: 1, flex: 1, marginBottom: 13, padding: 15 },
  dayTopline: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dayRoute: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  dayMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  auditCard: { backgroundColor: '#EFE8DB', borderRadius: radius.lg, marginTop: 14, padding: 20 },
  auditKicker: { color: colors.ember, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  auditTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', lineHeight: 28, marginTop: 8 },
  auditCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  checks: { borderTopColor: '#D5C9B4', borderTopWidth: 1, marginTop: 18, paddingTop: 5 },
  checkRow: { borderBottomColor: '#D5C9B4', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  checkLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  checkValue: { color: colors.moss, fontSize: 12, fontWeight: '800' },
  checkWarning: { color: colors.warning },
});
