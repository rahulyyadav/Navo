import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { tapHaptic } from '@/services/tap-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Transform-only feedback leaves the scroll layout stable. */
export function HomePressable({ style, onPress, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animate = (value: number) => {
    scale.value = withSpring(value, { damping: 22, stiffness: 360, mass: .6, reduceMotion: ReduceMotion.System });
  };
  return <AnimatedPressable {...props}
    style={[style, motion]}
    onPress={onPress ? event => { tapHaptic(); onPress(event); } : undefined}
    onPressIn={event => { animate(.975); onPressIn?.(event); }}
    onPressOut={event => { animate(1); onPressOut?.(event); }}
  />;
}
