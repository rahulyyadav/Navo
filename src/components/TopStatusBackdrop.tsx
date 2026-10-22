import { useTheme } from '@/context/ThemeContext';
import { Platform, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

/** Keep scrolling imagery quiet beneath the iPhone's system status indicators. */
export function TopStatusBackdrop({ topInset }: { topInset: number }) {
  const { palette, scheme } = useTheme();
  if (Platform.OS !== 'ios' || topInset <= 0) return null;
  return <MaskedView accessible={false} accessibilityElementsHidden pointerEvents="none"
    style={[styles.overlay, { height: topInset + 20 }]}
    maskElement={<LinearGradient colors={['#000000', '#000000', 'transparent']} locations={[0, .65, 1]} style={StyleSheet.absoluteFill}/>}>
    <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill}/>
    <LinearGradient colors={[`rgba(${palette.veilRGB},.92)`, `rgba(${palette.veilRGB},.45)`]} style={StyleSheet.absoluteFill}/>
  </MaskedView>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
});
