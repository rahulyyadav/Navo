import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;
// Clerk owns durable login. Firebase receives a fresh custom session after Clerk restores.
export const firebaseAuth = app ? (() => {
  try { return initializeAuth(app, { persistence: inMemoryPersistence }); }
  catch { return getAuth(app); }
})() : null;
export const firestore = app ? getFirestore(app) : null;
