import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface definitions for backend store
interface UserRecord {
  id: string; // Unique lowercase ID
  displayName: string;
  avatar: string;
  bio: string;
  pinHash: string;
  createdAt: number;
  lastSeen: number;
}

interface ContactRecord {
  id: string;
  userId: string;
  contactUserId: string;
  aliasName?: string;
  addedAt: number;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  ciphertext: string;
  iv: string;
  isPhoto: boolean;
  photoData?: string;
  photoCaption?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  contacts: ContactRecord[];
  messages: MessageRecord[];
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Seeding
function getInitialDb(): DatabaseSchema {
  const defaultUsers: Record<string, UserRecord> = {
    support_official: {
      id: 'support_official',
      displayName: 'Bantuan Resmi ChatID',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Layanan Bantuan & Info Privasi ChatID (Online 24/7)',
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
  };

  return {
    users: defaultUsers,
    contacts: [],
    messages: [],
  };
}

let db: DatabaseSchema = getInitialDb();

// Load persistent DB from disk
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    db = {
      users: { ...getInitialDb().users, ...parsed.users },
      contacts: parsed.contacts || [],
      messages: parsed.messages || [],
    };
  } catch (e) {
    console.error('Error reading db.json, using defaults:', e);
  }
} else {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Synchronize database to disk
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Conversation ID helper
function getConversationId(u1: string, u2: string): string {
  return [u1.toLowerCase(), u2.toLowerCase()].sort().join('_');
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // CORS headers to allow GitHub Pages or custom frontend domains
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Increase payload limit for photos / media
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // WebSocket Server setup
  const wss = new WebSocketServer({ server });
  const connectedSockets = new Map<string, Set<WebSocket>>();

  function broadcastToUser(userId: string, data: object) {
    const sockets = connectedSockets.get(userId.toLowerCase());
    if (sockets && sockets.size > 0) {
      const payload = JSON.stringify(data);
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
      return true;
    }
    return false;
  }

  function broadcastPresence(userId: string, isOnline: boolean) {
    const payload = JSON.stringify({
      type: 'user_presence',
      userId: userId.toLowerCase(),
      isOnline,
      lastSeen: Date.now(),
    });
    for (const [, sockets] of connectedSockets) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  wss.on('connection', (ws) => {
    let authenticatedUserId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'identify' && msg.userId) {
          const uId = msg.userId.toLowerCase();
          authenticatedUserId = uId;
          if (!connectedSockets.has(uId)) {
            connectedSockets.set(uId, new Set());
          }
          connectedSockets.get(uId)!.add(ws);

          // Update user lastSeen in DB
          if (db.users[uId]) {
            db.users[uId].lastSeen = Date.now();
          }

          const onlineList = Array.from(connectedSockets.keys());
          ws.send(
            JSON.stringify({
              type: 'identified',
              userId: uId,
              onlineUsers: onlineList,
            })
          );

          broadcastPresence(uId, true);
        } else if (msg.type === 'typing' && authenticatedUserId) {
          const receiverId = (msg.receiverId || '').toLowerCase();
          broadcastToUser(receiverId, {
            type: 'user_typing',
            senderId: authenticatedUserId,
            isTyping: !!msg.isTyping,
          });
        } else if (msg.type === 'mark_read' && authenticatedUserId) {
          const senderId = (msg.senderId || '').toLowerCase();
          const convId = getConversationId(authenticatedUserId, senderId);
          // Mark all messages from senderId to authenticatedUserId as read
          let updated = false;
          db.messages.forEach((m) => {
            if (m.conversationId === convId && m.receiverId === authenticatedUserId && m.status !== 'read') {
              m.status = 'read';
              updated = true;
            }
          });
          if (updated) {
            saveDb();
            broadcastToUser(senderId, {
              type: 'message_read',
              conversationId: convId,
              readerId: authenticatedUserId,
            });
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (authenticatedUserId) {
        const sockets = connectedSockets.get(authenticatedUserId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            connectedSockets.delete(authenticatedUserId);
            if (db.users[authenticatedUserId]) {
              db.users[authenticatedUserId].lastSeen = Date.now();
              saveDb();
            }
            broadcastPresence(authenticatedUserId, false);
          }
        }
      }
    });
  });

  // REST API Routes

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Check ID availability
  app.get('/api/check-id/:id', (req, res) => {
    const rawId = (req.params.id || '').trim().toLowerCase();
    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(rawId)) {
      return res.json({
        available: false,
        validFormat: false,
        message: 'ID harus 3-20 karakter (huruf kecil, angka, atau garis bawah _)',
      });
    }
    const exists = !!db.users[rawId];
    return res.json({
      available: !exists,
      validFormat: true,
      exists,
      user: exists
        ? {
            id: db.users[rawId].id,
            displayName: db.users[rawId].displayName,
            avatar: db.users[rawId].avatar,
            bio: db.users[rawId].bio,
          }
        : null,
    });
  });

  // Create new unique ID
  app.post('/api/auth/create-id', (req, res) => {
    const { id, displayName, pin, avatar, bio } = req.body;
    const cleanId = (id || '').trim().toLowerCase();
    const regex = /^[a-z0-9_]{3,20}$/;

    if (!regex.test(cleanId)) {
      return res.status(400).json({ error: 'Format ID tidak valid. Gunakan 3-20 huruf/angka/garis bawah.' });
    }
    if (db.users[cleanId]) {
      return res.status(409).json({ error: 'ID ini sudah digunakan oleh orang lain. Silakan pilih ID yang berbeda!' });
    }
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Nama tampilan wajib diisi.' });
    }
    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'PIN keamanan minimal 4 digit.' });
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanId}`;
    const newUser: UserRecord = {
      id: cleanId,
      displayName: displayName.trim(),
      avatar: avatar && avatar.startsWith('http') || (avatar && avatar.startsWith('data:')) ? avatar : defaultAvatar,
      bio: bio?.trim() || 'Ada di ChatID',
      pinHash: String(pin),
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    db.users[cleanId] = newUser;

    // Auto-add Official Support as first contact
    db.contacts.push({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: cleanId,
      contactUserId: 'support_official',
      aliasName: 'Bantuan Resmi ChatID',
      addedAt: Date.now(),
    });

    // Auto-send welcome encrypted message
    const convId = getConversationId(cleanId, 'support_official');
    db.messages.push({
      id: 'm_' + Date.now(),
      conversationId: convId,
      senderId: 'support_official',
      receiverId: cleanId,
      ciphertext: 'Selamat datang di ChatID! ID unik Anda adalah @' + cleanId + '. Bagikan ID ini kepada teman agar mereka dapat menambahkan Anda ke kontak mereka.',
      iv: 'plain-fallback',
      isPhoto: false,
      timestamp: Date.now(),
      status: 'delivered',
    });

    saveDb();

    res.json({
      success: true,
      user: {
        id: newUser.id,
        displayName: newUser.displayName,
        avatar: newUser.avatar,
        bio: newUser.bio,
        createdAt: newUser.createdAt,
      },
    });
  });

  // Connect existing ID (Restore session across devices)
  app.post('/api/auth/connect-id', (req, res) => {
    const { id, pin } = req.body;
    const cleanId = (id || '').trim().toLowerCase();

    const user = db.users[cleanId];
    if (!user) {
      return res.status(404).json({ error: 'ID tidak ditemukan. Periksa kembali ID atau buat ID baru.' });
    }

    if (String(user.pinHash) !== String(pin)) {
      return res.status(401).json({ error: 'PIN keamanan salah untuk ID ini.' });
    }

    user.lastSeen = Date.now();
    saveDb();

    res.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  });

  // Get user profile
  app.get('/api/users/:userId', (req, res) => {
    const uId = req.params.userId.toLowerCase();
    const user = db.users[uId];
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    const isOnline = connectedSockets.has(uId) && (connectedSockets.get(uId)?.size || 0) > 0;
    res.json({
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      isOnline,
      lastSeen: user.lastSeen,
    });
  });

  // Update profile
  app.patch('/api/users/:userId', (req, res) => {
    const uId = req.params.userId.toLowerCase();
    const user = db.users[uId];
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const { displayName, avatar, bio } = req.body;
    if (displayName) user.displayName = displayName.trim();
    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio.trim();

    saveDb();
    res.json({ success: true, user });
  });

  // Get contact list with last message and unread count
  app.get('/api/users/:userId/contacts', (req, res) => {
    const currentUserId = req.params.userId.toLowerCase();
    const contacts = db.contacts.filter((c) => c.userId === currentUserId);

    const contactSummaries = contacts.map((c) => {
      const contactUser = db.users[c.contactUserId.toLowerCase()];
      if (!contactUser) return null;

      const convId = getConversationId(currentUserId, contactUser.id);
      const convMessages = db.messages.filter((m) => m.conversationId === convId);
      const lastMessage = convMessages[convMessages.length - 1];

      const unreadCount = convMessages.filter(
        (m) => m.receiverId === currentUserId && m.status !== 'read'
      ).length;

      const isOnline = connectedSockets.has(contactUser.id) && (connectedSockets.get(contactUser.id)?.size || 0) > 0;

      return {
        contactRecordId: c.id,
        contactUser: {
          id: contactUser.id,
          displayName: c.aliasName || contactUser.displayName,
          realDisplayName: contactUser.displayName,
          avatar: contactUser.avatar,
          bio: contactUser.bio,
          lastSeen: contactUser.lastSeen,
        },
        aliasName: c.aliasName,
        lastMessage: lastMessage || null,
        unreadCount,
        isOnline,
      };
    }).filter(Boolean);

    res.json(contactSummaries);
  });

  // Add contact by ID
  app.post('/api/users/:userId/contacts', (req, res) => {
    const currentUserId = req.params.userId.toLowerCase();
    const { contactId, aliasName } = req.body;
    const cleanTargetId = (contactId || '').trim().toLowerCase();

    if (!cleanTargetId) {
      return res.status(400).json({ error: 'ID kontak tidak boleh kosong.' });
    }
    if (cleanTargetId === currentUserId) {
      return res.status(400).json({ error: 'Anda tidak dapat menambahkan ID Anda sendiri sebagai kontak.' });
    }

    const targetUser = db.users[cleanTargetId];
    if (!targetUser) {
      return res.status(404).json({ error: `Pengguna dengan ID @${cleanTargetId} tidak ditemukan. Pastikan ID sudah benar.` });
    }

    // Check if already added
    const alreadyExists = db.contacts.some(
      (c) => c.userId === currentUserId && c.contactUserId === cleanTargetId
    );
    if (alreadyExists) {
      return res.status(400).json({ error: `Kontak @${cleanTargetId} sudah ada di daftar kontak Anda.` });
    }

    const newContact: ContactRecord = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: currentUserId,
      contactUserId: cleanTargetId,
      aliasName: aliasName?.trim() || undefined,
      addedAt: Date.now(),
    };

    db.contacts.push(newContact);

    // Also auto-reciprocate contact if target hasn't added current user yet
    const targetHasCurrent = db.contacts.some(
      (c) => c.userId === cleanTargetId && c.contactUserId === currentUserId
    );
    if (!targetHasCurrent) {
      db.contacts.push({
        id: 'c_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 7),
        userId: cleanTargetId,
        contactUserId: currentUserId,
        addedAt: Date.now(),
      });
    }

    saveDb();

    res.json({
      success: true,
      contact: {
        id: newContact.id,
        contactUser: targetUser,
        aliasName: newContact.aliasName,
      },
    });
  });

  // Delete contact
  app.delete('/api/users/:userId/contacts/:contactId', (req, res) => {
    const currentUserId = req.params.userId.toLowerCase();
    const targetContactId = req.params.contactId.toLowerCase();

    db.contacts = db.contacts.filter(
      (c) => !(c.userId === currentUserId && c.contactUserId === targetContactId)
    );
    saveDb();
    res.json({ success: true });
  });

  // Get messages for conversation
  app.get('/api/messages/:userId/:contactId', (req, res) => {
    const u1 = req.params.userId.toLowerCase();
    const u2 = req.params.contactId.toLowerCase();
    const convId = getConversationId(u1, u2);

    const messages = db.messages.filter((m) => m.conversationId === convId);
    res.json(messages);
  });

  // Send message
  app.post('/api/messages/send', (req, res) => {
    const { senderId, receiverId, ciphertext, iv, isPhoto, photoData, photoCaption } = req.body;
    const cleanSender = (senderId || '').toLowerCase();
    const cleanReceiver = (receiverId || '').toLowerCase();

    if (!cleanSender || !cleanReceiver) {
      return res.status(400).json({ error: 'senderId and receiverId are required' });
    }

    const convId = getConversationId(cleanSender, cleanReceiver);

    // Check if receiver is online
    const isReceiverOnline = connectedSockets.has(cleanReceiver) && (connectedSockets.get(cleanReceiver)?.size || 0) > 0;

    const newMsg: MessageRecord = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      conversationId: convId,
      senderId: cleanSender,
      receiverId: cleanReceiver,
      ciphertext: ciphertext || '',
      iv: iv || '',
      isPhoto: !!isPhoto,
      photoData: photoData || undefined,
      photoCaption: photoCaption || undefined,
      timestamp: Date.now(),
      status: isReceiverOnline ? 'delivered' : 'sent',
    };

    db.messages.push(newMsg);
    saveDb();

    // Broadcast in real-time via WebSocket
    broadcastToUser(cleanReceiver, {
      type: 'new_message',
      message: newMsg,
    });

    // Notify sender of delivery status
    if (isReceiverOnline) {
      broadcastToUser(cleanSender, {
        type: 'message_delivered',
        messageId: newMsg.id,
      });
    }

    // If message is sent to support_official, trigger an automated helpful response!
    if (cleanReceiver === 'support_official') {
      setTimeout(() => {
        const replyText = isPhoto
          ? 'Terima kasih telah mengirimkan foto! Foto Anda tersimpan aman dan terenkripsi di database kami.'
          : 'Halo @' + cleanSender + '! Pesan Anda telah diterima oleh sistem Bantuan Resmi ChatID. Privasi Anda terjaga 100% dengan enkripsi AES-256.';

        const botReply: MessageRecord = {
          id: 'msg_bot_' + Date.now(),
          conversationId: convId,
          senderId: 'support_official',
          receiverId: cleanSender,
          ciphertext: replyText,
          iv: 'plain-fallback',
          isPhoto: false,
          timestamp: Date.now(),
          status: 'delivered',
        };

        db.messages.push(botReply);
        saveDb();

        broadcastToUser(cleanSender, {
          type: 'new_message',
          message: botReply,
        });
      }, 1200);
    }

    res.json({ success: true, message: newMsg });
  });

  // Mark messages as read
  app.post('/api/messages/read', (req, res) => {
    const { userId, contactId } = req.body;
    const currentUserId = (userId || '').toLowerCase();
    const contactUserId = (contactId || '').toLowerCase();
    const convId = getConversationId(currentUserId, contactUserId);

    let count = 0;
    db.messages.forEach((m) => {
      if (m.conversationId === convId && m.receiverId === currentUserId && m.status !== 'read') {
        m.status = 'read';
        count++;
      }
    });

    if (count > 0) {
      saveDb();
      broadcastToUser(contactUserId, {
        type: 'message_read',
        conversationId: convId,
        readerId: currentUserId,
      });
    }

    res.json({ success: true, markedCount: count });
  });

  // Database Inspector API (Shows database status & raw encrypted storage)
  app.get('/api/database-inspect', (req, res) => {
    res.json({
      totalUsers: Object.keys(db.users).length,
      totalContacts: db.contacts.length,
      totalMessages: db.messages.length,
      recentEncryptedRows: db.messages.slice(-10).map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        isPhoto: m.isPhoto,
        ciphertextPreview: m.ciphertext.substring(0, 48) + (m.ciphertext.length > 48 ? '...' : ''),
        iv: m.iv,
        status: m.status,
        timestamp: new Date(m.timestamp).toLocaleTimeString(),
      })),
      allUserIds: Object.keys(db.users),
    });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatID server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
