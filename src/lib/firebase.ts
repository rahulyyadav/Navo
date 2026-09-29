import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.authDomain
  && firebaseConfig.projectId
  && firebaseConfig.appId,
);

const firebaseApp = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
