import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '@/components/ui';
import { clamp, sampleRoute, shortestAngle, type RouteModel } from '@/services/trekking/navigation';

function useCamera(progress: number, slope: number, heading: number, reduced: boolean) {
  const [camera, setCamera] = useState({ progress, slope, heading });
  useEffect(() => {
    if (reduced) return;
    let frame: number;
    let previous = 0;
    const move = (time: number) => {
      if (time - previous >= 30) {
        previous = time;
        setCamera(current => ({ progress: current.progress + (progress - current.progress) * 0.12, slope: current.slope + (slope - current.slope) * 0.08, heading: current.heading + shortestAngle(current.heading, heading) * 0.12 }));
      }
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    const finish = setTimeout(() => { cancelAnimationFrame(frame); setCamera({ progress, slope, heading }); }, 1800);
    return () => { cancelAnimationFrame(frame); clearTimeout(finish); };
  }, [progress, slope, heading, reduced]);
  return reduced ? { progress, slope, heading } : camera;
}

/** Original schematic artwork: no map tiles, DEM or provider-derived terrain. */
export function CinematicScene({ route, progress, slope, heading, moving, located, image }: { image?: ImageSourcePropType; route: RouteModel; progress: number; slope: number; heading: number; moving: boolean; located: boolean }) {
  const reduced = useReducedMotion();
  const camera = useCamera(progress, slope, heading, reduced);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!reduced && moving) pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    else { cancelAnimation(pulse); pulse.value = 0; }
    return () => cancelAnimation(pulse);
  }, [pulse, moving, reduced]);
  const avatarMotion = useAnimatedStyle(() => ({ transform: [{ translateY: -pulse.value * 3 }, { rotate: `${Math.sin(camera.heading * Math.PI / 180) * 5}deg` }] }));
  const glowMotion = useAnimatedStyle(() => ({ opacity: 0.12 + pulse.value * 0.12, transform: [{ scale: 1 + pulse.value * 0.2 }] }));
  const origin = sampleRoute(route, camera.progress);
  const ahead = Math.max(1, Math.min(route.total - camera.progress, Math.max(1500, route.total * 0.18)));
  const samples = Array.from({ length: 35 }, (_, i) => {
    const depth = i / 34;
    const point = sampleRoute(route, camera.progress + depth * ahead);
    const east = (point.longitude - origin.longitude) * Math.cos(origin.latitude * Math.PI / 180) * 111320;
    const north = (point.latitude - origin.latitude) * 111320;
    const angle = camera.heading * Math.PI / 180;
    const side = east * Math.cos(angle) - north * Math.sin(angle);
    return { x: 500 + clamp(side / ahead, -0.65, 0.65) * 700 * (1 - depth * 0.55), y: 720 - Math.pow(depth, 0.65) * 410 - clamp((point.elevation - origin.elevation) / ahead, -0.3, 0.3) * 220 };
  });
  const path = samples.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const tilt = clamp(camera.slope, -0.25, 0.25) * 100;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
    {image && <Image source={image} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />}
    <Svg style={[StyleSheet.absoluteFill, { zIndex: 1 }]} width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#8BA8B6" /><Stop offset="0.45" stopColor="#4C6B7B" /><Stop offset="1" stopColor="#142C3B" /></LinearGradient>
        <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#385863" /><Stop offset="1" stopColor="#102733" /></LinearGradient>
        <LinearGradient id="trail" x1="0" y1="1" x2="0" y2="0"><Stop offset="0" stopColor="#E4FF89" /><Stop offset="0.5" stopColor="#E4FF89" stopOpacity={0.75} /><Stop offset="1" stopColor="#E4FF89" stopOpacity={0.08} /></LinearGradient>
        <RadialGradient id="mist"><Stop offset="0" stopColor="#C8D9D8" stopOpacity={0.26} /><Stop offset="1" stopColor="#C8D9D8" stopOpacity={0} /></RadialGradient>
      </Defs>
      <Rect width={1000} height={1000} fill="url(#sky)" opacity={0.62} />
      <Circle cx={750} cy={180} r={85} fill="#DCE4D3" opacity={0.08} />
      <G transform={`translate(0 ${tilt})`}>
        <Path d="M-120 580 65 285 146 365 263 162 350 350 432 268 590 435 696 212 780 315 889 235 1110 560V1000H-120Z" fill="#A3B8BA" opacity={0.2} />
        <Path d="m187 274 76-112 87 188-87-80-26 19-23-26Z M650 280l46-68 84 103-55-34-23 15-15-24Z" fill="#D8E1DC" opacity={0.56} />
        <Path d="M-100 690 42 473 156 533 281 392 354 488 470 369 559 516 642 413 741 494 875 378 1120 698V1000H-100Z" fill="#557C87" opacity={0.45} />
        <Path d="M-100 755 153 529 275 680 402 518 590 724 790 506 1100 751V1000H-100Z" fill="#335B69" opacity={0.65} />
        <Ellipse cx={500} cy={555} rx={720} ry={190} fill="url(#mist)" />
        <Path d="M-100 1050V713Q90 621 252 679T490 685Q684 608 1100 764V1050Z" fill="url(#ground)" />
      </G>
      <Path d={path} fill="none" stroke="#E4FF89" strokeWidth={17} strokeOpacity={0.08} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={path} fill="none" stroke="url(#trail)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {samples.filter((_, i) => i % 7 === 0 && i > 0).map((p, i) => <G key={i} opacity={0.65 - i * 0.12}><Circle cx={p.x} cy={p.y} r={8 - i} fill="#E4FF89" opacity={0.15} /><Circle cx={p.x} cy={p.y} r={2.5} fill="#E4FF89" /></G>)}
      <Ellipse cx={500} cy={739} rx={44} ry={8} fill="#081A21" opacity={0.45} />
    </Svg>
    <View style={styles.anchor}>
      <Animated.View style={[styles.glow, glowMotion]} />
      <Animated.View style={avatarMotion}>
        <Svg width={48} height={60} viewBox="0 0 48 60" fill="none" stroke={located ? '#E4FF89' : '#C9D8DF'} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={24} cy={12} r={5} fill={located ? '#E4FF89' : '#C9D8DF'} stroke="none" />
          <Path d="m22 21-5 14 10 5 4 13m-7-15-7 14m7-29 8 11 8 3m-10-12 7-1-2 10M39 31l-3 25" /><Path d="m19 23-5 1-4 14 7 3" fill="#284934" />
          <Ellipse cx={24} cy={57} rx={16} ry={2} strokeOpacity={0.6} />
        </Svg>
      </Animated.View>
    </View>
  </View>;
}
const styles = StyleSheet.create({ anchor: { zIndex: 2, position: 'absolute', top: '64%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, glow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: '#D5FA82' } });
