import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Typography';
import { useTheme } from '@/context/ThemeContext';
import { HomePressable } from './HomeMotion';

type JourneyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'quiet' | 'danger';
  align?: 'center' | 'left';
  busy?: boolean;
  disabled?: boolean;
  style?: object;
};

/** Button in the home/profile design language: green primary fill, outlined secondary, quiet text action. */
export function JourneyButton({ label, onPress, variant = 'primary', align = 'center', busy = false, disabled = false, style }: JourneyButtonProps) {
  const { palette } = useTheme();
  const inactive = disabled || busy;
  const fill = variant === 'primary' ? palette.primary : variant === 'danger' ? palette.danger : 'transparent';
  const textColor = variant === 'primary' || variant === 'danger' ? palette.onPrimary : variant === 'quiet' ? palette.green : palette.ink;
  return <HomePressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy }} disabled={inactive} onPress={onPress} style={[
    styles.base,
    { backgroundColor: fill },
    variant === 'outline' && { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    variant === 'quiet' && { backgroundColor: 'transparent', minHeight: 46, justifyContent: 'flex-start', alignItems: align === 'left' ? 'flex-start' : 'center', paddingHorizontal: align === 'left' ? 2 : 18 },
    variant === 'danger' && { backgroundColor: palette.danger },
    inactive && styles.inactive,
    style,
  ]}>
    <View style={[styles.inner, variant === 'quiet' && align === 'left' && { justifyContent: 'flex-start' }]}>
      {busy ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? palette.onPrimary : palette.green}/> : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {!busy && variant !== 'quiet' ? <Text style={[styles.arrow, { color: textColor }]}>{variant === 'primary' || variant === 'danger' ? '→' : '↗'}</Text> : null}
    </View>
  </HomePressable>;
}

const styles = StyleSheet.create({
  base: { borderRadius: 15, minHeight: 52, paddingHorizontal: 18, justifyContent: 'center', overflow: 'hidden' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  arrow: { fontSize: 19 },
  inactive: { opacity: 0.5 },
});
