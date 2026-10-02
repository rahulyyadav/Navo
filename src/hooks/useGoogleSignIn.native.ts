import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { friendlyAuthError } from '@/services/auth-errors';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const developmentBuild = Constants.executionEnvironment !== 'storeClient';

export function useGoogleSignIn() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const ready = Boolean(firebaseAuth && developmentBuild && webClientId && (Platform.OS !== 'ios' || iosClientId));
  const unavailableReason = !developmentBuild
    ? 'Google sign-in needs a Navo development build. Use email in Expo Go.'
    : !webClientId || (Platform.OS === 'ios' && !iosClientId)
      ? 'Google sign-in needs the app’s OAuth client IDs before this build can use it.'
      : '';
  const start = useCallback(async () => {
    if (lock.current) return;
    if (!developmentBuild) { setMessage('Google sign-in needs the Navo development app. You can continue with email in Expo Go.'); return; }
    if (!firebaseAuth || !webClientId || (Platform.OS === 'ios' && !iosClientId)) {
      setMessage('Google sign-in is not configured for this build yet. Continue with email.'); return;
    }
    lock.current = true; setBusy(true); setMessage('');
    try {
      // Keep the native module out of the Expo Go startup path.
      const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId, ...(iosClientId ? { iosClientId } : {}) });
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) { setMessage('Google sign-in was cancelled. You can try again or continue with email.'); return; }
      if (!result.data.idToken) throw new Error('oauth_callback_failed');
      await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(result.data.idToken));
    } catch (failure) {
      setMessage(friendlyAuthError(failure, 'Google sign-in could not finish. Check this build’s OAuth configuration or continue with email.'));
    } finally { lock.current = false; setBusy(false); }
  }, []);
  return { busy, message, ready, unavailableReason, start };
}
