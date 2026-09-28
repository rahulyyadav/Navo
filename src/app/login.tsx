import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSignIn } from '@clerk/expo';

import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button, Field, LinkAction, Notice, Reveal } from '@/components/ui';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { clerkErrorCode, friendlyAuthError, normalizeEmail, validEmail } from '@/services/auth-errors';

export default function LoginScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] ?? '' : params.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const requestLock = useRef(false);
  const google = useGoogleSignIn();
  const busy = sending || google.busy || fetchStatus === 'fetching';
  const trimmed = normalizeEmail(email);
  const emailInvalid = trimmed.length > 0 && !validEmail(trimmed);

  async function sendCode() {
    if (requestLock.current || busy) return;
    if (!validEmail(trimmed)) {
      setError('Enter a valid email address, like you@example.com.');
      return;
    }
    if (!signIn) {
      setError('Navo is still connecting. Try again in a moment.');
      return;
    }
    requestLock.current = true;
    setSending(true);
    try {
    setError('');
    Keyboard.dismiss();
    const { error: failure } = await signIn.emailCode.sendCode({ emailAddress: trimmed });
    setSending(false);
    if (failure) {
      if (clerkErrorCode(failure) === 'form_identifier_not_found') {
        router.push({ pathname: '/signup', params: { email: trimmed } });
        return;
      }
      setError(friendlyAuthError(failure));
      return;
    }
    router.push({ pathname: '/verify', params: { email: trimmed, mode: 'signin' } });
    } catch (failure) {
      setError(friendlyAuthError(failure));
    } finally {
      requestLock.current = false;
      setSending(false);
    }
  }

  return (
    <AuthShell eyebrow="WELCOME BACK" title="Pick up where you left the trail." subtitle="We’ll email you a one-time code. No passwords to remember, even above the cloud line.">
      <Reveal>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!busy}
          error={emailInvalid ? 'That doesn’t look like an email address yet.' : undefined}
          hint="Use the newest code from your inbox."
          inputMode="email"
          keyboardType="email-address"
          label="Email address"
          maxLength={254}
          onChangeText={value => { setEmail(value); setError(''); }}
          onSubmitEditing={() => void sendCode()}
          placeholder="you@example.com"
          returnKeyType="go"
          textContentType="emailAddress"
          value={email}
        />
      </Reveal>

      <Notice message={error || google.message} />

      <Reveal delay={70}>
        <View style={styles.actions}>
          <Button busy={sending} disabled={busy} label={sending ? 'Sending your code…' : 'Email me a code'} onPress={() => void sendCode()} />
          <AuthDivider />
          <GoogleButton busy={google.busy} disabled={busy} label="Continue with Google" onPress={() => void google.start()} />
        </View>
      </Reveal>

      <Reveal delay={130}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>First trek with Navo?</Text>
          <LinkAction disabled={busy} label="Create an account" onPress={() => router.push({ pathname: '/signup', params: { email: trimmed } })} />
        </View>
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 20 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerText: { color: 'rgba(255,255,255,0.64)', fontSize: 15 },
});
