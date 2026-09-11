import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
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

testFirestoreConnection();
