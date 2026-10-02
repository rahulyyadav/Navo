import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

import { AuthDivider, AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button, Field, LinkAction, Notice, Reveal } from '@/components/ui';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { firebaseAuth } from '@/lib/firebase';
import { friendlyAuthError, normalizeEmail, validEmail } from '@/services/auth-errors';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] ?? '' : params.email ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const requestLock = useRef(false);
  const google = useGoogleSignIn();
  const busy = creating || google.busy;
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
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmation) {
      setError('Those passwords don’t match yet.');
      return;
    }
    if (!firebaseAuth) {
      setError(friendlyAuthError(new Error('auth_not_configured')));
      return;
    }
    requestLock.current = true;
    setCreating(true);
    setError('');
    Keyboard.dismiss();
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
      await updateProfile(credential.user, { displayName: fullName });
      await credential.user.reload();
      // Account creation has succeeded; Groups provides a resend control if delivery fails.
      await sendEmailVerification(credential.user).catch(() => undefined);
    } catch (failure) {
      setError(friendlyAuthError(failure, 'We couldn’t create your account. Please try again.'));
    } finally {
      requestLock.current = false;
      setCreating(false);
    }
  }

  return (
    <AuthShell eyebrow="JOIN NAVO" title="Your first route starts here." subtitle="Create one secure account for your routes, crew, and trip essentials.">
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

      <Reveal delay={45}>
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
          placeholder="you@example.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
      </Reveal>

      <Reveal delay={90}>
        <Field
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!busy}
          hint="Use at least 8 characters."
          label="Password"
          maxLength={128}
          onChangeText={value => { setPassword(value); setError(''); }}
          placeholder="Create a password"
          returnKeyType="next"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
      </Reveal>

      <Reveal delay={120}>
        <Field
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!busy}
          label="Confirm password"
          maxLength={128}
          onChangeText={value => { setConfirmation(value); setError(''); }}
          onSubmitEditing={() => void createAccount()}
          placeholder="Repeat your password"
          returnKeyType="go"
          secureTextEntry
          textContentType="newPassword"
          value={confirmation}
        />
      </Reveal>

      <Notice message={error || google.message} />

      <Reveal delay={150}>
        <View style={styles.actions}>
          <Button busy={creating} disabled={busy} label={creating ? 'Creating your account…' : 'Create account'} onPress={() => void createAccount()} />
          <AuthDivider />
          <GoogleButton busy={google.busy} disabled={busy || !google.ready} label="Sign up with Google" onPress={() => void google.start()} />
          {!!google.unavailableReason && <Text style={styles.googleHint}>{google.unavailableReason}</Text>}
        </View>
      </Reveal>

      <Reveal delay={180}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already trekking with Navo?</Text>
          <LinkAction disabled={busy} label="Log in" onPress={() => router.push({ pathname: '/login', params: { email: trimmed } })} />
        </View>
      </Reveal>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 18 },
  footer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 26 },
  footerText: { color: 'rgba(255,255,255,0.64)', fontSize: 15 },
  googleHint: { color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
});
