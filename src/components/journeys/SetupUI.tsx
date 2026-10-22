import { useEffect } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Text, TextInput } from '@/components/Typography';
import { useSetupStyles } from './setup-styles';
import { useTheme } from '@/context/ThemeContext';

export function SetupIcon({ name, color, size = 22 }: { name: 'back' | 'arrow' | 'calendar' | 'wallet' | 'search' | 'check'; color?: string; size?: number }) {
  const { palette } = useTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? palette.green} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === 'back' ? <Path d="m14 5-7 7 7 7"/> : name === 'arrow' ? <Path d="M4 12h16m-6-6 6 6-6 6"/> : name === 'calendar' ? <><Path d="M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/></> : name === 'wallet' ? <><Path d="M20 8H4V5h15M4 8v12h16V8M15 12h6v5h-6Z"/></> : name === 'check' ? <Path d="m5 12 4 4L19 6"/> : <Path d="m20 20-4-4M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>}
  </Svg>;
}

function ProgressPart({ index, step }: { index: number; step: number }) {
  const s = useSetupStyles();
  const fill = useSharedValue(index <= step ? 1 : 0);
  useEffect(() => { fill.value = withTiming(index <= step ? 1 : 0, { duration: 480, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }); }, [index, step, fill]);
  const animated = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return <View style={{ flex: 1, gap: 8 }}>
    <View style={s.progressTrack}><Animated.View style={[s.progressFill, animated]}><LinearGradient colors={['#508C9C', '#803A9D', '#C700A2']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill}/></Animated.View></View>
    <Text style={[s.progressLabel, index === step && s.progressLabelActive]}>{index < step ? '✓' : `0${index + 1}`}  {['Your start', 'Your date', 'Your plan'][index]}</Text>
  </View>;
}
export function SetupProgress({ step }: { step: number }) {
  const s = useSetupStyles();
  return <View accessibilityRole="progressbar" accessibilityLabel="Journey setup" accessibilityValue={{ min: 1, max: 3, now: step + 1, text: `Step ${step + 1} of 3` }} style={s.progress}>
    {[0, 1, 2].map(index => <ProgressPart key={index} index={index} step={step}/>)}
  </View>;
}
export function SetupField({ label, ...props }: TextInputProps & { label: string }) {
  const s = useSetupStyles();
  const { palette } = useTheme();
  return <View style={{ gap: 8 }}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={palette.faint} autoCorrect={false} {...props} style={[s.input, props.style]}/></View>;
}
