import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useFirebaseAuth } from '@/context/AuthContext';
import type { OnboardingAnswers, Profile, TrekGroup } from '@/types/navo';
import {
  buildProfile,
  emptyOnboarding,
  loadOnboarding,
  loadProfile,
  saveOnboarding,
  saveProfile,
} from '@/services/profile';
import { useCloud } from '@/context/CloudContext';
import { friendlyAuthError } from '@/services/auth-errors';

type NavoState = {
  authLoaded: boolean;
  isSignedIn: boolean;
  userId: string;
  email: string;
  imageUrl: string | null;
  profile: Profile | null;
  answers: OnboardingAnswers;
  hydrated: boolean;
  needsOnboarding: boolean;
  groups: TrekGroup[];
  dataLoading: boolean;
  error: string;
  signingOut: boolean;
  completeOnboarding: (next: OnboardingAnswers) => Promise<void>;
  updateAnswers: (patch: Partial<OnboardingAnswers>) => Promise<void>;
  updateGroups: (mutate: (groups: TrekGroup[]) => TrekGroup[]) => Promise<void>;
  setError: (message: string) => void;
  signOut: () => Promise<void>;
};

// Cached per signed-in user. Anything keyed to another userId is ignored, so a
// sign-out or account switch drops the previous data without a reset pass.
type SessionData = {
  userId: string;
  profile: Profile | null;
  answers: OnboardingAnswers;
  groups: TrekGroup[];
};

const NavoContext = createContext<NavoState | null>(null);

export function NavoProvider({ children }: PropsWithChildren) {
<<<<<<< HEAD
  const { loaded: isLoaded, user, signOut } = useFirebaseAuth();
  const isSignedIn = Boolean(user);
  const userId = user?.uid ?? '';
=======
  const { isLoaded, isSignedIn, userId, signOut } = useAuth();
  const { user } = useUser();
  const cloud = useCloud();
>>>>>>> 643afe2 (Updated authentication and UI)
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const data = isSignedIn && session?.userId === userId ? session : null;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const [storedProfile, storedAnswers, storedGroups] = await Promise.all([
          loadProfile(userId),
          loadOnboarding(userId),
          Promise.resolve([] as TrekGroup[]),
        ]);
        if (!active) return;
        setSession({ userId, profile: storedProfile, answers: storedAnswers, groups: storedGroups });
      } catch (failure) {
        if (!active) return;
        setError(friendlyAuthError(failure, 'We couldn’t load your Navo data.'));
        setSession({ userId, profile: null, answers: emptyOnboarding, groups: [] });
      }
    })();
    return () => { active = false; };
  }, [isLoaded, isSignedIn, userId]);

  const persist = useCallback(async (next: OnboardingAnswers) => {
    if (!userId || !user) return;
    const built = buildProfile({
      userId,
      email: user.email ?? '',
      imageUrl: user.photoURL,
      answers: next,
      createdAt: data?.profile?.createdAt,
    });
    if (cloud.ready) await cloud.api('/profile', next, 'PUT');
    await Promise.all([saveOnboarding(userId, next), saveProfile(built)]);
    setSession(current => (current?.userId === userId ? { ...current, answers: next, profile: built } : current));
  }, [userId, user, data?.profile?.createdAt, cloud]);

  const completeOnboarding = useCallback(async (next: OnboardingAnswers) => {
    await persist({ ...next, completed: true, completedAt: new Date().toISOString() });
  }, [persist]);

  const updateAnswers = useCallback(async (patch: Partial<OnboardingAnswers>) => {
    if (!data) return;
    await persist({ ...(cloud.remoteProfile?.onboarding ?? data.answers), ...patch });
  }, [data, persist, cloud.remoteProfile]);

  const updateGroups = useCallback(async () => {
    throw new Error('Use authenticated group actions. Local group editing is disabled.');
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      setSession(null);
      setError('');
    } finally {
      setSigningOut(false);
    }
  }, [signOut]);

  const value = useMemo<NavoState>(() => {
    const answers = cloud.remoteProfile?.onboarding ?? data?.answers ?? emptyOnboarding;
    return {
      authLoaded: isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? '',
<<<<<<< HEAD
      email: user?.email ?? data?.profile?.email ?? '',
      imageUrl: user?.photoURL ?? data?.profile?.imageUrl ?? null,
      profile: data?.profile ?? null,
=======
      email: user?.primaryEmailAddress?.emailAddress ?? data?.profile?.email ?? '',
      imageUrl: user?.hasImage ? user.imageUrl : data?.profile?.imageUrl ?? null,
      profile: user && cloud.remoteProfile?.onboarding ? buildProfile({ userId: userId ?? '', email: user.primaryEmailAddress?.emailAddress ?? '', imageUrl: user.hasImage ? user.imageUrl : null, answers: cloud.remoteProfile.onboarding, createdAt: data?.profile?.createdAt }) : data?.profile ?? null,
>>>>>>> 643afe2 (Updated authentication and UI)
      answers,
      hydrated: data !== null,
      needsOnboarding: Boolean(isSignedIn) && data !== null && !answers.completed,
      groups: cloud.groups,
      dataLoading: Boolean(isSignedIn) && data === null,
      error,
      signingOut,
      completeOnboarding,
      updateAnswers,
      updateGroups,
      setError,
      signOut: handleSignOut,
    };
  }, [cloud, isLoaded, isSignedIn, userId, user, data, error, signingOut, completeOnboarding, updateAnswers, updateGroups, handleSignOut]);

  return <NavoContext.Provider value={value}>{children}</NavoContext.Provider>;
}

export function useNavo() {
  const state = useContext(NavoContext);
  if (!state) throw new Error('NavoProvider is required');
  return state;
}
