import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Conversation, Message, WSServerMessage } from './types';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AddContactModal } from './components/AddContactModal';
import { ProfileModal } from './components/ProfileModal';
import { EncryptionModal } from './components/EncryptionModal';
import { encryptPayload } from './utils/crypto';
import { soundManager } from './utils/audio';

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

  // Fetch conversations from server
  const loadConversations = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, []);

  // Fetch messages for active conversation
  const loadMessages = useCallback(async (userId: string, contactId: string) => {
    try {
      const res = await fetch(`/api/messages/${userId}/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }

      // Mark messages as read on server
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contactId }),
      });

      // Clear unread count locally
      setConversations((prev) =>
        prev.map((c) =>
          c.contactUser.id === contactId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Notify via WebSocket
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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
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
              });
            }

            // Update conversations list
            setConversations((prev) => {
              const exists = prev.some((c) => c.contactUser.id === otherParty);
              if (!exists) {
                // Refresh full contacts if from a new user
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

      ws.onerror = (e) => {
        console.warn('WebSocket error:', e);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };
    } catch (e) {
      console.error('WebSocket connection failure:', e);
    }

    return () => {
      if (ws) ws.close();
    };
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

    const payload = {
      senderId: currentUser.id,
      receiverId: activeContactId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      isPhoto: !!photoData,
      photoData: photoData || undefined,
      photoCaption: photoCaption || undefined,
    };

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Optimistic update
      setMessages((prev) => [...prev, data.message]);

      // Update sidebar conversation preview
      setConversations((prev) =>
        prev.map((c) =>
          c.contactUser.id === activeContactId ? { ...c, lastMessage: data.message } : c
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
      const res = await fetch(`/api/users/${currentUser.id}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.contactUser.id !== contactId));
        if (activeContactId === contactId) {
          setActiveContactId(null);
        }
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
        </div>
      )}
    </div>
  );
}
