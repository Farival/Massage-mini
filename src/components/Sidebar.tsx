import React, { useState } from 'react';
import {
  UserPlus,
  Shield,
  Search,
  Check,
  CheckCheck,
  Image as ImageIcon,
  LogOut,
  Copy,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { User, Conversation } from '../types';
import { soundManager } from '../utils/audio';

interface SidebarProps {
  currentUser: User;
  conversations: Conversation[];
  activeContactId: string | null;
  onSelectConversation: (contactId: string) => void;
  onOpenProfile: () => void;
  onOpenAddContact: () => void;
  onOpenEncryptionModal: () => void;
  onLogout: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  conversations,
  activeContactId,
  onSelectConversation,
  onOpenProfile,
  onOpenAddContact,
  onOpenEncryptionModal,
  onLogout,
  soundEnabled,
  onToggleSound,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [copiedId, setCopiedId] = useState(false);

  // Copy unique ID to clipboard
  const handleCopyId = () => {
    navigator.clipboard.writeText(`@${currentUser.id}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const nameMatch =
      conv.contactUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contactUser.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;
    if (filterMode === 'unread') return conv.unreadCount > 0;
    return true;
  });

  const formatMessageTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full flex flex-col bg-[#111b21] border-r border-[#222e35] shrink-0 select-none">
      {/* Top Profile Header */}
      <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222e35] shrink-0">
        {/* User Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenProfile}
            title="Klik untuk ganti foto profil & info akun"
            className="relative shrink-0 group cursor-pointer focus:outline-none"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#2a3942] group-hover:ring-[#00a884] group-hover:brightness-75 transition duration-150"
            />
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#202c33] rounded-full" />
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-left group flex items-center gap-1.5 cursor-pointer max-w-full focus:outline-none"
              title="Klik untuk ganti foto & edit profil"
            >
              <h2 className="text-sm font-bold text-[#e9edef] group-hover:text-[#00a884] transition truncate">
                {currentUser.displayName}
              </h2>
            </button>
            {/* Copyable ID Badge */}
            <button
              onClick={handleCopyId}
              title="Klik untuk menyalin ID unik Anda"
              className="group inline-flex items-center gap-1 text-[11px] font-mono text-[#00a884] hover:text-[#00a884]/80 transition cursor-pointer"
            >
              <span>@{currentUser.id}</span>
              {copiedId ? (
                <span className="text-[10px] text-[#00a884] font-sans font-bold bg-[#00a884]/15 px-1 rounded">
                  Tersalin!
                </span>
              ) : (
                <Copy className="w-3 h-3 text-[#8696a0] group-hover:text-[#00a884] transition shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 text-[#aebac1]">
          {/* Custom Profile & Avatar Button */}
          <button
            onClick={onOpenProfile}
            title="Ganti Foto Profil & Edit Akun"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#00a884] transition cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Add Contact Button */}
          <button
            onClick={onOpenAddContact}
            title="Tambah Kontak Baru (Ketik ID)"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#00a884] transition cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          {/* Encryption & DB Inspector */}
          <button
            onClick={onOpenEncryptionModal}
            title="Status Enkripsi & Database"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-[#00a884] transition cursor-pointer"
          >
            <Shield className="w-5 h-5" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara Notifikasi' : 'Nyalakan Suara Notifikasi'}
            className="p-2 rounded-full hover:bg-[#374248] transition cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-[#00a884]" />
            ) : (
              <VolumeX className="w-5 h-5 text-[#8696a0]" />
            )}
          </button>

          {/* Logout / Switch Device */}
          <button
            onClick={onLogout}
            title="Ganti ID / Keluar"
            className="p-2 rounded-full hover:bg-[#374248] hover:text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ID Share Prompt Banner */}
      <div className="bg-[#182229] px-4 py-2 border-b border-[#222e35] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#8696a0] truncate">
          <Sparkles className="w-3.5 h-3.5 text-[#00a884] shrink-0" />
          <span className="truncate">
            ID Anda: <strong className="text-[#00a884] font-mono">@{currentUser.id}</strong>
          </span>
        </div>
        <button
          onClick={handleCopyId}
          className="text-[11px] font-semibold text-[#00a884] hover:underline shrink-0 ml-2"
        >
          {copiedId ? 'Tersalin ✓' : 'Salin ID'}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 bg-[#111b21] space-y-2 border-b border-[#222e35]/50">
        <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5">
          <Search className="w-4 h-4 text-[#8696a0] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari chat atau ketik ID..."
            className="w-full bg-transparent border-none text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition ${
              filterMode === 'all'
                ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Semua Chat
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition flex items-center gap-1 ${
              filterMode === 'unread'
                ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Belum Dibaca
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-64 text-[#8696a0]">
            <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884] mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#e9edef] mb-1">
              {searchQuery ? 'Kontak Tidak Ditemukan' : 'Belum Ada Kontak'}
            </p>
            <p className="text-xs text-[#8696a0] max-w-xs mb-4">
              {searchQuery
                ? `Tidak ada kontak yang cocok dengan "${searchQuery}".`
                : 'Ketik ID orang yang ingin diajak chat untuk menambahkan kontak.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddContact}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Kontak Sekarang
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeContactId === conv.contactUser.id;
            const isMe = conv.lastMessage?.senderId === currentUser.id;

            return (
              <div
                key={conv.contactUser.id}
                onClick={() => onSelectConversation(conv.contactUser.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-[#2a3942]'
                    : 'hover:bg-[#202c33]'
                }`}
              >
                {/* Contact Avatar + Online Dot */}
                <div className="relative shrink-0">
                  <img
                    src={conv.contactUser.avatar}
                    alt={conv.contactUser.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.isOnline && (
                    <span
                      title="Online"
                      className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#111b21] rounded-full"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-[#e9edef] truncate">
                        {conv.contactUser.displayName}
                      </span>
                      <span className="text-[10px] text-[#8696a0] font-mono shrink-0">
                        @{conv.contactUser.id}
                      </span>
                    </div>
                    {conv.lastMessage && (
                      <span
                        className={`text-[11px] shrink-0 ${
                          conv.unreadCount > 0 ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'
                        }`}
                      >
                        {formatMessageTime(conv.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>

                  {/* Last Message Preview */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-[#8696a0] truncate">
                      {conv.isTyping ? (
                        <span className="text-[#00a884] font-medium italic animate-pulse">
                          sedang mengetik...
                        </span>
                      ) : (
                        <>
                          {isMe && conv.lastMessage && (
                            <span className="shrink-0 inline-flex items-center">
                              {conv.lastMessage.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                              ) : conv.lastMessage.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                              )}
                            </span>
                          )}
                          {conv.lastMessage?.isPhoto ? (
                            <span className="flex items-center gap-1 text-[#e9edef]">
                              <ImageIcon className="w-3.5 h-3.5 text-[#00a884]" />
                              Foto
                              {conv.lastMessage.photoCaption && (
                                <span className="text-[#8696a0] truncate">
                                  - {conv.lastMessage.photoCaption}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="truncate">
                              {conv.lastMessage
                                ? conv.lastMessage.ciphertext
                                : conv.contactUser.bio}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Unread Counter Badge */}
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[11px] min-w-5 text-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#111b21] border-t border-[#222e35] text-center text-[11px] text-[#8696a0] flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-[#00a884]" />
        <span>Enkripsi End-to-End diaktifkan</span>
      </div>
    </aside>
  );
};
