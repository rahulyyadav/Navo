import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const manasluImage = require('../../assets/navo-onboarding-himalaya.png');

export default function OnboardingScreen() {
  const start = () => router.replace('/discover');

  return (
    <ImageBackground imageStyle={styles.backgroundImage} source={manasluImage} resizeMode="cover" style={styles.background}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.titleLight}>Find New Places</Text>
          <Text style={styles.titleBold}>your journey</Text>
          <Text style={styles.titleLight}>begins here.</Text>

          <View pointerEvents="none" style={styles.flightPath}>
            <View style={styles.arc} />
            <Text style={styles.airplane}>✈</Text>
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
          <Pressable accessibilityLabel="Previous onboarding page" disabled style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <View style={styles.startTrack}>
            <Pressable
              accessibilityHint="Opens Navo's trip planning experience"
              accessibilityLabel="Start Navo"
              onPress={start}
              style={({ pressed }) => [styles.startCircle, pressed && styles.pressed]}
            >
              <Text style={styles.startPlane}>✈</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={start} style={styles.startCopyButton}>
              <Text style={styles.startText}>Start</Text>
            </Pressable>
            <Pressable accessibilityLabel="Start Navo" onPress={start} style={styles.chevronsButton}>
              <Text style={styles.chevrons}>›››</Text>
            </Pressable>
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
  bottomControls: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 18 },
  backButton: {
    alignItems: 'center', borderColor: 'rgba(196,225,247,0.52)', borderRadius: 50, borderWidth: 1.5,
    height: 78, justifyContent: 'center', opacity: 0.85, width: 78,
  },
  backIcon: { color: '#FFFFFF', fontSize: 37, fontWeight: '200', marginTop: -3 },
  startTrack: {
    alignItems: 'center', borderColor: 'rgba(196,225,247,0.52)', borderRadius: 50, borderWidth: 1.5,
    flex: 1, flexDirection: 'row', height: 78, paddingRight: 17,
  },
  startCircle: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 50, height: 78, justifyContent: 'center',
    shadowColor: '#061829', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.2, shadowRadius: 12, width: 78,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
  startPlane: { color: '#11273A', fontSize: 31, transform: [{ rotate: '-14deg' }] },
  startCopyButton: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'center' },
  startText: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
  chevronsButton: { alignItems: 'center', height: '100%', justifyContent: 'center', minWidth: 50 },
  chevrons: { color: 'rgba(255,255,255,0.46)', fontSize: 31, fontWeight: '200', letterSpacing: -6, marginRight: 4 },
});
