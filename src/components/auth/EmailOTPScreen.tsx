import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type TextInput as NativeTextInput, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { createThemedStyles } from '@/theme/create-styles';
import { TrailArtwork } from './TrailArtwork';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithCustomToken } from 'firebase/auth';
import Svg, { Path } from 'react-native-svg';
import { Text, TextInput } from '@/components/Typography';
import { useReducedMotion } from '@/components/ui';
import { GoogleButton } from './GoogleButton';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { firebaseAuth } from '@/lib/firebase';
import { requestEmailOTP, verifyEmailOTP } from '@/lib/api';
import { normalizeEmail, validEmail, friendlyAuthError, firebaseErrorCode } from '@/services/auth-errors';
import { EmailOTPError, otpDigits } from '@/services/email-otp';

function Icon({ name, color = '#66756C', size = 22 }: { name: 'arrow' | 'mail' | 'check'; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{name === 'arrow' ? <Path d="M5 12h14m-6-6 6 6-6 6"/> : name === 'mail' ? <><Path d="M3 5h18v14H3Z"/><Path d="m3 5 9 8 9-8"/></> : <Path d="m5 12 4 4L19 6"/>}</Svg>;
}

export function EmailOTPScreen() {
  const s = useStyles();
  const { palette, scheme } = useTheme();
  const green = palette.green;
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState(Array.isArray(params.email) ? params.email[0] ?? '' : params.email ?? '');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; email: string; expires: number } | null>(null);
  const [retryAt, setRetryAt] = useState(0), [now, setNow] = useState(() => Date.now());
  const [operation, setOperation] = useState<'sending' | 'verifying' | null>(null);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false), [showCode, setShowCode] = useState(false), [transitioning, setTransitioning] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [compact, setCompact] = useState(false);
  const [motion] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const google = useGoogleSignIn();
  const lock = useRef(false), alive = useRef(true), input = useRef<NativeTextInput>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const normalized = normalizeEmail(email);
  const busy = operation !== null || google.busy || transitioning || signedIn;
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const usable = challenge?.email === normalized && challenge.expires > now;
  const codeStage = challenge !== null;
  const disabled = busy || (showCode ? !usable || code.length !== 6 : !validEmail(normalized) || seconds > 0);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!retryAt && !challenge) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt, challenge]);
  useEffect(() => {
    if (codeStage === showCode) return;
    input.current?.blur();
    const animation = Animated.timing(motion, { toValue: 0, duration: reduced ? 0 : 140, easing: Easing.in(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (!finished || !alive.current) return;
      setShowCode(codeStage);
    });
    return () => animation.stop();
  }, [codeStage, showCode, motion, reduced]);
  useEffect(() => {
    const animation = Animated.timing(motion, { toValue: 1, duration: reduced ? 0 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (!finished || !alive.current) return;
      setTransitioning(false);
    });
    return () => animation.stop();
  }, [showCode, motion, reduced]);

  useEffect(() => {
    if (showCode && !busy) input.current?.focus();
  }, [showCode, busy]);

  async function send() {
    if (lock.current || busy || seconds > 0) return;
    if (!validEmail(normalized)) { setError('Enter a valid email address.'); return; }
    lock.current = true; setOperation('sending'); setError('');
    try {
      const response = await requestEmailOTP(normalized);
      if (!alive.current) return;
      const clock = Date.now(); setNow(clock); setCode('');
      if (!showCode) setTransitioning(true);
      setChallenge({ id: response.challengeId, email: normalized, expires: clock + response.expiresIn * 1000 });
      setRetryAt(clock + response.resendAfter * 1000);
    } catch (failure) {
      if (alive.current) { setError(failure instanceof Error ? failure.message : 'Could not send a code. Please retry.'); if (failure instanceof EmailOTPError && failure.retryAfter) { setNow(Date.now()); setRetryAt(Date.now() + failure.retryAfter * 1000); } }
    } finally { lock.current = false; if (alive.current) setOperation(null); }
  }
  async function verify() {
    if (lock.current || busy) return;
    if (!usable || !challenge) { setError('Request a new verification code first.'); return; }
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    if (!firebaseAuth) { setError('Sign-in is unavailable. Please try again later.'); return; }
    lock.current = true; setOperation('verifying'); setError(''); Keyboard.dismiss();
    let consumed = false;
    try {
      const token = await verifyEmailOTP(challenge.email, challenge.id, code);
      consumed = true;
      if (!alive.current) return;
      await signInWithCustomToken(firebaseAuth, token);
      if (alive.current) setSignedIn(true);
    } catch (failure) {
      if (alive.current) {
        // A consumed proof cannot be reused after a failed Firebase exchange.
        if (consumed) { setTransitioning(true); setChallenge(null); setCode(''); }
        setError(firebaseErrorCode(failure) ? friendlyAuthError(failure, 'Could not finish sign-in. Please request a new code.') : failure instanceof Error ? failure.message : 'Could not verify this code. Please retry.');
        if (failure instanceof EmailOTPError && failure.retryAfter) { setNow(Date.now()); setRetryAt(Date.now() + failure.retryAfter * 1000); }
      }
    } finally { lock.current = false; if (alive.current) setOperation(null); }
  }
  function editEmail() {
    if (busy) return;
    setTransitioning(true); setChallenge(null); setCode(''); setError(''); setFocused(false);
  }

  return <View style={s.page}>
    <StatusBar style={compact && scheme === 'light' ? 'dark' : 'light'}/>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View onLayout={({ nativeEvent }) => setCompact(nativeEvent.layout.height < 560)} style={s.frame}>
        {!compact ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.scene}><TrailArtwork/></View> : null}
        <View style={[s.panel, compact && s.compactPanel]}>
          {!compact ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.wave}><Svg width="100%" height="100%" viewBox="0 0 440 72" preserveAspectRatio="none"><Path d="M0 35C75-25 133 86 231 38S366-5 440 23V72H0Z" fill={palette.background}/></Svg></View> : null}
          <View style={[s.content, { paddingTop: compact ? insets.top + 20 : 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {!compact ? <View style={s.intro}>
              <Text accessibilityRole="header" style={[s.title, width < 360 && { fontSize: 29, lineHeight: 35 }]}>Your next journey{ '\n' }starts here<Text style={{ color: green }}>.</Text></Text>
            </View> : null}
            <View style={s.form}>
              <Animated.View style={{ opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                <View style={s.fieldHeading}>
                  <Text style={s.label}>{showCode ? 'Verification code' : 'Email address'}</Text>
                  {showCode ? <Text numberOfLines={1} ellipsizeMode="middle" style={s.recipient}>{challenge?.email ?? email}</Text> : null}
                </View>
                {showCode ? <View style={s.codeRow}>
                  <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.cells}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={[s.cell, code[i] && s.filledCell, focused && i === Math.min(code.length, 5) && s.activeCell, !!error && s.invalidField]}><Text style={[s.digit, !code[i] && s.emptyDigit]}>{code[i] || '·'}</Text></View>)}</View>
                  <TextInput key="otp" ref={input} accessibilityLabel="6-digit verification code" value={code} onChangeText={value => { setCode(otpDigits(value)); setError(''); }} keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code" autoCorrect={false} autoCapitalize="none" caretHidden selectionColor="transparent" maxLength={12} editable={!busy} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={() => void verify()} style={s.codeInput}/>
                </View> : <View style={[s.emailRow, focused && s.activeCell, !!error && s.invalidField]}>
                  <Icon name="mail" size={20} color={focused ? green : palette.faint}/>
                  <TextInput key="email" ref={input} accessibilityLabel="Email address" placeholder="Email address" placeholderTextColor={palette.faint} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="send" value={email} onChangeText={value => { setEmail(value); setError(''); }} onSubmitEditing={() => void send()} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} editable={!busy} maxLength={254} style={s.emailInput}/>
                </View>}
                <View style={s.feedback}>
                  {error || google.message ? <Text accessibilityRole="alert" style={s.error}>{error || google.message}</Text> : showCode && !usable ? <Text accessibilityRole="alert" style={s.error}>This code has expired. Request a new one below.</Text> : !showCode && seconds > 0 ? <Text accessibilityLiveRegion="polite" style={s.hint}>Try again in {seconds}s.</Text> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={() => void (showCode ? verify() : send())} style={({ pressed }) => [s.primary, disabled && s.primaryInactive, pressed && s.primaryPressed]}>
                  {operation || signedIn ? <ActivityIndicator color="#FFFFFF"/> : null}
                  <Text style={s.primaryText}>{signedIn ? 'Taking you in…' : operation === 'sending' ? 'Sending code…' : operation === 'verifying' ? 'Verifying…' : showCode ? 'Verify' : 'Send OTP'}</Text>
                  {!operation && !signedIn ? <Icon name={showCode ? 'check' : 'arrow'} color="#FFFFFF" size={20}/> : null}
                </Pressable>
                {showCode ? <View style={s.recovery}><Pressable accessibilityRole="button" disabled={busy} onPress={editEmail} style={s.textButton}><Text style={s.secondaryText}>Change email</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={seconds > 0 ? `Resend code in ${seconds} seconds` : 'Resend code'} disabled={busy || seconds > 0} onPress={() => void send()} style={s.textButton}><Text style={[s.resendText, (busy || seconds > 0) && s.muted]}>{seconds > 0 ? `Resend in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Resend code'}</Text></Pressable></View> : null}
              </Animated.View>
              <View style={s.divider}><View style={s.line}/><Text style={s.or}>or</Text><View style={s.line}/></View>
              <GoogleButton label="Continue with Google" onPress={() => void google.start()} busy={google.busy} disabled={busy || !google.ready}/>
              {google.unavailableReason ? <Text style={s.hint}>{google.unavailableReason}</Text> : null}
            </View>
            {!compact ? <Pressable accessibilityRole="button" onPress={() => router.push('/privacy')} style={s.privacy}><Text style={s.privacyText}>Privacy</Text></Pressable> : null}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </View>;
}

const useStyles = createThemedStyles(t => {
const green = t.green;
return StyleSheet.create({
  flex: { flex: 1, minHeight: 0, minWidth: 0 },
  page: { flex: 1, width: '100%', minWidth: 0, overflow: 'hidden', backgroundColor: '#0C6243' },
  frame: { flex: 1, minHeight: 0, width: '100%' },
  scene: { flex: 1, minHeight: 0, overflow: 'hidden' },
  panel: { backgroundColor: t.background, paddingTop: 6 },
  compactPanel: { flex: 1, justifyContent: 'center', paddingTop: 0 },
  wave: { position: 'absolute', top: -55, left: 0, right: 0, height: 60 },
  content: { minWidth: 0, width: '100%', maxWidth: 490, alignSelf: 'center', paddingHorizontal: 24 },
  intro: { marginBottom: 30, flexShrink: 1 },
  title: { color: t.ink, fontSize: 36, lineHeight: 43, fontWeight: '800', letterSpacing: -1.3 },
  form: { gap: 20, minWidth: 0 },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  label: { color: t.secondaryText, fontSize: 13, fontWeight: '600' },
  recipient: { color: t.muted, fontSize: 12, flex: 1, textAlign: 'right' },
  emailRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, minHeight: 56, paddingHorizontal: 16, gap: 12 },
  emailInput: { color: t.ink, fontSize: 16, flex: 1, minWidth: 0, paddingVertical: 16 },
  codeRow: { height: 56 }, cells: { flexDirection: 'row', gap: 8, height: 56 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  filledCell: { backgroundColor: t.mint, borderColor: t.border },
  activeCell: { borderColor: green, backgroundColor: t.surface },
  invalidField: { borderColor: '#B86B60' },
  digit: { color: green, fontSize: 25, fontWeight: '700' }, emptyDigit: { color: t.faint },
  codeInput: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, color: 'transparent', backgroundColor: 'transparent', fontSize: 16 },
  feedback: { minHeight: 24, justifyContent: 'center', paddingVertical: 3 },
  hint: { color: t.muted, fontSize: 12, lineHeight: 18 }, error: { color: t.danger, fontSize: 13, lineHeight: 19 },
  primary: { minHeight: 56, borderRadius: 16, backgroundColor: t.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 16 },
  primaryInactive: { backgroundColor: '#6C8A79' }, primaryPressed: { opacity: .88, transform: [{ scale: .985 }] }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  recovery: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textButton: { minHeight: 44, justifyContent: 'center' }, secondaryText: { color: t.muted, fontSize: 12, fontWeight: '500' },
  resendText: { color: green, fontSize: 12, fontWeight: '600' }, muted: { color: t.muted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: -4 },
  line: { height: 1, flex: 1, backgroundColor: t.border }, or: { color: t.muted, fontSize: 12 },
  privacy: { alignItems: 'center', minHeight: 44, justifyContent: 'center' }, privacyText: { color: t.muted, fontSize: 11 },
});
});
