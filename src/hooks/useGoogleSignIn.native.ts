import { useCallback, useRef, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { firebaseAuth } from '@/lib/firebase';
import { friendlyAuthError } from '@/services/auth-errors';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export function useGoogleSignIn() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: androidClientId || webClientId || 'missing.apps.googleusercontent.com',
    iosClientId: iosClientId || webClientId || 'missing.apps.googleusercontent.com',
    webClientId: webClientId || 'missing.apps.googleusercontent.com',
    selectAccount: true,
  }, { scheme: 'navo', path: 'oauthredirect' });

  const ready = Boolean(firebaseAuth && request && webClientId && iosClientId && androidClientId);

  const start = useCallback(async () => {
    if (lock.current) return;
    if (!firebaseAuth) {
      setMessage(friendlyAuthError(new Error('auth_not_configured')));
      return;
    }
    if (!webClientId || !iosClientId || !androidClientId || !request) {
      setMessage('Add all three EXPO_PUBLIC_GOOGLE_*_CLIENT_ID values, restart Expo, and try again.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setMessage('Google sign-in was cancelled. You can try again or continue with email.');
        return;
      }
      if (result.type !== 'success') throw new Error('oauth_callback_failed');
      const idToken = result.params.id_token || result.authentication?.idToken;
      const accessToken = result.params.access_token || result.authentication?.accessToken;
      if (!idToken && !accessToken) throw new Error('oauth_callback_failed');
      const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
      await signInWithCredential(firebaseAuth, credential);
    } catch (failure) {
      setMessage(friendlyAuthError(failure, 'We couldn’t finish Google sign-in. Try again or continue with email.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [promptAsync, request]);

  return { busy, message, ready, start };
}
