import { getFirestore } from 'firebase/firestore';
import { firebaseAuth } from '@/lib/firebase';
export { firebaseAuth, firebaseConfigured } from '@/lib/firebase';
export const firestore = firebaseAuth ? getFirestore(firebaseAuth.app) : null;
