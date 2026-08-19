import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ScheduleDataset } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

let currentUser: User | null = null;

// Ensure anonymous authentication for seamless cloud sync (optional)
export async function ensureAuth(): Promise<User | null> {
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    return currentUser;
  }
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
          unsubscribe();
          resolve(cred.user);
        } catch (error) {
          // Anonymous Auth is optional since Firestore rules permit code-based document access
          currentUser = null;
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}

// Generate a clean 6-digit sync code e.g. "XZ-7392"
export function generateSyncCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `XZ-${num}`;
}

// Save schedule dataset to Firebase Cloud Firestore
export async function saveScheduleToCloud(dataset: ScheduleDataset, existingCode?: string): Promise<{ syncCode: string; updatedAt: string }> {
  await ensureAuth();
  const syncCode = existingCode && existingCode.trim() ? existingCode.trim().toUpperCase() : generateSyncCode();
  const updatedAt = new Date().toISOString();
  
  const docRef = doc(db, 'schedules', syncCode);
  
  const payload = {
    syncCode,
    name: dataset.name || '新知学堂排课数据',
    dataset: JSON.parse(JSON.stringify(dataset)),
    updatedAt,
    userId: currentUser?.uid || 'anonymous',
  };

  await setDoc(docRef, payload, { merge: true });

  return { syncCode, updatedAt };
}

// Fetch schedule dataset from Firebase Cloud Firestore using Sync Code
export async function loadScheduleFromCloud(syncCode: string): Promise<{ dataset: ScheduleDataset; name: string; updatedAt: string } | null> {
  await ensureAuth();
  const cleanCode = syncCode.trim().toUpperCase();
  if (!cleanCode) return null;

  // First try direct document lookup by code
  const docRef = doc(db, 'schedules', cleanCode);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data && data.dataset) {
      return {
        dataset: data.dataset as ScheduleDataset,
        name: data.name || '云端排课数据',
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  }

  // Secondary query fallback where syncCode == cleanCode
  const q = query(collection(db, 'schedules'), where('syncCode', '==', cleanCode));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const firstDoc = querySnapshot.docs[0].data();
    if (firstDoc && firstDoc.dataset) {
      return {
        dataset: firstDoc.dataset as ScheduleDataset,
        name: firstDoc.name || '云端排课数据',
        updatedAt: firstDoc.updatedAt || new Date().toISOString(),
      };
    }
  }

  return null;
}
