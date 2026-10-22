import type { OnboardingAnswers } from '@/types/navo';
export type ProfileDetailsDraft = { name: string; contactName: string; phone: string };

/** Updating identity details must not overwrite interests or authentication email. */
export function profileDetails(draft: ProfileDetailsDraft): Pick<OnboardingAnswers, 'fullName' | 'emergencyContact'> {
  const fullName = draft.name.trim(), name = draft.contactName.trim(), phone = draft.phone.trim();
  if (fullName.length < 2 || fullName.length > 60) throw new Error('Enter your name using 2 to 60 characters.');
  if (name.length > 60) throw new Error('Keep the contact name within 60 characters.');
  if (!name && phone) throw new Error('Add a name for your emergency contact.');
  const digits = phone.replace(/\D/g, '').length;
  if (name && (!/^\+?[0-9 ()-]{7,25}$/.test(phone) || digits < 7 || digits > 15)) throw new Error('Enter a valid phone number, including the country code.');
  return { fullName, emergencyContact: name ? { name, phone } : null };
}
