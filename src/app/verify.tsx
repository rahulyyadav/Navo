import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/expo';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, LinkAction, Notice, Reveal, useReducedMotion } from '@/components/ui';
import { friendlyAuthError } from '@/services/auth-errors';
import { colors, radius } from '@/theme/tokens';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

function OtpBox({ digit, active, filled }: { digit: string; active: boolean; filled: boolean }) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(filled ? 1 : 0);
  useEffect(() => { lift.value = withTiming(filled ? 1 : 0, { duration: reduced ? 0 : 180 }); }, [filled, lift, reduced]);
  const animated = useAnimatedStyle(() => ({
    borderColor: active ? colors.lime : filled ? 'rgba(228,255,137,0.45)' : 'rgba(255,255,255,0.12)',
    backgroundColor: filled ? 'rgba(228,255,137,0.10)' : 'rgba(25,41,58,0.78)',
    transform: [{ scale: 1 + lift.value * 0.04 }, { translateY: lift.value * -2 }],
  }));
  return (
    <Animated.View style={[styles.box, animated]}>
      <Text style={[styles.boxDigit, filled && styles.boxDigitOn]}>{digit}</Text>
    </Animated.View>
  );
}

export default function VerifyScreen() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const params = useLocalSearchParams<{ email?: string | string[]; mode?: string | string[] }>();
  const email = useMemo(() => {
    const raw = Array.isArray(params.email) ? params.email[0] : params.email;
    return raw ?? '';
  }, [params.email]);
  const mode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === 'signup' ? 'signup' : 'signin';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [waiting, setWaiting] = useState(RESEND_SECONDS);
  const [verified, setVerified] = useState(false);
  const lock = useRef(false);
  const deadline = useRef(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    deadline.current = Date.now() + RESEND_SECONDS * 1000;
    const timer = setInterval(() => setWaiting(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, []);

  async function verify(value: string) {
    if ((!verified && value.length !== CODE_LENGTH) || lock.current) return;
    lock.current = true;
    setVerifying(true);
    setError('');
    try {
      if (mode === 'signup') {
        if (!signUp) throw new Error('inactive');
        const result = verified
          ? await signUp.update({})
          : await signUp.verifications.verifyEmailCode({ code: value });
        if (result.error) throw result.error;
        setVerified(true);
        if (signUp.status !== 'complete') {
          setError('Email verified. Account setup is temporarily unavailable. Please try continuing again after Navo’s sign-up settings are updated, or return to sign in.');
          return;
        }
        const resultFinal = await signUp.finalize();
        if (resultFinal.error) throw resultFinal.error;
      } else {
        if (!signIn) throw new Error('inactive');
        if (signIn.status !== 'complete') {
          const result = await signIn.emailCode.verifyCode({ code: value });
          if (result.error) throw result.error;
        }
        if (signIn.status !== 'complete') {
          setError('Your account requires another verification method. Contact Navo support to finish signing in.');
          return;
        }
        const resultFinal = await signIn.finalize();
        if (resultFinal.error) throw resultFinal.error;
      }
      // The protected navigator chooses onboarding or Discover from the saved profile.
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t finish signing in. Please try again.'));
    } finally {
      lock.current = false;
      setVerifying(false);
    }
  }

  function changeCode(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError('');
    if (digits.length === CODE_LENGTH) void verify(digits);
  }

  async function resend() {
    if (lock.current || waiting > 0 || verified) return;
    lock.current = true;
    setVerifying(true);
    setError('');
    try {
      const result = mode === 'signup'
        ? await signUp?.verifications.sendEmailCode()
        : await signIn?.emailCode.sendCode();
      if (!result) throw new Error('inactive');
      if (result.error) throw result.error;
      deadline.current = Date.now() + RESEND_SECONDS * 1000;
      setWaiting(RESEND_SECONDS);
      setCode('');
      inputRef.current?.focus();
    } catch (failure) {
      setError(friendlyAuthError(failure));
    } finally {
      lock.current = false;
      setVerifying(false);
    }
  }

  function startOver() {
    if (lock.current) return;
    router.replace({ pathname: mode === 'signup' ? '/signup' : '/login', params: { email } });
  }

  const digits = code.split('');

  return (
    <AuthShell
      eyebrow={mode === 'signup' ? 'ALMOST ON THE TRAIL' : 'CHECK YOUR INBOX'}
      title={verified ? "Your email is verified." : "Enter your six-digit code."}
      subtitle={verified ? "One last step to your next adventure." : `We sent a code to ${email || 'your email'}. Use the newest code in your inbox.`}
    >
      <Reveal>
        <Pressable accessibilityLabel="Enter verification code" onPress={() => inputRef.current?.focus()}>
          <View style={styles.otpRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <OtpBox key={index} active={index === digits.length} digit={digits[index] ?? ''} filled={Boolean(digits[index])} />
            ))}
            <TextInput
              autoCapitalize="none"
              autoComplete="one-time-code"
              accessibilityLabel="Six-digit email verification code"
              autoFocus
              caretHidden
              editable={!verifying && !verified}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onChangeText={changeCode}
              ref={inputRef}
              style={styles.otpField}
              textContentType="oneTimeCode"
              value={code}
            />
          </View>
        </Pressable>
      </Reveal>

      <Notice message={error} />

      <Reveal delay={80}>
        <View style={styles.actions}>
          <Button busy={verifying} disabled={verifying || (!verified && digits.length !== CODE_LENGTH)} label={verifying ? 'Connecting…' : verified ? 'Continue to Navo' : 'Verify and continue'} onPress={() => void verify(code)} />
          <View style={styles.secondaryRow}>
            <LinkAction align="left" disabled={waiting > 0 || verifying || verified} label={waiting > 0 ? `Resend code in ${waiting}s` : 'Resend code'} onPress={() => void resend()} />
            <LinkAction align="right" disabled={verifying} label="Change email" onPress={startOver} />
          </View>
        </View>
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  otpRow: { flexDirection: 'row', gap: 9, justifyContent: 'space-between' },
  box: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    height: 66,
    justifyContent: 'center',
  },
  boxDigit: { color: colors.faint, fontSize: 26, fontWeight: '700' },
  boxDigitOn: { color: colors.lime },
  otpField: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    fontSize: 24,
    height: 66,
    opacity: 0,
  },
  actions: { marginTop: 26 },
  secondaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
