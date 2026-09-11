export interface User {
  id: string; // Unique ID (lowercase alphanumeric, e.g. "alex_01")
  displayName: string;
  avatar: string;
  bio: string;
  pinHash: string; // Hashed or encoded PIN for authentication
  createdAt: number;
  lastSeen: number;
}

export interface Contact {
  id: string; // Contact record ID
  userId: string; // Owner of the contact list
  contactUserId: string; // The friend's ID
  aliasName?: string;
  addedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  ciphertext: string; // Encrypted text or encrypted photo metadata
  iv: string; // Initialization vector for AES-GCM
  isPhoto: boolean;
  photoData?: string; // Encrypted or secured photo base64
  photoCaption?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  contactUser: User;
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
}

export type WSClientMessage =
  | { type: 'identify'; userId: string }
  | { type: 'send_message'; message: Message }
  | { type: 'typing'; receiverId: string; isTyping: boolean }
  | { type: 'mark_read'; conversationId: string; senderId: string; receiverId: string };

export type WSServerMessage =
  | { type: 'identified'; userId: string; onlineUsers: string[] }
  | { type: 'new_message'; message: Message }
  | { type: 'message_delivered'; messageId: string }
  | { type: 'message_read'; messageId?: string; conversationId?: string; readerId: string }
  | { type: 'user_typing'; senderId: string; isTyping: boolean }
  | { type: 'user_presence'; userId: string; isOnline: boolean; lastSeen: number };
