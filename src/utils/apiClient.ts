import { User, Conversation, Message } from '../types';

const LOCAL_DB_KEY = 'chatid_local_database';
const BACKEND_URL_KEY = 'chatid_custom_backend_url';

export function getCustomBackendUrl(): string {
  return localStorage.getItem(BACKEND_URL_KEY) || '';
}

export function setCustomBackendUrl(url: string) {
  if (url) {
    localStorage.setItem(BACKEND_URL_KEY, url.trim().replace(/\/$/, ''));
  } else {
    localStorage.removeItem(BACKEND_URL_KEY);
  }
}

export function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('github.io') || host.endsWith('gitlab.io') || host.endsWith('surge.sh');
}

interface LocalSchema {
  users: Record<string, User>;
  contacts: Array<{
    id: string;
    userId: string;
    contactUserId: string;
    aliasName?: string;
    addedAt: number;
  }>;
  messages: Message[];
}

function getInitialLocalDb(): LocalSchema {
  return {
    users: {
      support_official: {
        id: 'support_official',
        displayName: 'Bantuan Resmi ChatID',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Layanan Bantuan & Info Privasi ChatID (Mode Lokal)',
        pinHash: '123456',
        createdAt: Date.now() - 86400000 * 30,
        lastSeen: Date.now(),
      },
      budi_santoso: {
        id: 'budi_santoso',
        displayName: 'Budi Santoso',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'Sibuk bekerja | Hubungi jika penting',
        pinHash: '123456',
        createdAt: Date.now() - 86400000 * 15,
        lastSeen: Date.now() - 1000 * 60 * 12,
      },
      sarah_art: {
        id: 'sarah_art',
        displayName: 'Sarah Art & Design',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        bio: 'Desainer Grafis & Fotografer Bebas',
        pinHash: '123456',
        createdAt: Date.now() - 86400000 * 10,
        lastSeen: Date.now() - 1000 * 60 * 45,
      },
    },
    contacts: [],
    messages: [],
  };
}

function readLocalDb(): LocalSchema {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
      const initial = getInitialLocalDb();
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialLocalDb();
  }
}

function saveLocalDb(db: LocalSchema) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch (err) {
    console.warn('LocalStorage full or error:', err);
  }
}

// Safe AbortSignal generator for legacy browsers (Chrome 55 compatible)
function getFetchSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortController !== 'undefined') {
    try {
      const controller = new AbortController();
      setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, ms);
      return controller.signal;
    } catch {}
  }
  return undefined;
}

// Check if backend is alive
let isBackendAlive: boolean | null = null;

export async function checkBackendHealth(): Promise<boolean> {
  const custom = getCustomBackendUrl();
  const url = custom ? `${custom}/api/health` : '/api/health';

  try {
    const res = await fetch(url, { method: 'GET', signal: getFetchSignal(3000) });
    if (res.ok) {
      isBackendAlive = true;
      return true;
    }
    isBackendAlive = false;
    return false;
  } catch {
    isBackendAlive = false;
    return false;
  }
}

export function getIsUsingLocalFallback(): boolean {
  if (isStaticHost() && !getCustomBackendUrl()) return true;
  return isBackendAlive === false;
}

// Unified API Client
export const api = {
  async getHealth() {
    return checkBackendHealth();
  },

  async checkId(id: string): Promise<{ validFormat: boolean; available?: boolean; exists?: boolean; user?: User; message?: string }> {
    const cleanId = id.trim().toLowerCase();
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/check-id/${encodeURIComponent(cleanId)}` : `/api/check-id/${encodeURIComponent(cleanId)}`;

    try {
      const res = await fetch(url, { signal: getFetchSignal(3500) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local DB fallback
    const db = readLocalDb();
    const valid = /^[a-z0-9_]{3,20}$/.test(cleanId);
    if (!valid) {
      return { validFormat: false, message: 'ID hanya boleh 3-20 karakter (huruf kecil, angka, underscore)' };
    }
    const exists = !!db.users[cleanId];
    return {
      validFormat: true,
      available: !exists,
      exists,
      user: exists ? db.users[cleanId] : undefined,
      message: exists ? 'ID sudah dipakai' : 'ID unik tersedia!',
    };
  },

  async createId(payload: { id: string; displayName: string; pin: string; avatar: string; bio?: string }): Promise<{ user: User }> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/auth/create-id` : '/api/auth/create-id';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: getFetchSignal(6000),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 400 || res.status === 409) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat ID');
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('Gagal') || err.message.includes('dipakai'))) {
        throw err;
      }
    }

    // Fallback to local DB
    const db = readLocalDb();
    const cleanId = payload.id.toLowerCase();
    if (db.users[cleanId]) {
      throw new Error('ID ini sudah digunakan di database lokal.');
    }

    const newUser: User = {
      id: cleanId,
      displayName: payload.displayName,
      avatar: payload.avatar,
      bio: payload.bio || 'Ada di ChatID',
      pinHash: payload.pin,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    db.users[cleanId] = newUser;
    // Automatically add support contact
    db.contacts.push({
      id: `c_${Date.now()}`,
      userId: cleanId,
      contactUserId: 'support_official',
      aliasName: 'Bantuan Resmi ChatID',
      addedAt: Date.now(),
    });

    saveLocalDb(db);
    return { user: newUser };
  },

  async connectId(payload: { id: string; pin: string }): Promise<{ user: User }> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/auth/connect-id` : '/api/auth/connect-id';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: getFetchSignal(6000),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401 || res.status === 404) {
        const data = await res.json();
        throw new Error(data.error || 'ID atau PIN salah.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('salah') || err.message.includes('tidak ditemukan'))) {
        throw err;
      }
    }

    // Local DB fallback
    const db = readLocalDb();
    const cleanId = payload.id.toLowerCase();
    const user = db.users[cleanId];
    if (!user) {
      throw new Error(`ID @${cleanId} belum terdaftar di perangkat ini.`);
    }
    if (user.pinHash !== payload.pin) {
      throw new Error('PIN keamanan salah.');
    }

    return { user };
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/users/${userId}/contacts` : `/api/users/${userId}/contacts`;

    try {
      const res = await fetch(url, { signal: getFetchSignal(4000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local DB fallback
    const db = readLocalDb();
    const userContacts = db.contacts.filter((c) => c.userId === userId.toLowerCase());
    
    // If no contacts yet, add support_official
    if (userContacts.length === 0 && db.users['support_official']) {
      db.contacts.push({
        id: `c_${Date.now()}`,
        userId: userId.toLowerCase(),
        contactUserId: 'support_official',
        aliasName: 'Bantuan Resmi ChatID',
        addedAt: Date.now(),
      });
      saveLocalDb(db);
      userContacts.push(db.contacts[db.contacts.length - 1]);
    }

    const conversations: Conversation[] = [];
    for (const c of userContacts) {
      const contactUser = db.users[c.contactUserId];
      if (!contactUser) continue;

      const convId1 = `${userId.toLowerCase()}_${c.contactUserId}`;
      const convId2 = `${c.contactUserId}_${userId.toLowerCase()}`;
      const messages = db.messages.filter(
        (m) => m.conversationId === convId1 || m.conversationId === convId2
      );
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(
        (m) => m.receiverId === userId.toLowerCase() && m.status !== 'read'
      ).length;

      conversations.push({
        contactUser: {
          ...contactUser,
          displayName: c.aliasName || contactUser.displayName,
        },
        lastMessage,
        unreadCount,
        isOnline: true,
      });
    }

    return conversations;
  },

  async getMessages(userId: string, contactId: string): Promise<Message[]> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/messages/${userId}/${contactId}` : `/api/messages/${userId}/${contactId}`;

    try {
      const res = await fetch(url, { signal: getFetchSignal(4000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local DB fallback
    const db = readLocalDb();
    const cId1 = `${userId.toLowerCase()}_${contactId.toLowerCase()}`;
    const cId2 = `${contactId.toLowerCase()}_${userId.toLowerCase()}`;
    const msgs = db.messages.filter(
      (m) => m.conversationId === cId1 || m.conversationId === cId2
    );

    // Mark as read in local db
    let changed = false;
    for (const m of msgs) {
      if (m.receiverId === userId.toLowerCase() && m.status !== 'read') {
        m.status = 'read';
        changed = true;
      }
    }
    if (changed) saveLocalDb(db);

    return msgs;
  },

  async sendMessage(payload: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    ciphertext: string;
    iv: string;
    isPhoto: boolean;
    photoData?: string;
    photoCaption?: string;
  }): Promise<{ message: Message }> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/messages/send` : '/api/messages/send';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: getFetchSignal(8000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local DB fallback
    const db = readLocalDb();
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      isPhoto: payload.isPhoto,
      photoData: payload.photoData,
      photoCaption: payload.photoCaption,
      timestamp: Date.now(),
      status: 'delivered',
    };

    db.messages.push(newMessage);
    saveLocalDb(db);

    return { message: newMessage };
  },

  async addContact(userId: string, contactId: string, aliasName?: string): Promise<{ contact: any }> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/users/${userId}/contacts` : `/api/users/${userId}/contacts`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, aliasName }),
        signal: getFetchSignal(5000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local DB fallback
    const db = readLocalDb();
    const contactUser = db.users[contactId.toLowerCase()];
    if (!contactUser) {
      throw new Error(`Pengguna @${contactId} tidak ditemukan.`);
    }

    const exists = db.contacts.some(
      (c) => c.userId === userId.toLowerCase() && c.contactUserId === contactId.toLowerCase()
    );
    if (!exists) {
      const newContact = {
        id: `c_${Date.now()}`,
        userId: userId.toLowerCase(),
        contactUserId: contactId.toLowerCase(),
        aliasName,
        addedAt: Date.now(),
      };
      db.contacts.push(newContact);
      saveLocalDb(db);
      return { contact: newContact };
    }

    return { contact: { userId, contactUserId: contactId } };
  },

  async deleteContact(userId: string, contactId: string): Promise<void> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/users/${userId}/contacts/${contactId}` : `/api/users/${userId}/contacts/${contactId}`;

    try {
      await fetch(url, { method: 'DELETE', signal: getFetchSignal(4000) });
    } catch {
      // fallback
    }

    const db = readLocalDb();
    db.contacts = db.contacts.filter(
      (c) => !(c.userId === userId.toLowerCase() && c.contactUserId === contactId.toLowerCase())
    );
    saveLocalDb(db);
  },

  async updateUser(userId: string, data: { displayName?: string; avatar?: string; bio?: string }): Promise<{ user: User }> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/users/${userId}` : `/api/users/${userId}`;

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: getFetchSignal(6000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    const db = readLocalDb();
    const u = db.users[userId.toLowerCase()];
    if (u) {
      if (data.displayName) u.displayName = data.displayName;
      if (data.avatar) u.avatar = data.avatar;
      if (data.bio) u.bio = data.bio;
      saveLocalDb(db);
      return { user: u };
    }
    throw new Error('User not found');
  },

  async getDatabaseInspect(): Promise<any> {
    const custom = getCustomBackendUrl();
    const url = custom ? `${custom}/api/database-inspect` : '/api/database-inspect';

    try {
      const res = await fetch(url, { signal: getFetchSignal(4000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    const db = readLocalDb();
    return {
      totalUsers: Object.keys(db.users).length,
      totalContacts: db.contacts.length,
      totalMessages: db.messages.length,
      allUserIds: Object.keys(db.users),
      schema: 'Local Storage Encrypted DB (Fallback)',
      databaseLocation: 'Browser LocalStorage',
      encryptionStandard: 'AES-GCM-256 + SHA-256 Key Derivation',
      sampleEncryptedMessage: db.messages[db.messages.length - 1] || null,
      persistedOnDisk: true,
      lastSyncTime: new Date().toISOString(),
    };
  },
};
