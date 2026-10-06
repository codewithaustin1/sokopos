import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  IdTokenResult,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign Firestore sub-millisecond clock drift lease warnings in preview containers
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Detected an update time that is in the future')
    ) {
      // Benign container / iframe micro-clock skew during IndexedDB lease check
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);

// Configure Local Persistence for session longevity
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase auth persistence setting:', err);
  });
}

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore Instance with resilient offline cache and auto-detecting transport
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (err) {
  console.warn('initializeFirestore with persistent cache unavailable, falling back:', err);
  try {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (err2) {
    console.warn('Fallback to standard firestore instance:', err2);
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

// Test Firestore Connection using getDocFromServer per Firebase Integration Skill
export async function testFirebaseConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timed out')), 6000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')).catch(() => {
        // Fallback to getDoc
        return getDoc(doc(db, 'test', 'connection'));
      }),
      timeoutPromise,
    ]);
    return true;
  } catch (error: any) {
    if (
      error?.code === 'unavailable' ||
      error?.message?.includes('offline') ||
      error?.message?.includes('the client is offline')
    ) {
      console.warn('Firestore is running in resilient offline cache mode.');
    } else {
      console.warn('Firestore connection check status:', error?.message || error);
    }
    return false;
  }
}

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
};
export type { FirebaseUser, IdTokenResult };
