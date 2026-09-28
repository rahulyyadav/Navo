import { useCallback, useRef, useState } from 'react';
import { useSSO } from '@clerk/expo/experimental';
import { friendlyAuthError } from '@/services/auth-errors';

export function useGoogleSignIn() {
  const { startSSOFlow } = useSSO();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const start = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await startSSOFlow({ strategy: 'oauth_google' });
      if (!result.createdSessionId && !result.signIn?.existingSession && !result.signUp?.existingSession && result.authSessionResult?.type !== 'cancel' && result.authSessionResult?.type !== 'dismiss') {
        setMessage('Google sign-in didn’t complete. Try again or continue with email.');
      }
    } catch (failure) {
      setMessage(friendlyAuthError(failure, 'We couldn’t finish Google sign-in. Try again or continue with email.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [startSSOFlow]);

  return { busy, message, start };
}
