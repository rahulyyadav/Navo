import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  eyebrow: { color: colors.ember, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.7, lineHeight: 32 },
});
