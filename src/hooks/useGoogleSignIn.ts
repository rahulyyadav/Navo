import { useCallback, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { firebaseAuth } from '@/lib/firebase';
import { friendlyAuthError } from '@/services/auth-errors';

export function useGoogleSignIn() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const start = useCallback(async () => {
    if (lock.current) return;
    if (!firebaseAuth) {
      setMessage(friendlyAuthError(new Error('auth_not_configured')));
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
    } catch (failure) {
      setMessage(friendlyAuthError(failure, 'We couldn’t finish Google sign-in. Try again or continue with email.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, message, ready: Boolean(firebaseAuth), unavailableReason: '', start };
}
