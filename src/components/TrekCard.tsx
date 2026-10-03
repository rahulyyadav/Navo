import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useReducedMotion } from './ui';
import type { Trek } from '@/data/treks';
import { colors, radius } from '@/theme/tokens';

const tone = {
  Moderate: 'rgba(228,255,137,0.20)',
  Challenging: 'rgba(255,184,107,0.22)',
  Strenuous: 'rgba(255,111,97,0.24)',
} as const;

export function TrekCard({ trek, onPress, compact = false }: { trek: Trek; onPress: () => void; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = (value: number) => { scale.value = reduced ? 1 : withSpring(value, { damping: 17, stiffness: 300, mass: 0.7 }); };

  return (
    <Pressable
      accessibilityHint={`Open the ${trek.name} trek`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => press(0.975)}
      onPressOut={() => press(1)}
    >
      <Animated.View style={[styles.card, compact && styles.cardCompact, animated]}>
        <Image source={trek.image} onError={() => setImageFailed(true)} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" accessibilityLabel={`${trek.name} in the ${trek.region} region`} />
        <LinearGradient colors={['rgba(8,13,18,0.05)', 'rgba(8,13,18,0.08)', 'rgba(8,13,18,0.94)']} style={StyleSheet.absoluteFill} />
        <View style={styles.topRow}>
          <View style={styles.region}><Text style={styles.regionText}>{trek.region.toUpperCase()}</Text></View>
          <View style={[styles.difficulty, { backgroundColor: tone[trek.difficulty] }]}>
            <Text style={styles.difficultyText}>{trek.difficulty}</Text>
          </View>
        </View>
        <View style={styles.bottom}>
          {imageFailed && <Text style={styles.stat}>Photo unavailable · trek details below</Text>}
          <Text style={styles.name} numberOfLines={2}>{trek.name}</Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>{trek.days}</Text>
            <View style={styles.statDot} />
            <Text style={styles.stat}>{trek.maxElevation.toLocaleString()} m</Text>
            <View style={styles.statDot} />
            <Text style={styles.stat}>{trek.route.length} stops</Text>
          </View>
          <Text style={{ color: colors.lime, fontWeight: '700', marginTop: 10 }}>View trek →</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    height: 208,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: colors.navy,
  },
  cardCompact: { height: 150 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  region: { backgroundColor: 'rgba(8,13,18,0.45)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  regionText: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  difficulty: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  difficultyText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  bottom: { padding: 16 },
  name: { color: colors.white, fontSize: 23, fontWeight: '800', letterSpacing: -0.6, lineHeight: 28 },
  stats: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  stat: { color: 'rgba(255,255,255,0.72)', fontSize: 12.5, fontWeight: '600' },
  statDot: { backgroundColor: 'rgba(255,255,255,0.34)', borderRadius: 2, height: 3, width: 3 },
});
