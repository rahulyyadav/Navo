import { useTheme } from '@/context/ThemeContext';
import { StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomBackdropProps } from './BottomBackdrop.types';

/** Fade the page behind the dock; keep the solid pill and its icons outside the mask. */
export function BottomBackdrop({ bottomGap, blurTarget }: BottomBackdropProps) {
  const { palette, scheme } = useTheme();
  return <MaskedView accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
    style={[styles.veil, { bottom: -bottomGap }]}
    maskElement={<LinearGradient colors={['transparent', '#000000']} locations={[0, .7]} style={StyleSheet.absoluteFill}/>}>
    <BlurView intensity={30} tint={scheme} blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill}/>
    <LinearGradient colors={[`rgba(${palette.veilRGB},0)`, `rgba(${palette.veilRGB},.72)`]} style={StyleSheet.absoluteFill}/>
  </MaskedView>;
}

const styles = StyleSheet.create({
  veil: { position: 'absolute', top: -30, left: 0, right: 0 },
});
