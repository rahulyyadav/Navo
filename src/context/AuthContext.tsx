import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';

import { firebaseAuth, firebaseConfigured } from '@/lib/firebase';

type AuthState = {
  configured: boolean;
  loaded: boolean;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loaded, setLoaded] = useState(!firebaseConfigured);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, nextUser => {
      setUser(nextUser);
      setLoaded(true);
    });
  }, []);

  const value = useMemo<AuthState>(() => ({
    configured: firebaseConfigured,
    loaded,
    user,
    signOut: async () => {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    },
  }), [loaded, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
