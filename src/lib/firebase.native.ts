import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';

// Metro selects Firebase's react-native export at runtime. TypeScript resolves
// the generic web declaration first, so describe the RN-only export here.
const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

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

let auth: Auth | null = null;
if (firebaseApp) {
  try {
    auth = FirebaseAuth.initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = FirebaseAuth.getAuth(firebaseApp);
  }
}

export const firebaseAuth = auth;
