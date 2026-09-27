import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export function StatusPill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'orange' }) {
  return (
    <View style={[styles.pill, tone === 'orange' && styles.orange]}>
      <View style={[styles.dot, tone === 'orange' && styles.orangeDot]} />
      <Text style={[styles.label, tone === 'orange' && styles.orangeText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.mist, borderRadius: radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  orange: { backgroundColor: '#FBEADF' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.fern },
  orangeDot: { backgroundColor: colors.ember },
  label: { color: colors.forest, fontSize: 11, fontWeight: '700' },
  orangeText: { color: colors.warning },
});
