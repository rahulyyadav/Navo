import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const Trail = Animated.createAnimatedComponent(Path);
const Halo = Animated.createAnimatedComponent(Circle);

/** A Nepal-inspired Himalayan landscape, drawn locally and animated on the UI thread. */
export function TrailArtwork() {
  const reduced = useReducedMotion();
  const travel = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    travel.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false, undefined, ReduceMotion.System);
    return () => { cancelAnimation(travel); travel.value = 0; };
  }, [reduced, travel]);
  const trailProps = useAnimatedProps(() => ({ strokeDashoffset: -travel.value * 48 }));
  const haloProps = useAnimatedProps(() => ({ r: 10 + travel.value * 14, opacity: (1 - travel.value) * .4 }));

  return <Svg width="100%" height="100%" viewBox="0 0 440 430" preserveAspectRatio="xMidYMid slice" fill="none">
    <Rect width="440" height="430" fill={lightTheme.green}/>
    <Circle cx="337" cy="93" r="33" fill="#D5E9D8" fillOpacity=".9"/>
    <G stroke="#B8D7C5" strokeOpacity=".18" strokeLinecap="round">
      <Path d="M-20 93h103m-58 10h85M175 58h59m-33 10h61M361 145h99"/>
    </G>
    <Path d="m-30 289 110-137 61 65L236 69l107 143 50-54 81 116v156H-30Z" fill="#5A977E"/>
    <Path d="m174 165 62-96 71 95-41-25-18 12-19-30-18 31-16-3Z" fill="#E7F0E4"/>
    <Path d="m29 216 51-64 49 52-23-9-12 8-15-22-16 21-15-2Z" fill="#C4DCCD"/>
    <Path d="m236 69 12 82 18-12 41 25Z" fill="#C4DCCD"/>
    <Path d="M-20 341 95 245l62 54 109-116 100 118 94-45v174H-20Z" fill="#28785A"/>
    <Path d="m207 246 59-63 49 58-29-13-14 13-15-24-21 23Z" fill="#B6D5BF"/>
    <Path d="M-20 370C48 298 102 340 161 328S243 254 310 290s100 42 150 4v136H-20Z" fill="#155F44"/>
    <Path d="M68 435C42 399 82 374 127 371s57-22 51-43-3-33 25-37 65-7 61-32 16-36 36-37" stroke="#91BA9C" strokeWidth="13" strokeLinecap="round" strokeOpacity=".2"/>
    <Trail animatedProps={trailProps} d="M68 435C42 399 82 374 127 371s57-22 51-43-3-33 25-37 65-7 61-32 16-36 36-37" stroke="#E0EDCF" strokeWidth="2.5" strokeDasharray="3 9" strokeLinecap="round"/>
    <Halo animatedProps={haloProps} cx="300" cy="222" fill="#DCECBF"/>
    <Circle cx="300" cy="222" r="5" fill="#F0F5DB"/>
    <Circle cx="300" cy="222" r="2" fill={lightTheme.green}/>
    <G stroke="#A3C2A9" strokeWidth="1.3" strokeLinecap="round">
      <Path d="M61 273v51m67-64v46M61 279q32 8 67-13"/>
    </G>
    <Path d="m66 281 10 1-2 13-9-3Z" fill="#E4EBD5"/><Path d="m80 282 10-1-1 13-10 1Z" fill="#91B9A7"/><Path d="m94 280 10-3 2 12-10 4Z" fill="#C8D5A4"/><Path d="m109 275 10-4 3 12-10 4Z" fill="#E2E9D1"/>
    <G fill="#0A503A"><Path d="m367 333 12-24 12 24h-8l13 20h-34l13-20Zm-17 26 9-18 9 18h-6l10 16h-26l10-16Z"/></G>
  </Svg>;
}
