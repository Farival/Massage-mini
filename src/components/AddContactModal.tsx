import React, { useState, useEffect } from 'react';
import { UserPlus, Search, X, Check, Loader2, UserCheck, AlertCircle, MessageSquare } from 'lucide-react';
import { User } from '../types';
import { api } from '../utils/apiClient';

interface AddContactModalProps {
  currentUser: User;
  onClose: () => void;
  onContactAdded: (contactUser: User) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  currentUser,
  onClose,
  onContactAdded,
}) => {
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [aliasName, setAliasName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);

  // Fetch available IDs in database for suggestion chips
  useEffect(() => {
    api.getDatabaseInspect()
      .then((data) => {
        if (data && data.allUserIds) {
          const filtered = data.allUserIds.filter(
            (id: string) => id.toLowerCase() !== currentUser.id.toLowerCase()
          );
          setSuggestedIds(filtered);
        }
      })
      .catch(() => {});
  }, [currentUser.id]);

  // Handle Search ID
  const handleSearch = async (targetIdToSearch?: string) => {
    const cleanId = (targetIdToSearch || searchId).trim().toLowerCase().replace(/^@/, '');
    if (!cleanId) return;

    if (cleanId === currentUser.id.toLowerCase()) {
      setError('Ini adalah ID Anda sendiri.');
      setFoundUser(null);
      return;
    }

    setSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      const data = await api.checkId(cleanId);
      if (data.exists && data.user) {
        setFoundUser(data.user);
      } else {
        setError(`Pengguna dengan ID @${cleanId} tidak ditemukan. Periksa kembali ID.`);
      }
    } catch {
      setError('Gagal mencari ID. Coba lagi.');
    } finally {
      setSearching(false);
    }
  };

  // Handle Add Contact Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.addContact(currentUser.id, foundUser.id, aliasName.trim() || undefined);
      onContactAdded(foundUser);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan kontak.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#222e35]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e9edef]">Tambah Kontak Baru</h2>
              <p className="text-[11px] text-[#8696a0]">Ketik ID pengguna untuk memulai chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Input */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
              ID Teman (LINE / ChatID style)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] font-semibold text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Ketik ID (contoh: budi_santoso)"
                  className="w-full pl-8 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={searching || !searchId.trim()}
                className="px-4 py-2.5 bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-[#00a884] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Cari
              </button>
            </div>
          </div>

          {/* Suggested IDs in Database */}
          {suggestedIds.length > 0 && !foundUser && (
            <div>
              <p className="text-[11px] text-[#8696a0] mb-1.5 font-medium">
                ID Pengguna Lain di Database:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSearchId(id);
                      handleSearch(id);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] border border-[#2a3942] transition flex items-center gap-1"
                  >
                    <span>@{id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Found User Profile Card */}
          {foundUser && (
            <div className="bg-[#202c33] border border-[#00a884]/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <img
                  src={foundUser.avatar}
                  alt={foundUser.displayName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00a884]/50 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#e9edef] truncate">
                      {foundUser.displayName}
                    </h3>
                    <UserCheck className="w-4 h-4 text-[#00a884] shrink-0" />
                  </div>
                  <p className="text-xs text-[#00a884] font-mono">@{foundUser.id}</p>
                  <p className="text-[11px] text-[#8696a0] truncate mt-0.5">{foundUser.bio}</p>
                </div>
              </div>

              {/* Optional Alias Name */}
              <div>
                <label className="block text-[11px] text-[#8696a0] mb-1">
                  Nama Panggilan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                  placeholder={`Default: ${foundUser.displayName}`}
                  className="w-full px-3 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-xs text-[#e9edef] placeholder-[#8696a0]/50 focus:outline-none focus:border-[#00a884]"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan Kontak...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Tambah ke Kontak & Mulai Chat
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
