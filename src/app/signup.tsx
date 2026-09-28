import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSignUp } from '@clerk/expo';

import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button, Field, LinkAction, Notice, Reveal } from '@/components/ui';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { clerkErrorCode, friendlyAuthError, normalizeEmail, validEmail } from '@/services/auth-errors';
import { splitName } from '@/services/profile';

export default function SignupScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] ?? '' : params.email ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const requestLock = useRef(false);
  const google = useGoogleSignIn();
  const busy = creating || google.busy || fetchStatus === 'fetching';
  const trimmed = normalizeEmail(email);
  const emailInvalid = trimmed.length > 0 && !validEmail(trimmed);

  async function createAccount() {
    if (requestLock.current || busy) return;
    const fullName = name.trim();
    if (fullName.length < 2 || fullName.length > 100) {
      setError('Tell us your name using 2–100 characters.');
      return;
    }
    if (!validEmail(trimmed)) {
      setError('Enter a valid email address, like you@example.com.');
      return;
    }
    if (!signUp) {
      setError('Navo is still connecting. Try again in a moment.');
      return;
    }
    requestLock.current = true;
    setCreating(true);
    try {
    setError('');
    Keyboard.dismiss();

    const { firstName, lastName } = splitName(fullName);
    const { error: createError } = await signUp.create({ emailAddress: trimmed, firstName, lastName });
    if (createError) {
      setCreating(false);
      if (clerkErrorCode(createError) === 'identifier_already_exists') {
        router.replace({ pathname: '/login', params: { email: trimmed } });
        return;
      }
      setError(friendlyAuthError(createError));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    setCreating(false);
    if (sendError) {
      setError(friendlyAuthError(sendError));
      return;
    }
    router.push({ pathname: '/verify', params: { email: trimmed, mode: 'signup' } });
    } catch (failure) {
      setError(friendlyAuthError(failure));
    } finally {
      requestLock.current = false;
      setCreating(false);
    }
  }

  return (
    <AuthShell eyebrow="JOIN NAVO" title="Your first route starts with an email." subtitle="No password, no forms to forget. We’ll send a six-digit code and you’re on the trail.">
      <Reveal>
        <Field
          autoCapitalize="words"
          autoComplete="name"
          editable={!busy}
          hint="This is the name your trek group will see."
          label="Your name"
          maxLength={100}
          onChangeText={value => { setName(value); setError(''); }}
          placeholder="Aasha Gurung"
          returnKeyType="next"
          textContentType="name"
          value={name}
        />
      </Reveal>

      <Reveal delay={60}>
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
          onChangeText={value => { setEmail(value); setError(''); }}
          onSubmitEditing={() => void createAccount()}
          placeholder="you@example.com"
          returnKeyType="go"
          textContentType="emailAddress"
          value={email}
        />
      </Reveal>

      <Notice message={error || google.message} />

      <Reveal delay={120}>
        <View style={styles.actions}>
          <Button busy={creating} disabled={busy} label={creating ? 'Creating your account…' : 'Send my code'} onPress={() => void createAccount()} />
          <AuthDivider />
          <GoogleButton busy={google.busy} disabled={busy} label="Continue with Google" onPress={() => void google.start()} />
        </View>
      </Reveal>

      <Reveal delay={170}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already trekking with Navo?</Text>
          <LinkAction disabled={busy} label="Log in" onPress={() => router.push({ pathname: '/login', params: { email: trimmed } })} />
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
