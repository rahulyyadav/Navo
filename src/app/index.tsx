import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useReducedMotion } from '@/components/ui';
import { shouldCompleteSlide } from '@/services/onboarding-slide';
import { colors } from '@/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

const manasluImage = require('../../assets/navo-onboarding-himalaya.png');

const CONTROL_SIZE = 62;


export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const screenRef = useRef({ width, reduced });
  useEffect(() => { screenRef.current = { width, reduced }; }, [width, reduced]);
  const exiting = useRef(false);
  const [pageExit] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);
  const travel = Math.max(trackWidth - CONTROL_SIZE, 0);
  const travelRef = useRef(0);
  const dragStartRef = useRef(0);
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => { travelRef.current = travel; }, [travel]);

  const openLogin = () => {
    if (exiting.current) return;
    exiting.current = true;
    Animated.timing(pageExit, {
      toValue: -screenRef.current.width,
      duration: screenRef.current.reduced !== false ? 0 : 340,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) router.replace('/login'); });
  };

  const animateTo = (toValue: number, onComplete?: () => void) => {
    Animated.timing(progress, {
      duration: screenRef.current.reduced !== false ? 0 : toValue === 0 ? 240 : 140,
      easing: toValue === 0 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      toValue,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const finishGesture = (dx: number) => {
    const maxTravel = travelRef.current;
    const position = Math.min(Math.max(dragStartRef.current + dx, 0), maxTravel);
    const shouldComplete = shouldCompleteSlide(position, maxTravel);

    if (shouldComplete) {
      animateTo(maxTravel, openLogin);
    } else {
      animateTo(0);
    }
  };

  // PanResponder registers these callbacks; it does not read the gesture refs during render.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !exiting.current,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
      onPanResponderGrant: () => {
        progress.stopAnimation((value) => {
          dragStartRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(Math.max(dragStartRef.current + gesture.dx, 0), travelRef.current);
        progress.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => finishGesture(gesture.dx),
      onPanResponderTerminate: () => animateTo(0),
      onPanResponderTerminationRequest: () => false,
    }),
  );

  const onTrackLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setTrackWidth(nativeEvent.layout.width);
  };

  const animationRange = travel > 0 ? travel : 1;
  const fillWidth = progress.interpolate({
    inputRange: [0, animationRange],
    outputRange: [CONTROL_SIZE / 2, trackWidth],
    extrapolate: 'clamp',
  });
  const planeRotation = progress.interpolate({
    inputRange: [0, Math.max(animationRange * 0.35, 1), animationRange],
    outputRange: ['-14deg', '0deg', '0deg'],
    extrapolate: 'clamp',
  });
  const wakeOpacity = progress.interpolate({
    inputRange: [0, Math.max(animationRange * 0.12, 1), animationRange],
    outputRange: [0, 0.55, 0.9],
    extrapolate: 'clamp',
  });
  const promptOpacity = progress.interpolate({
    inputRange: [0, Math.max(animationRange * 0.35, 1)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.revealBackground}>
    <Animated.View style={[styles.page, { transform: [{ translateX: pageExit }] }]}>
    <ImageBackground imageStyle={styles.backgroundImage} source={manasluImage} resizeMode="cover" style={styles.background}>
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.titleLight}>Find New Places</Text>
          <Text style={styles.titleBold}>your journey</Text>
          <Text style={styles.titleLight}>begins here.</Text>

          <View pointerEvents="none" style={styles.flightPath}>
            <View style={styles.arc} />
            <Text style={styles.airplane}>✈︎</Text>
          </View>

          <View style={styles.introRow}>
            <View style={styles.pagination}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.activeLine} />
            </View>
            <Text style={styles.description}>
              Plan each trek, understand the hard parts, and carry the essentials beyond the last signal.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.bottomControls}>
          <Text style={styles.slideHint}>YOUR NEXT CHAPTER STARTS HERE</Text>
          <View
            accessibilityHint="Drag the airplane all the way to the right, then release to open login"
            accessibilityLabel="Slide to begin"
            accessibilityRole="button"
            accessible
            onAccessibilityTap={() => animateTo(travelRef.current, openLogin)}
            {...(Platform.OS === 'web' ? { tabIndex: 0, onKeyDown: (event: { key: string; preventDefault: () => void }) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); animateTo(travelRef.current, openLogin); }
            } } : {})}
            onLayout={onTrackLayout}
            style={styles.startTrack}
            {...panResponder.panHandlers}
          >
            <Animated.View pointerEvents="none" style={[styles.whiteFill, { width: fillWidth }]} />
            <Animated.Text pointerEvents="none" style={[styles.slideText, { opacity: promptOpacity }]}>Slide to begin</Animated.Text>
            <Text pointerEvents="none" style={styles.finishMark}>›</Text>

            <Animated.View
              pointerEvents="none"
              style={[styles.planeControl, { transform: [{ translateX: progress }] }]}
            >
              <Animated.View style={[styles.wake, styles.wakeTop, { opacity: wakeOpacity }]} />
              <Animated.View style={[styles.wake, styles.wakeBottom, { opacity: wakeOpacity }]} />
              <Animated.Text style={[styles.startPlane, { transform: [{ rotate: planeRotation }] }]}>✈︎</Animated.Text>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  revealBackground: { flex: 1, backgroundColor: colors.night, overflow: 'hidden' },
  page: { flex: 1 },
  slideHint: { color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 18 },
  finishMark: { position: 'absolute', right: 24, top: 12, color: colors.onAccent, fontSize: 30 },
  background: { backgroundColor: colors.navy, flex: 1 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(13,20,26,0.42)' },
  backgroundImage: { transform: [{ scale: 1.2 }, { translateY: -44 }] },
  safe: { flex: 1, paddingHorizontal: 25 },
  content: { marginTop: 62 },
  titleLight: { color: '#FFFFFF', fontSize: 45, fontWeight: '300', letterSpacing: -1.5, lineHeight: 49 },
  titleBold: { color: '#FFFFFF', fontSize: 45, fontWeight: '800', letterSpacing: -1.7, lineHeight: 49 },
  flightPath: { height: 135, position: 'absolute', right: -48, top: 80, width: 165 },
  arc: {
    borderColor: 'rgba(228,255,137,0.78)', borderLeftWidth: 0, borderRadius: 100, borderRightWidth: 3,
    borderStyle: 'solid', borderTopWidth: 3, height: 110, opacity: 0.88, position: 'absolute',
    transform: [{ rotate: '18deg' }], width: 162,
  },
  airplane: { color: colors.lime, fontSize: 49, left: -10, position: 'absolute', top: 23, transform: [{ rotate: '-14deg' }] },
  introRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 46 },
  pagination: { alignItems: 'center', flexDirection: 'row', gap: 8, marginRight: 20, marginTop: 14 },
  dot: { backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 3, height: 6, width: 6 },
  activeLine: { backgroundColor: colors.lime, borderRadius: 2, height: 4, width: 48 },
  description: { color: 'rgba(255,255,255,0.84)', flex: 1, fontSize: 16, fontWeight: '400', lineHeight: 24, maxWidth: 250 },
  spacer: { flex: 1 },
  bottomControls: { paddingBottom: 16, width: '100%' },
  startTrack: {
    backgroundColor: colors.lime, borderRadius: 40, height: CONTROL_SIZE, overflow: 'hidden', position: 'relative', width: '100%',
  },
  whiteFill: { backgroundColor: '#FFFFFF', bottom: 0, left: 0, position: 'absolute', top: 0 },
  slideText: {
    color: colors.onAccent, fontSize: 16, fontWeight: '600', left: CONTROL_SIZE, lineHeight: CONTROL_SIZE,
    position: 'absolute', right: CONTROL_SIZE, textAlign: 'center',
  },
  planeControl: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(13,20,26,0.12)', borderRadius: CONTROL_SIZE / 2,
    borderWidth: 1, height: CONTROL_SIZE,
    justifyContent: 'center', left: 0, position: 'absolute', top: 0, width: CONTROL_SIZE,
  },
  startPlane: { color: colors.onAccent, fontSize: 27, zIndex: 2 },
  wake: { backgroundColor: 'rgba(25,41,58,0.66)', borderRadius: 2, height: 2, left: -27, position: 'absolute' },
  wakeTop: { top: 24, width: 36 },
  wakeBottom: { bottom: 24, left: -20, width: 29 },
});
