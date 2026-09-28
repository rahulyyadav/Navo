import { dropRaw, readJSON, writeJSON } from '@/lib/storage';
import type { OnboardingAnswers, Profile } from '@/types/navo';

const profileKey = (userId: string) => `profile:${userId}`;
const onboardingKey = (userId: string) => `onboarding:${userId}`;

export const emptyOnboarding: OnboardingAnswers = {
  completed: false,
  fullName: '',
  level: null,
  goals: [],
  emergencyContact: null,
  alertsEnabled: false,
  completedAt: null,
};

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  return readJSON<Profile>(profileKey(userId));
}

export async function saveProfile(profile: Profile): Promise<void> {
  await writeJSON(profileKey(profile.id), profile);
}

export async function loadOnboarding(userId: string): Promise<OnboardingAnswers> {
  const stored = await readJSON<OnboardingAnswers>(onboardingKey(userId));
  return stored ? { ...emptyOnboarding, ...stored } : { ...emptyOnboarding };
}

export async function saveOnboarding(userId: string, answers: OnboardingAnswers): Promise<void> {
  await writeJSON(onboardingKey(userId), answers);
}

export async function clearUserData(userId: string): Promise<void> {
  await dropRaw(profileKey(userId));
  await dropRaw(onboardingKey(userId));
}

export function buildProfile(input: {
  userId: string;
  email: string;
  imageUrl: string | null;
  answers: OnboardingAnswers;
  createdAt?: string;
}): Profile {
  return {
    id: input.userId,
    fullName: input.answers.fullName.trim(),
    email: input.email,
    imageUrl: input.imageUrl,
    level: input.answers.level ?? 'first-timer',
    goals: input.answers.goals,
    emergencyContact: input.answers.emergencyContact?.name.trim()
      ? { name: input.answers.emergencyContact.name.trim(), phone: input.answers.emergencyContact.phone.trim() }
      : null,
    alertsEnabled: input.answers.alertsEnabled,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
