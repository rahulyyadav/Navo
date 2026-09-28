import { tokenCache } from '@clerk/expo/token-cache';

export { tokenCache };

const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';

// Only the publishable key belongs in a client bundle. The secret key is
// server-only and is deliberately not exposed through EXPO_PUBLIC_*.
export const clerkPublishableKey = rawKey;
export const clerkConfigured = /^pk_(test|live)_[A-Za-z0-9_$-]+$/.test(rawKey);
