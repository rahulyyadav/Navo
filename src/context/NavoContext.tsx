import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
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
import { unregisterPush } from '@/services/push';
import { useCloud } from '@/context/CloudContext';
import { friendlyAuthError } from '@/services/auth-errors';
import { resolveOnboarding, restoreOnboarding } from '@/services/onboarding-state';

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
  storageAvailable: boolean;
};

const NavoContext = createContext<NavoState | null>(null);

export function NavoProvider({ children }: PropsWithChildren) {
  const { loaded: isLoaded, user, signOut } = useFirebaseAuth();
  const isSignedIn = Boolean(user);
  const userId = user?.uid ?? '';
  const cloud = useCloud();
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
          loadProfile(userId).catch(() => null), // A derived-cache failure must not hide saved completion.
          loadOnboarding(userId),
          Promise.resolve([] as TrekGroup[]),
        ]);
        if (!active) return;
        setSession({ userId, profile: storedProfile, answers: restoreOnboarding(storedAnswers, storedProfile), groups: storedGroups, storageAvailable: true });
      } catch (failure) {
        if (!active) return;
        setError(friendlyAuthError(failure, 'We couldn’t load your Navo data.'));
        setSession({ userId, profile: null, answers: emptyOnboarding, groups: [], storageAvailable: false });
      }
    })();
    return () => { active = false; };
  }, [isLoaded, isSignedIn, userId]);

  const syncingProfile = useRef('');
  const resolvedAnswers = resolveOnboarding(data?.answers ?? emptyOnboarding, cloud.remoteProfile?.onboarding);
  // Cache restored cloud completion before the next offline launch. Account switching cancels state updates.
  useEffect(() => {
    if (!data || !resolvedAnswers.completed || JSON.stringify(data.answers) === JSON.stringify(resolvedAnswers)) return;
    let active = true;
    void saveOnboarding(userId, resolvedAnswers).then(() => {
      if (active) setSession(current => current?.userId === userId ? { ...current, answers: resolvedAnswers } : current);
    }).catch(() => { if (active) setError('Your profile is restored online, but could not be saved on this device. Check device storage before going offline.'); });
    return () => { active = false; };
  }, [data, resolvedAnswers, userId]);
  useEffect(() => {
    if (!cloud.ready || !cloud.remoteProfile || !data?.answers.completed || JSON.stringify(resolveOnboarding(data.answers, cloud.remoteProfile.onboarding)) !== JSON.stringify(data.answers) || JSON.stringify(cloud.remoteProfile.onboarding) === JSON.stringify(data.answers)) return;
    const syncKey = `${userId}/${JSON.stringify(data.answers)}`;
    if (syncingProfile.current === syncKey) return;
    syncingProfile.current = syncKey;
    void cloud.api('/profile', data.answers, 'PUT').catch(() => {
      syncingProfile.current = '';
      setError('Your preparation is saved on this device. Reconnect to sync your profile.');
    });
  }, [cloud, data?.answers, userId]);

  const persist = useCallback(async (next: OnboardingAnswers) => {
    if (!userId || !user) return;
    const built = buildProfile({
      userId,
      email: user.email ?? '',
      imageUrl: user.photoURL,
      answers: next,
      createdAt: data?.profile?.createdAt,
    });
    // Local completion commits first. A failed network request cannot undo it or trap the user.
    await saveOnboarding(userId, next);
    setSession(current => (current?.userId === userId ? { ...current, answers: next, profile: built, storageAvailable: true } : current));
    await saveProfile(built).catch(() => undefined); // Derived cache; answers above remain canonical.
  }, [userId, user, data?.profile?.createdAt]);

  const completeOnboarding = useCallback(async (next: OnboardingAnswers) => {
    await persist({ ...next, completed: true, completedAt: new Date().toISOString() });
  }, [persist]);

  const updateAnswers = useCallback(async (patch: Partial<OnboardingAnswers>) => {
    if (!data) return;
    const previous = resolveOnboarding(data.answers, cloud.remoteProfile?.onboarding);
    await persist({ ...previous, ...patch, ...(previous.completed ? { completed: true, completedAt: new Date().toISOString() } : {}) });
  }, [data, persist, cloud.remoteProfile]);

  const updateGroups = useCallback(async () => {
    throw new Error('Use authenticated group actions. Local group editing is disabled.');
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      if (cloud.ready) await unregisterPush(cloud.api).catch(() => undefined);
      await signOut();
      setSession(null);
      setError('');
    } finally {
      setSigningOut(false);
    }
  }, [signOut, cloud]);

  const value = useMemo<NavoState>(() => {
    const answers = resolveOnboarding(data?.answers ?? emptyOnboarding, cloud.remoteProfile?.onboarding);
    return {
      authLoaded: isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? '',
      email: user?.email ?? data?.profile?.email ?? '',
      imageUrl: user?.photoURL ?? data?.profile?.imageUrl ?? null,
      profile: user && answers.completed ? buildProfile({ userId, email: user.email ?? '', imageUrl: user.photoURL, answers, createdAt: data?.profile?.createdAt }) : data?.profile ?? null,
      answers,
      hydrated: data !== null,
      needsOnboarding: false, // Journey setup now collects only the details needed for the selected trip.
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
