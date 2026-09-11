import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Shield,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  X,
  Search,
  Lock,
  Loader2,
  Trash2,
  Camera,
} from 'lucide-react';
import { User, Message, Conversation } from '../types';
import { ImageLightbox } from './ImageLightbox';
import { CameraCaptureModal } from './CameraCaptureModal';
import { encryptPayload, decryptPayload } from '../utils/crypto';

interface ChatWindowProps {
  currentUser: User;
  activeContact: Conversation | null;
  messages: Message[];
  onSendMessage: (payload: {
    text: string;
    photoData?: string;
    photoCaption?: string;
  }) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  onBackMobile: () => void;
  onOpenEncryptionModal: () => void;
  onOpenProfile?: () => void;
  onTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = ['😊', '😂', '❤️', '👍', '🙏', '🔥', '🎉', '😍', '👏', '✨', '🙌', '💯', '😎', '🤣', '👋', '☕'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  activeContact,
  messages,
  onSendMessage,
  onDeleteContact,
  onBackMobile,
  onOpenEncryptionModal,
  onOpenProfile,
  onTyping,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    senderName: string;
    timestamp: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [callToast, setCallToast] = useState<string | null>(null);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle captured photo from camera modal
  const handleCameraCapture = (photoDataUrl: string) => {
    setSelectedPhoto(photoDataUrl);
    setShowCameraModal(false);
    setShowAttachMenu(false);
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPhoto]);

  // Decrypt incoming / stored messages client-side
  useEffect(() => {
    if (!activeContact) return;

    let isMounted = true;
    const decryptAll = async () => {
      const updates: Record<string, string> = {};
      for (const msg of messages) {
        if (!decryptedCache[msg.id]) {
          if (msg.iv === 'plain-fallback') {
            updates[msg.id] = msg.ciphertext;
          } else {
            const dec = await decryptPayload(
              msg.ciphertext,
              msg.iv,
              currentUser.id,
              activeContact.contactUser.id
            );
            updates[msg.id] = dec;
          }
        }
      }
      if (isMounted && Object.keys(updates).length > 0) {
        setDecryptedCache((prev) => ({ ...prev, ...updates }));
      }
    };

    decryptAll();
    return () => {
      isMounted = false;
    };
  }, [messages, activeContact, currentUser.id, decryptedCache]);

  // Handle Typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  // Handle Photo selection via file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (JPG, PNG, GIF, WEBP) yang didukung.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Drag & Drop photo
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeContact) return;

    const trimmed = inputText.trim();
    if (!trimmed && !selectedPhoto) return;

    setSending(true);
    onTyping(false);
    try {
      await onSendMessage({
        text: trimmed,
        photoData: selectedPhoto || undefined,
        photoCaption: photoCaption.trim() || undefined,
      });

      setInputText('');
      setSelectedPhoto(null);
      setPhotoCaption('');
      setShowEmojis(false);
    } finally {
      setSending(false);
    }
  };

  const triggerCallToast = (type: 'suara' | 'video') => {
    setCallToast(`Panggilan ${type} ke @${activeContact?.contactUser.id} sedang diamankan... (Segera hadir)`);
    setTimeout(() => setCallToast(null), 3000);
  };

  if (!activeContact) {
    // Empty state when no chat is open
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] text-center p-8 border-b-6 border-[#00a884] select-none">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#111b21] flex items-center justify-center text-[#00a884] mb-6 shadow-xl border border-[#2a3942]">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-light text-[#e9edef] mb-2 tracking-tight">
            ChatID untuk Web
          </h1>
          <p className="text-xs text-[#8696a0] leading-relaxed mb-6">
            Kirim dan terima pesan aman tanpa membagikan nomor telepon pribadi.
            Cukup gunakan ID unik Anda untuk terhubung ke kontak di mana saja.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111b21]/70 border border-[#2a3942] text-[11px] text-[#8696a0]">
            <Lock className="w-3.5 h-3.5 text-[#00a884]" />
            Terenkripsi secara end-to-end (AES-256)
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-xs font-bold text-[#00a884] shadow-md transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ganti Foto Profil & Info Saya</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <main
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 h-full flex flex-col bg-[#0b141a] relative overflow-hidden"
    >
      {/* Chat Header */}
      <header className="h-16 px-4 bg-[#202c33] border-b border-[#222e35] flex items-center justify-between shrink-0 z-10 select-none">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src={activeContact.contactUser.avatar}
              alt={activeContact.contactUser.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            {activeContact.isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] border-2 border-[#202c33] rounded-full" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[#e9edef] truncate">
                {activeContact.contactUser.displayName}
              </h3>
              <span className="text-[10px] text-[#8696a0] font-mono shrink-0">
                @{activeContact.contactUser.id}
              </span>
            </div>
            <p className="text-[11px] text-[#8696a0] truncate">
              {activeContact.isTyping ? (
                <span className="text-[#00a884] font-medium animate-pulse">sedang mengetik...</span>
              ) : activeContact.isOnline ? (
                <span className="text-[#00a884]">Online</span>
              ) : (
                'Terakhir dilihat baru saja'
              )}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-[#aebac1]">
          <button
            onClick={() => triggerCallToast('suara')}
            title="Panggilan Suara"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => triggerCallToast('video')}
            title="Panggilan Video"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEncryptionModal}
            title="Kunci Enkripsi Obrolan"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#00a884] transition"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-full hover:bg-[#374248] hover:text-[#e9edef] transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-[#233138] border border-[#2a3942] rounded-xl shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setShowOptions(false);
                    onOpenEncryptionModal();
                  }}
                  className="w-full px-4 py-2 text-left text-[#e9edef] hover:bg-[#182229] flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-[#00a884]" />
                  Verifikasi Enkripsi
                </button>
                <button
                  onClick={() => {
                    setShowOptions(false);
                    if (confirm(`Hapus kontak @${activeContact.contactUser.id} dari daftar Anda?`)) {
                      onDeleteContact(activeContact.contactUser.id);
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#182229] flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Kontak
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {callToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-[#00a884] text-[#111b21] px-4 py-2 rounded-full font-semibold text-xs shadow-lg animate-in fade-in">
          {callToast}
        </div>
      )}

      {/* Messages Scroll Area with WhatsApp Background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 wa-chat-bg">
        {/* End-to-End Encryption Banner */}
        <div className="flex justify-center my-2">
          <div className="max-w-md bg-[#182229]/90 border border-[#2a3942] rounded-lg px-3 py-2 text-center text-[11px] text-[#ffd279] shadow-sm flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-[#ffd279]" />
            <span>
              Pesan dan foto ke obrolan ini dienkripsi secara end-to-end dengan kunci unik ID Anda.
            </span>
          </div>
        </div>

        {/* Render Messages */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const displayContent = decryptedCache[msg.id] || msg.ciphertext;
          const timeString = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-2.5 shadow-sm text-sm wa-message-bubble ${
                  isMe
                    ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                }`}
              >
                {/* Photo Message */}
                {msg.isPhoto && msg.photoData && (
                  <div
                    onClick={() =>
                      setLightboxImage({
                        url: msg.photoData!,
                        caption: msg.photoCaption,
                        senderName: isMe ? 'Anda' : activeContact.contactUser.displayName,
                        timestamp: msg.timestamp,
                      })
                    }
                    className="cursor-pointer group relative rounded-xl overflow-hidden mb-1.5 bg-black/20"
                  >
                    <img
                      src={msg.photoData}
                      alt="Foto Terkirim"
                      className="max-h-72 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      Klik untuk memperbesar
                    </div>
                  </div>
                )}

                {/* Photo Caption or Text */}
                {msg.isPhoto ? (
                  msg.photoCaption && (
                    <p className="text-xs text-[#e9edef] mb-1 leading-relaxed">
                      {msg.photoCaption}
                    </p>
                  )
                ) : (
                  <p className="text-xs sm:text-sm text-[#e9edef] leading-relaxed whitespace-pre-wrap">
                    {displayContent}
                  </p>
                )}

                {/* Meta Timestamp & Status Checks */}
                <div className="flex items-center justify-end gap-1 mt-1 select-none">
                  <span className="text-[10px] text-[#8696a0]">{timeString}</span>
                  {isMe && (
                    <span className="text-[#8696a0]">
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Photo Preview Bar before sending */}
      {selectedPhoto && (
        <div className="bg-[#202c33] border-t border-[#2a3942] p-3 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-[#00a884]">
            <img src={selectedPhoto} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black text-white p-0.5 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Tambahkan keterangan foto..."
              className="w-full px-3 py-1.5 bg-[#111b21] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-lg text-xs text-[#e9edef]"
            />
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojis && (
        <div className="bg-[#202c33] border-t border-[#2a3942] p-3 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
              }}
              className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp-Style Photo Attachment Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-3 sm:left-4 z-30 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl p-2 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 w-52 select-none">
          {/* Option 1: Live Camera / Memfoto Langsung */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setShowCameraModal(true);
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#2a3942] transition cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d33a67] to-[#ec4899] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#e9edef] group-hover:text-[#00a884] transition">
                Kamera
              </p>
              <p className="text-[10px] text-[#8696a0]">Ambil foto langsung</p>
            </div>
          </button>

          {/* Option 2: Gallery / File Foto */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#2a3942] transition cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#e9edef] group-hover:text-[#00a884] transition">
                Galeri
              </p>
              <p className="text-[10px] text-[#8696a0]">Pilih foto dari HP/PC</p>
            </div>
          </button>
        </div>
      )}

      {/* Chat Footer / Input Form */}
      <footer className="px-3 py-2 bg-[#202c33] border-t border-[#222e35] shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => {
              setShowEmojis(!showEmojis);
              setShowAttachMenu(false);
            }}
            className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248] transition cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attach Button (Opens Gallery or Camera Choices) */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojis(false);
            }}
            title="Kirim Foto (Galeri atau Kamera)"
            className={`p-2 rounded-full transition cursor-pointer ${
              showAttachMenu
                ? 'bg-[#374248] text-[#00a884]'
                : 'text-[#8696a0] hover:text-[#00a884] hover:bg-[#374248]'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Direct Camera Button */}
          <button
            type="button"
            onClick={() => {
              setShowCameraModal(true);
              setShowAttachMenu(false);
              setShowEmojis(false);
            }}
            title="Ambil Foto Langsung (Kamera)"
            className="p-2 text-[#8696a0] hover:text-[#00a884] rounded-full hover:bg-[#374248] transition cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center px-3 py-1.5">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onFocus={() => {
                setShowAttachMenu(false);
                setShowEmojis(false);
              }}
              placeholder="Ketik pesan..."
              className="w-full bg-transparent border-none text-xs sm:text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !selectedPhoto)}
            className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50 text-[#111b21] transition shadow-md cursor-pointer shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </footer>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <CameraCaptureModal
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCameraCapture}
        />
      )}

      {/* Lightbox for Photos */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          caption={lightboxImage.caption}
          senderName={lightboxImage.senderName}
          timestamp={lightboxImage.timestamp}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </main>
  );
};
