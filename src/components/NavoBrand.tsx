import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

/** The installed app icon paired with a rounded, custom-drawn wordmark. */
export function NavoBrand() {
  const { palette } = useTheme();
  return <View accessible accessibilityRole="image" accessibilityLabel="Navo" style={styles.brand}>
    <Image aria-hidden source={require('../../assets/icon.png')} resizeMode="contain" style={styles.icon}/>
    <Svg aria-hidden width={80} height={27} viewBox="0 0 132 44" fill="none" stroke={palette.green} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 34V13m0 10C5 7 28 7 28 23v11"/>
      <Circle cx={49} cy={23} r={11}/><Path d="M60 13v21M73 13l10 21 10-21"/>
      <Circle cx={116} cy={23} r={11}/>
    </Svg>
  </View>;
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  icon: { width: 32, height: 32 },
});
