import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const manasluImage = require('../../assets/navo-onboarding-himalaya.png');

const CONTROL_SIZE = 62;
const COMPLETE_AT = 0.82;

export default function OnboardingScreen() {
  const [trackWidth, setTrackWidth] = useState(0);
  const travel = Math.max(trackWidth - CONTROL_SIZE, 0);
  const travelRef = useRef(0);
  const dragStartRef = useRef(0);
  const progress = useRef(new Animated.Value(0)).current;
  travelRef.current = travel;

  const openLogin = () => router.replace('/login');

  const animateTo = (toValue: number, onComplete?: () => void) => {
    Animated.timing(progress, {
      duration: toValue === 0 ? 360 : 260,
      easing: toValue === 0 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      toValue,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const finishGesture = (dx: number, velocityX: number) => {
    const maxTravel = travelRef.current;
    const position = Math.min(Math.max(dragStartRef.current + dx, 0), maxTravel);
    const shouldComplete = maxTravel > 0 && (position >= maxTravel * COMPLETE_AT || (position > maxTravel * 0.55 && velocityX > 0.65));

    if (shouldComplete) {
      animateTo(maxTravel, openLogin);
    } else {
      animateTo(0);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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
      onPanResponderRelease: (_, gesture) => finishGesture(gesture.dx, gesture.vx),
      onPanResponderTerminate: (_, gesture) => finishGesture(gesture.dx, gesture.vx),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

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
    outputRange: ['-14deg', '24deg', '24deg'],
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
    <ImageBackground imageStyle={styles.backgroundImage} source={manasluImage} resizeMode="cover" style={styles.background}>
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
          <View
            accessibilityHint="Drag the airplane to the right to continue"
            accessibilityLabel="Slide to begin"
            accessibilityRole="button"
            accessible
            onAccessibilityTap={() => animateTo(travelRef.current, openLogin)}
            onLayout={onTrackLayout}
            style={styles.startTrack}
            {...panResponder.panHandlers}
          >
            <Animated.View pointerEvents="none" style={[styles.whiteFill, { width: fillWidth }]} />
            <Animated.Text pointerEvents="none" style={[styles.slideText, { opacity: promptOpacity }]}>Slide to begin</Animated.Text>

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
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#193A5D', flex: 1 },
  backgroundImage: { transform: [{ scale: 1.2 }, { translateY: -44 }] },
  safe: { flex: 1, paddingHorizontal: 25 },
  content: { marginTop: 62 },
  titleLight: { color: '#FFFFFF', fontSize: 45, fontWeight: '300', letterSpacing: -1.5, lineHeight: 49 },
  titleBold: { color: '#FFFFFF', fontSize: 45, fontWeight: '800', letterSpacing: -1.7, lineHeight: 49 },
  flightPath: { height: 135, position: 'absolute', right: -48, top: 80, width: 165 },
  arc: {
    borderColor: 'rgba(255,255,255,0.72)', borderLeftWidth: 0, borderRadius: 100, borderRightWidth: 3,
    borderStyle: 'solid', borderTopWidth: 3, height: 110, opacity: 0.88, position: 'absolute',
    transform: [{ rotate: '18deg' }], width: 162,
  },
  airplane: { color: '#FFFFFF', fontSize: 49, left: -10, position: 'absolute', top: 23, transform: [{ rotate: '-14deg' }] },
  introRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 46 },
  pagination: { alignItems: 'center', flexDirection: 'row', gap: 8, marginRight: 20, marginTop: 14 },
  dot: { backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 3, height: 6, width: 6 },
  activeLine: { backgroundColor: '#FFFFFF', borderRadius: 2, height: 4, width: 48 },
  description: { color: 'rgba(255,255,255,0.88)', flex: 1, fontSize: 16, fontWeight: '400', lineHeight: 24, maxWidth: 250 },
  spacer: { flex: 1 },
  bottomControls: { paddingBottom: 16, width: '100%' },
  startTrack: {
    backgroundColor: '#DEFF7A', borderRadius: 40, height: CONTROL_SIZE, overflow: 'hidden', position: 'relative', width: '100%',
  },
  whiteFill: { backgroundColor: '#FFFFFF', bottom: 0, left: 0, position: 'absolute', top: 0 },
  slideText: {
    color: '#25301D', fontSize: 16, fontWeight: '600', left: CONTROL_SIZE, lineHeight: CONTROL_SIZE,
    position: 'absolute', right: CONTROL_SIZE, textAlign: 'center',
  },
  planeControl: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(37,48,29,0.08)', borderRadius: CONTROL_SIZE / 2,
    borderWidth: 1, height: CONTROL_SIZE,
    justifyContent: 'center', left: 0, position: 'absolute', top: 0, width: CONTROL_SIZE,
  },
  startPlane: { color: '#25301D', fontSize: 27, zIndex: 2 },
  wake: { backgroundColor: 'rgba(37,48,29,0.72)', borderRadius: 2, height: 2, left: -27, position: 'absolute' },
  wakeTop: { top: 24, width: 36 },
  wakeBottom: { bottom: 24, left: -20, width: 29 },
});
