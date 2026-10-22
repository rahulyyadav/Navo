import { StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import { colors } from '@/theme/tokens';

/**
 * Progress along the planned line, with a tick for every mapped maneuver. An
 * unmatched GPS position is shown as uncertainty rather than a guessed place.
 */
export function RouteProgressStrip({ ratio, marks, remainingLabel, label = 'Progress along the planned line' }: {
  ratio: number | null;
  marks: number[];
  remainingLabel: string;
  label?: string;
}) {
  const known = ratio !== null && Number.isFinite(ratio);
  const percent = known ? Math.min(100, Math.max(0, ratio * 100)) : 0;
  const pct = (value: number) => `${Math.round(value * 10) / 10}%` as `${number}%`;
  const travelledStyle = { width: pct(percent) };
  const dotStyle = { left: pct(percent) };
  const ticks = marks.map(mark => Math.min(100, Math.max(0, mark * 100)));
  return (
    <View style={styles.root}>
      <View accessibilityLabel={`${label}: ${known ? `${Math.round(percent)} percent` : 'position uncertain'}`} accessibilityRole="progressbar" style={styles.wrap}>
        <View style={styles.clip}>
          {ticks.map((position, index) => <View key={`mark-${index}`} style={[styles.tick, { left: pct(position) }]} />)}
          {known ? <View style={[styles.travelled, travelledStyle]} /> : null}
        </View>
        {known ? <View style={[styles.dot, dotStyle]} /> : null}
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, known && styles.legendOn]}>{known ? `${Math.round(percent)}% · ${label}` : `Waiting for a confident position · ${label}`}</Text>
        <Text style={styles.legendText}>{remainingLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 7 },
  wrap: { height: 14, position: 'relative', width: '100%' },
  clip: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 4, bottom: 3, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 3 },
  tick: { backgroundColor: 'rgba(255,255,255,0.34)', borderRadius: 1, height: 8, position: 'absolute', top: 0, width: 2 },
  travelled: { backgroundColor: 'rgba(228,255,137,0.45)', bottom: 0, left: 0, position: 'absolute', top: 0 },
  dot: { backgroundColor: colors.lime, borderColor: colors.nightDeep, borderRadius: 8, borderWidth: 2, height: 16, marginLeft: -8, position: 'absolute', top: 0, width: 16 },
  legend: { flexWrap: 'wrap', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  legendText: { color: colors.faint, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  legendOn: { color: colors.lime },
});
