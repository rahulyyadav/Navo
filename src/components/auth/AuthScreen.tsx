import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '@/theme/tokens';

type AuthScreenProps = { mode: 'login' | 'signup' };

export function AuthScreen({ mode }: AuthScreenProps) {
  const [identity, setIdentity] = useState('');
  const [error, setError] = useState('');
  const entrance = useRef(new Animated.Value(0)).current;
  const focus = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const isLogin = mode === 'login';

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const animateFocus = (toValue: number) => {
    Animated.timing(focus, {
      duration: 180,
      easing: Easing.out(Easing.quad),
      toValue,
      useNativeDriver: false,
    }).start();
  };

  const showInputError = () => {
    setError('Enter your username or email to continue.');
    Animated.sequence([
      Animated.timing(shake, { duration: 55, toValue: -7, useNativeDriver: true }),
      Animated.timing(shake, { duration: 70, toValue: 7, useNativeDriver: true }),
      Animated.timing(shake, { duration: 70, toValue: -4, useNativeDriver: true }),
      Animated.timing(shake, { duration: 55, toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const continueToApp = () => {
    if (!identity.trim()) {
      showInputError();
      return;
    }
    router.replace('/discover');
  };

  const inputBorderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.line, colors.forest],
  });
  const inputBackground = focus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#FBFFF1'],
  });
  const contentMotion = {
    opacity: entrance,
    transform: [{
      translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
    }],
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, contentMotion]}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandLetter}>N</Text>
                <View style={styles.brandPeak} />
              </View>
              <View>
                <Text style={styles.brandName}>NAVO</Text>
                <Text style={styles.brandTag}>TREK NEPAL SAFELY</Text>
              </View>
            </View>

            <View style={styles.headingBlock}>
              <Text style={styles.eyebrow}>{isLogin ? 'GOOD TO SEE YOU' : 'START YOUR JOURNEY'}</Text>
              <Text style={styles.title}>{isLogin ? 'Welcome back.' : 'Create your account.'}</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Your next trail is closer than it looks.' : 'One account for every route, plan, and safe return.'}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <Text style={styles.inputLabel}>Username or email</Text>
              <Animated.View style={[styles.inputShell, { backgroundColor: inputBackground, borderColor: inputBorderColor }]}>
                <TextInput
                  accessibilityLabel="Username or email"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  inputMode="email"
                  onBlur={() => animateFocus(0)}
                  onChangeText={(value) => {
                    setIdentity(value);
                    if (error) setError('');
                  }}
                  onFocus={() => animateFocus(1)}
                  onSubmitEditing={continueToApp}
                  placeholder="you@example.com"
                  placeholderTextColor="#929B91"
                  returnKeyType="go"
                  selectionColor={colors.forest}
                  style={styles.input}
                  value={identity}
                />
                <View style={styles.inputArrowCircle}>
                  <Text style={styles.inputArrow}>→</Text>
                </View>
              </Animated.View>
              <Text accessibilityLiveRegion="polite" style={[styles.error, !error && styles.errorHidden]}>{error || ' '}</Text>
            </Animated.View>

            <Pressable
              accessibilityRole="button"
              onPress={continueToApp}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>{isLogin ? 'Log in' : 'Create account'}</Text>
              <Text style={styles.primaryButtonArrow}>↗</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              accessibilityLabel={`${isLogin ? 'Log in' : 'Sign up'} with Google`}
              accessibilityRole="button"
              onPress={() => router.replace('/discover')}
              style={({ pressed }) => [styles.googleButton, pressed && styles.googlePressed]}
            >
              <View style={styles.googleMark}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.googleText}>{isLogin ? 'Log in' : 'Sign up'} with Google</Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>{isLogin ? 'New to Navo?' : 'Already have an account?'}</Text>
              <Pressable
                accessibilityRole="link"
                hitSlop={10}
                onPress={() => router.replace(isLogin ? '/signup' : '/login')}
              >
                <Text style={styles.switchAction}>{isLogin ? 'Create account' : 'Log in'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1, overflow: 'hidden' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 30 },
  content: { alignSelf: 'center', maxWidth: 440, width: '100%' },
  glowTop: {
    backgroundColor: '#DEFF7A', borderRadius: 180, height: 300, opacity: 0.27, position: 'absolute',
    right: -175, top: -125, width: 300,
  },
  glowBottom: {
    backgroundColor: '#CDDED3', borderRadius: 140, bottom: -145, height: 280, left: -160,
    opacity: 0.38, position: 'absolute', width: 280,
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 54 },
  brandMark: {
    alignItems: 'center', backgroundColor: colors.forest, borderRadius: 17, height: 52,
    justifyContent: 'center', overflow: 'hidden', width: 52,
  },
  brandLetter: { color: colors.white, fontSize: 25, fontWeight: '800', letterSpacing: -2, zIndex: 2 },
  brandPeak: {
    backgroundColor: '#DEFF7A', bottom: -11, height: 27, position: 'absolute',
    transform: [{ rotate: '45deg' }], width: 27,
  },
  brandName: { color: colors.ink, fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  brandTag: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.35, marginTop: 3 },
  headingBlock: { marginBottom: 35 },
  eyebrow: { color: colors.moss, fontSize: 11, fontWeight: '800', letterSpacing: 2.2, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 40, fontWeight: '700', letterSpacing: -1.5, lineHeight: 45 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12, maxWidth: 340 },
  inputLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 9 },
  inputShell: {
    alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', height: 64, paddingHorizontal: 18,
  },
  input: { color: colors.ink, flex: 1, fontSize: 16, height: '100%', padding: 0 },
  inputArrowCircle: {
    alignItems: 'center', backgroundColor: colors.mist, borderRadius: 18, height: 36, justifyContent: 'center', width: 36,
  },
  inputArrow: { color: colors.forest, fontSize: 20, marginTop: -2 },
  error: { color: '#A24E32', fontSize: 12, marginBottom: 5, marginTop: 7, minHeight: 15 },
  errorHidden: { opacity: 0 },
  primaryButton: {
    ...shadow, alignItems: 'center', backgroundColor: colors.forest, borderRadius: radius.pill,
    flexDirection: 'row', height: 62, justifyContent: 'center', marginTop: 4,
  },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  primaryButtonArrow: { color: '#DEFF7A', fontSize: 21, marginLeft: 10, marginTop: -2 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 13, marginVertical: 24 },
  divider: { backgroundColor: colors.line, flex: 1, height: 1 },
  dividerText: { color: '#8C958C', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  googleButton: {
    alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: radius.pill,
    borderWidth: 1.25, flexDirection: 'row', height: 62, justifyContent: 'center',
  },
  googlePressed: { backgroundColor: '#F0F3EC', transform: [{ scale: 0.985 }] },
  googleMark: { alignItems: 'center', height: 25, justifyContent: 'center', marginRight: 11, width: 25 },
  googleLetter: { color: '#4285F4', fontSize: 21, fontWeight: '800' },
  googleText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 29 },
  switchPrompt: { color: colors.muted, fontSize: 14 },
  switchAction: { color: colors.forest, fontSize: 14, fontWeight: '800', marginLeft: 6, textDecorationLine: 'underline' },
});
