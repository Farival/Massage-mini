import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Server } from 'lucide-react';
import { User, Conversation, Message, WSServerMessage } from './types';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AddContactModal } from './components/AddContactModal';
import { ProfileModal } from './components/ProfileModal';
import { EncryptionModal } from './components/EncryptionModal';
import { ServerConfigModal } from './components/ServerConfigModal';
import { encryptPayload } from './utils/crypto';
import { soundManager } from './utils/audio';
import { api, isStaticHost, getCustomBackendUrl } from './utils/apiClient';
import { db } from './utils/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('chat_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);

  // Sync current user to localStorage
  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('chat_current_user', JSON.stringify(user));
  };

  // Update profile handler
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('chat_current_user', JSON.stringify(updatedUser));
    setConversations((prev) =>
      prev.map((c) =>
        c.contactUser.id === updatedUser.id
          ? {
              ...c,
              contactUser: {
                ...c.contactUser,
                displayName: updatedUser.displayName,
                avatar: updatedUser.avatar,
                bio: updatedUser.bio,
              },
            }
          : c
      )
    );
  };

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    localStorage.removeItem('chat_current_user');
    setCurrentUser(null);
    setConversations([]);
    setActiveContactId(null);
    setMessages([]);
  };

  // Toggle sound effects
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  // Fetch conversations
  const loadConversations = useCallback(async (userId: string) => {
    try {
      const data = await api.getConversations(userId);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, []);

  // Fetch messages for active conversation
  const loadMessages = useCallback(async (userId: string, contactId: string) => {
    try {
      const data = await api.getMessages(userId, contactId);
      setMessages(data);

      // Clear unread count locally
      setConversations((prev) =>
        prev.map((c) =>
          c.contactUser.id === contactId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Notify via WebSocket if active
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'mark_read',
            senderId: contactId,
            receiverId: userId,
          })
        );
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  // Initialize and maintain WebSocket connection
  useEffect(() => {
    if (!currentUser) return;

    loadConversations(currentUser.id);

    const custom = getCustomBackendUrl();
    let wsUrl = '';
    if (custom) {
      const customWsProto = custom.startsWith('https:') ? 'wss:' : 'ws:';
      const hostOnly = custom.replace(/^https?:\/\//, '');
      wsUrl = `${customWsProto}//${hostOnly}`;
    } else if (!isStaticHost()) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}`;
    }

    if (!wsUrl) {
      // In static host without custom backend, messages work via local database
      return;
    }

    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'identify', userId: currentUser.id }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WSServerMessage = JSON.parse(event.data);

          if (data.type === 'identified') {
            // Update online statuses
            setConversations((prev) =>
              prev.map((c) => ({
                ...c,
                isOnline: data.onlineUsers.includes(c.contactUser.id.toLowerCase()),
              }))
            );
          } else if (data.type === 'new_message') {
            const incoming = data.message;
            const otherParty =
              incoming.senderId === currentUser.id ? incoming.receiverId : incoming.senderId;

            // If chat with sender is currently active
            if (activeContactId && activeContactId === otherParty) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
              });

              // Mark as read immediately if window is open
              fetch('/api/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, contactId: otherParty }),
              }).catch(() => {});
            }

            // Update conversations list
            setConversations((prev) => {
              const exists = prev.some((c) => c.contactUser.id === otherParty);
              if (!exists) {
                loadConversations(currentUser.id);
                return prev;
              }
              return prev.map((c) => {
                if (c.contactUser.id === otherParty) {
                  const isCurrentActive = activeContactId === otherParty;
                  return {
                    ...c,
                    lastMessage: incoming,
                    unreadCount: isCurrentActive ? 0 : c.unreadCount + 1,
                  };
                }
                return c;
              });
            });

            // Play notification sound
            if (incoming.senderId !== currentUser.id) {
              soundManager.playReceived();
            }
          } else if (data.type === 'message_delivered') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.messageId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
              )
            );
          } else if (data.type === 'message_read') {
            setMessages((prev) =>
              prev.map((m) =>
                m.senderId === currentUser.id && m.status !== 'read'
                  ? { ...m, status: 'read' }
                  : m
              )
            );
          } else if (data.type === 'user_typing') {
            setConversations((prev) =>
              prev.map((c) =>
                c.contactUser.id === data.senderId ? { ...c, isTyping: data.isTyping } : c
              )
            );
          } else if (data.type === 'user_presence') {
            setConversations((prev) =>
              prev.map((c) =>
                c.contactUser.id === data.userId ? { ...c, isOnline: data.isOnline } : c
              )
            );
          }
        } catch (e) {
          console.error('Error handling WS event:', e);
        }
      };

      ws.onerror = () => {
        // Silently handle fallback
      };

      ws.onclose = () => {
        // WebSocket closed
      };
    } catch (e) {
      console.error('WebSocket connection failure:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [currentUser, activeContactId, loadConversations]);

  // Real-time Cloud Firebase Firestore messages listener (syncs across devices on Vercel)
  useEffect(() => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'messages'),
        where('receiverId', '==', currentUser.id.toLowerCase())
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let hasNew = false;
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const incoming = change.doc.data() as Message;
              hasNew = true;

              // Update active chat messages
              if (activeContactId && activeContactId.toLowerCase() === incoming.senderId.toLowerCase()) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === incoming.id)) return prev;
                  return [...prev, incoming];
                });
              }

              // Update conversation list & unread count
              setConversations((prev) => {
                const exists = prev.some((c) => c.contactUser.id.toLowerCase() === incoming.senderId.toLowerCase());
                if (!exists) {
                  loadConversations(currentUser.id);
                  return prev;
                }
                return prev.map((c) => {
                  if (c.contactUser.id.toLowerCase() === incoming.senderId.toLowerCase()) {
                    const isCurrentActive = activeContactId && activeContactId.toLowerCase() === incoming.senderId.toLowerCase();
                    return {
                      ...c,
                      lastMessage: incoming,
                      unreadCount: isCurrentActive ? 0 : c.unreadCount + 1,
                    };
                  }
                  return c;
                });
              });
            }
          });

          if (hasNew) {
            soundManager.playReceived();
          }
        },
        (error) => {
          console.warn('[Firebase] realtime onSnapshot error:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Firebase] realtime onSnapshot setup error:', err);
    }
  }, [currentUser, activeContactId, loadConversations]);

  // Load messages when active contact changes
  useEffect(() => {
    if (currentUser && activeContactId) {
      loadMessages(currentUser.id, activeContactId);
    } else {
      setMessages([]);
    }
  }, [currentUser, activeContactId, loadMessages]);

  // Send message handler (with End-to-End Encryption)
  const handleSendMessage = async ({
    text,
    photoData,
    photoCaption,
  }: {
    text: string;
    photoData?: string;
    photoCaption?: string;
  }) => {
    if (!currentUser || !activeContactId) return;

    // Encrypt message text using AES-256-GCM
    const encrypted = await encryptPayload(
      text || (photoData ? '[Foto]' : ''),
      currentUser.id,
      activeContactId
    );

    const convId = `${currentUser.id}_${activeContactId}`;

    const payload = {
      conversationId: convId,
      senderId: currentUser.id,
      receiverId: activeContactId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      isPhoto: !!photoData,
      photoData: photoData || undefined,
      photoCaption: photoCaption || undefined,
    };

    try {
      const { message } = await api.sendMessage(payload);

      // Optimistic update
      setMessages((prev) => [...prev, message]);

      // Update sidebar conversation preview
      setConversations((prev) =>
        prev.map((c) =>
          c.contactUser.id === activeContactId ? { ...c, lastMessage: message } : c
        )
      );

      // Play sent sound
      soundManager.playSent();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
    }
  };

  // Delete contact handler
  const handleDeleteContact = async (contactId: string) => {
    if (!currentUser) return;
    try {
      await api.deleteContact(currentUser.id, contactId);
      setConversations((prev) => prev.filter((c) => c.contactUser.id !== contactId));
      if (activeContactId === contactId) {
        setActiveContactId(null);
      }
    } catch (e) {
      console.error('Failed to delete contact:', e);
    }
  };

  // Typing event handler
  const handleTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeContactId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          receiverId: activeContactId,
          isTyping,
        })
      );
    }
  };

  const activeContact =
    conversations.find((c) => c.contactUser.id === activeContactId) || null;

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#111b21] text-[#e9edef]">
      {/* Auth Modal if user is not logged in */}
      {!currentUser ? (
        <AuthModal onSuccess={handleUserLogin} />
      ) : (
        <div className="w-full h-full flex flex-col md:flex-row overflow-hidden relative">
          {/* Sidebar (Chats & Contacts) */}
          <div
            className={`w-full md:w-auto h-full flex shrink-0 ${
              activeContactId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <Sidebar
              currentUser={currentUser}
              conversations={conversations}
              activeContactId={activeContactId}
              onSelectConversation={(id) => setActiveContactId(id)}
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenAddContact={() => setShowAddContact(true)}
              onOpenEncryptionModal={() => setShowEncryptionModal(true)}
              onOpenServerModal={() => setShowServerModal(true)}
              onLogout={handleLogout}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          </div>

          {/* Main Chat Area */}
          <div
            className={`flex-1 h-full overflow-hidden ${
              !activeContactId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <ChatWindow
              currentUser={currentUser}
              activeContact={activeContact}
              messages={messages}
              onSendMessage={handleSendMessage}
              onDeleteContact={handleDeleteContact}
              onBackMobile={() => setActiveContactId(null)}
              onOpenEncryptionModal={() => setShowEncryptionModal(true)}
              onOpenProfile={() => setShowProfileModal(true)}
              onTyping={handleTyping}
            />
          </div>

          {/* Profile & Custom Avatar Modal */}
          {showProfileModal && (
            <ProfileModal
              currentUser={currentUser}
              onClose={() => setShowProfileModal(false)}
              onUpdateUser={handleUpdateUser}
            />
          )}

          {/* Add Contact Modal */}
          {showAddContact && (
            <AddContactModal
              currentUser={currentUser}
              onClose={() => setShowAddContact(false)}
              onContactAdded={(contactUser) => {
                loadConversations(currentUser.id);
                setActiveContactId(contactUser.id);
              }}
            />
          )}

          {/* Encryption & Database Inspection Modal */}
          {showEncryptionModal && (
            <EncryptionModal
              currentUser={currentUser}
              onClose={() => setShowEncryptionModal(false)}
            />
          )}

          {/* Server Config & Hosting Modal */}
          {showServerModal && (
            <ServerConfigModal onClose={() => setShowServerModal(false)} />
          )}
        </div>
      )}
    </div>
  );
}
