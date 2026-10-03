import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';

import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button, Field, LinkAction, Notice, Reveal } from '@/components/ui';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { firebaseAuth } from '@/lib/firebase';
import { friendlyAuthError, normalizeEmail, validEmail } from '@/services/auth-errors';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] ?? '' : params.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestLock = useRef(false);
  const google = useGoogleSignIn();
  const busy = submitting || google.busy;
  const trimmed = normalizeEmail(email);
  const emailInvalid = trimmed.length > 0 && !validEmail(trimmed);

  async function logIn() {
    if (requestLock.current || busy) return;
    if (!validEmail(trimmed)) {
      setError('Enter a valid email address, like you@example.com.');
      return;
    }
    if (!password) {
      setError('Enter your password to continue.');
      return;
    }
    if (!firebaseAuth) {
      setError(friendlyAuthError(new Error('auth_not_configured')));
      return;
    }
    requestLock.current = true;
    setSubmitting(true);
    setError('');
    setNotice('');
    Keyboard.dismiss();
    try {
      await signInWithEmailAndPassword(firebaseAuth, trimmed, password);
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t log you in. Check your details and try again.'));
    } finally {
      requestLock.current = false;
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    if (busy) return;
    if (!validEmail(trimmed)) {
      setError('Enter your email first, then tap “Forgot password?”.');
      return;
    }
    if (!firebaseAuth) {
      setError(friendlyAuthError(new Error('auth_not_configured')));
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordResetEmail(firebaseAuth, trimmed);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t send the reset email. Try again shortly.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow="WELCOME BACK" title="Pick up where you left the trail." subtitle="Log in securely, then get back to your routes, groups, and offline plans.">
      <Reveal>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!busy}
          error={emailInvalid ? 'That doesn’t look like an email address yet.' : undefined}
          inputMode="email"
          keyboardType="email-address"
          label="Email address"
          maxLength={254}
          onChangeText={value => { setEmail(value); setError(''); setNotice(''); }}
          placeholder="you@example.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
      </Reveal>

      <Reveal delay={50}>
        <Field
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!busy}
          label="Password"
          maxLength={128}
          onChangeText={value => { setPassword(value); setError(''); setNotice(''); }}
          onSubmitEditing={() => void logIn()}
          placeholder="Your password"
          returnKeyType="go"
          secureTextEntry
          textContentType="password"
          value={password}
        />
      </Reveal>

      <View style={styles.forgotRow}>
        <LinkAction align="right" disabled={busy} label="Forgot password?" onPress={() => void resetPassword()} />
      </View>

      <Notice message={error || google.message} /><Notice tone="success" message={notice} />

      <Reveal delay={90}>
        <View style={styles.actions}>
          <Button busy={submitting} disabled={busy} label={submitting ? 'Logging you in…' : 'Log in'} onPress={() => void logIn()} />
          <AuthDivider />
          <GoogleButton busy={google.busy} disabled={busy || !google.ready} label="Continue with Google" onPress={() => void google.start()} />
          {!!google.unavailableReason && <Text style={styles.googleHint}>{google.unavailableReason}</Text>}
        </View>
      </Reveal>

      <Reveal delay={140}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>First trek with Navo?</Text>
          <LinkAction disabled={busy} label="Create an account" onPress={() => router.push({ pathname: '/signup', params: { email: trimmed } })} />
        </View>
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 18 },
  forgotRow: { alignItems: 'flex-end', marginTop: -4 },
  footer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 26 },
  footerText: { color: 'rgba(255,255,255,0.64)', fontSize: 15 },
  googleHint: { color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
});
