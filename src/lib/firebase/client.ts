import { getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfigured } from '@/lib/firebase';

// Share the persistent Firebase session used by login on each platform.
export { firebaseAuth, firebaseConfigured } from '@/lib/firebase';
export const firestore = firebaseConfigured ? getFirestore(getApp()) : null;
