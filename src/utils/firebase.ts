import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, getDoc, setDoc, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  console.warn('[Firebase] Initialization error or legacy environment fallback:', e);
}

export const db = firestoreDb as Firestore;

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firestore connected successfully to database:', firebaseConfig.firestoreDatabaseId || '(default)');
    ensureSupportAccount().catch(() => {});
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client appears offline. Please check network/configuration.');
    } else {
      console.log('[Firebase] Connection check initialized:', error);
    }
    return false;
  }
}

async function ensureSupportAccount() {
  if (!db) return;
  try {
    const supportRef = doc(db, 'users', 'support_official');
    const snap = await getDoc(supportRef);
    if (!snap.exists()) {
      await setDoc(supportRef, {
        id: 'support_official',
        displayName: 'Bantuan Resmi ChatID',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Layanan Bantuan & Info Privasi ChatID (Cloud Database)',
        pinHash: '123456',
        createdAt: Date.now() - 86400000 * 30,
        lastSeen: Date.now(),
      });
    }
  } catch {
    // ignore
  }
}

try {
  testFirestoreConnection();
} catch (e) {
  console.warn('[Firebase] Test connection failed:', e);
}
