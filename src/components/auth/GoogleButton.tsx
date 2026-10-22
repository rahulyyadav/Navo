import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { tapHaptic } from '@/services/tap-haptics';
import { createThemedStyles } from '@/theme/create-styles';

const googleMark = require('../../../assets/google-g.png');

export function GoogleButton({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const styles = useStyles();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = (value: number) => { scale.value = withSpring(value, { damping: 16, stiffness: 320, mass: 0.7 }); };
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={() => { tapHaptic(); onPress(); }}
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
    >
      <Animated.View style={[styles.shell, inactive && styles.inactive, animated]}>
        <View style={styles.markWrap}>
          <Image accessibilityLabel="Google" source={googleMark} style={styles.mark} />
        </View>
        <Text style={styles.label} numberOfLines={1}>{busy ? 'Opening Google…' : label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = createThemedStyles(t => StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: t.background,
    borderColor: t.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 20,
  },
  inactive: { opacity: 0.5 },
  markWrap: { backgroundColor: '#FFFFFF', borderRadius: 11, height: 26, justifyContent: 'center', alignItems: 'center', width: 26 },
  mark: { height: 18, width: 18 },
  label: { color: t.ink, fontSize: 15, fontWeight: '700' },
}));
