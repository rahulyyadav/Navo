import type { OnboardingAnswers, Profile } from '../types/navo';

const levels = new Set(['first-timer', 'day-hiker', 'seasoned', 'high-altitude']);
const stamp = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

/** Stored and cloud documents are untrusted. A malformed record is not a reset instruction. */
export function validOnboarding(value: unknown): value is OnboardingAnswers {
  if (!value || typeof value !== 'object') return false;
  const v = value as OnboardingAnswers;
  return typeof v.completed === 'boolean' && typeof v.fullName === 'string' &&
    (v.level === null || levels.has(v.level)) && Array.isArray(v.goals) && v.goals.every(g => typeof g === 'string') &&
    typeof v.alertsEnabled === 'boolean' && (v.completedAt === null || (typeof v.completedAt === 'string' && stamp(v.completedAt) > 0)) &&
    (v.emergencyContact === null || (typeof v.emergencyContact?.name === 'string' && typeof v.emergencyContact?.phone === 'string'));
}

/** Completion is monotonic. A stale cloud draft must never reopen onboarding. */
export function resolveOnboarding(local: OnboardingAnswers, remote?: unknown): OnboardingAnswers {
  if (!validOnboarding(remote)) return local;
  if (local.completed !== remote.completed) return local.completed ? local : remote;
  return stamp(remote.completedAt) > stamp(local.completedAt) ? remote : local;
}

export function restoreOnboarding(answers: OnboardingAnswers, profile: Profile | null): OnboardingAnswers {
  if (answers.completed || typeof profile?.fullName !== 'string' || !profile.fullName.trim() || !levels.has(profile.level) || !Array.isArray(profile.goals) || !profile.goals.every(g => typeof g === 'string')) return answers;
  // Older builds saved the derived profile separately. Recover completion without discarding its choices.
  return { completed: true, fullName: profile.fullName, level: profile.level, goals: profile.goals,
    emergencyContact: profile.emergencyContact ?? null, alertsEnabled: profile.alertsEnabled === true,
    completedAt: stamp(profile.createdAt) ? profile.createdAt : null };
}

/** Missing device data is not evidence that an existing account is new. */
export function offerInitialOnboarding(answers: OnboardingAnswers, metadata: { creationTime?: string; lastSignInTime?: string }, storageAvailable: boolean, now = Date.now()) {
  if (answers.completed || !storageAvailable) return false;
  const created = stamp(metadata.creationTime), signedIn = stamp(metadata.lastSignInTime);
  return created > 0 && signedIn > 0 && Math.abs(created - signedIn) < 60000 && now >= created && now - created < 86400000;
}
