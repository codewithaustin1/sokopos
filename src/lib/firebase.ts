import '../storageGuard';
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
  memoryLocalCache,
  doc,
  getDocFromServer,
  getDoc,
  Firestore,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore logger warnings in preview / iframe environments
try {
  setLogLevel('silent');
} catch {
  // Ignored if unsupported
}

// Suppress benign Firestore sub-millisecond clock drift lease warnings in preview containers
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const isBenignClockSkew = (...args: any[]) => {
    return args.some((arg) => {
      const str = typeof arg === 'string' ? arg : (arg?.message || String(arg) || '');
      return str.includes('Detected an update time that is in the future');
    });
  };

  console.error = (...args: any[]) => {
    if (isBenignClockSkew(...args)) {
      // Benign container / iframe micro-clock skew during IndexedDB lease check
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (isBenignClockSkew(...args)) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Determine active auth domain:
// When accessed via a verified custom domain (e.g. sokoplus.co.ke), Firebase Hosting
// automatically proxies /__/auth/handler. Using the custom domain as the authDomain ensures
// the Google OAuth popup displays "to continue to sokoplus.co.ke" instead of ".firebaseapp.com".
const resolvedAuthDomain = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'sokoplus.co.ke' || host === 'www.sokoplus.co.ke' || host.endsWith('.sokoplus.co.ke')) {
      return host;
    }
  }
  return (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfig as any).authDomain || 'gen-lang-client-0820403611.firebaseapp.com';
})();

const effectiveFirebaseConfig = {
  ...firebaseConfig,
  authDomain: resolvedAuthDomain,
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(effectiveFirebaseConfig) : getApp();

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

// Evict any stale or bloated Firestore client state from localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToPurge: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('firestore_clients_') ||
          k.startsWith('firestore_mutations_') ||
          k.startsWith('firestore_'))
      ) {
        keysToPurge.push(k);
      }
    }
    keysToPurge.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Storage cleanup note:', e);
  }
}

// Firestore Instance with memory-safe local cache per Firebase Integration Skill
// Using memoryLocalCache prevents QuotaExceededError and assertion crashes from localStorage in iframe environments
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (err) {
  console.warn('initializeFirestore with memory cache unavailable, falling back:', err);
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
