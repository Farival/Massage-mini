import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Check,
  Loader2,
  Copy,
  User as UserIcon,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { User } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { api } from '../utils/apiClient';

interface ProfileModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updated: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onClose,
  onUpdateUser,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || 'Ada di ChatID');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local image file upload & compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Harap pilih file gambar (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran file maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Compress / resize to max 400x400 to keep it crisp yet lightweight
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatar(dataUrl);
          setError(null);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(`@${currentUser.id}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Submit profile changes to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Nama tampilan tidak boleh kosong');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = await api.updateUser(currentUser.id, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
      });

      onUpdateUser(data.user);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#222e35]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e9edef]">Edit Profil & Foto</h2>
              <p className="text-[11px] text-[#8696a0]">Kustomisasi foto profil dan informasi akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-[#00a884]/15 border border-[#00a884]/40 text-[#00a884] text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4" /> Profil dan foto berhasil disimpan!
            </div>
          )}

          {/* Profile Picture Center Uploader */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-[#00a884] shadow-2xl bg-[#202c33] relative">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover group-hover:brightness-75 transition duration-200"
                />
              </div>

              {/* Upload trigger button overlaid */}
              <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-7 h-7 mb-1" />
                <span className="text-[11px] font-semibold">Ganti Foto</span>
              </div>

              {/* Badge camera in bottom right */}
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00a884] border-2 border-[#111b21] flex items-center justify-center text-[#111b21] shadow-lg">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Button options under avatar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowCameraModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#d33a67]/20 hover:bg-[#d33a67]/30 border border-[#d33a67]/40 text-xs font-bold text-[#f472b6] flex items-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Ambil Foto (Kamera)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#00a884]/15 hover:bg-[#00a884]/25 border border-[#00a884]/40 text-xs font-bold text-[#00a884] flex items-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Pilih dari Galeri
              </button>

              <button
                type="button"
                onClick={() => setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}_${Date.now()}`)}
                className="px-3 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-xs text-[#8696a0] hover:text-[#e9edef] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
                Avatar Acak
              </button>
            </div>
          </div>

          {/* Quick Preset Avatars */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-2">
              Atau Pilih dari Pilihan Avatar:
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatar(url)}
                  className={`w-11 h-11 rounded-full overflow-hidden shrink-0 transition-all cursor-pointer ${
                    avatar === url
                      ? 'ring-3 ring-[#00a884] scale-105 opacity-100 shadow-md'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* User ID (Permanent / Readonly with copy) */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
              ID Unik Pengguna (Permanen)
            </label>
            <div className="flex items-center bg-[#202c33]/80 border border-[#2a3942] rounded-xl px-3.5 py-2.5 justify-between">
              <span className="font-mono text-sm text-[#00a884] font-bold">
                @{currentUser.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-xs text-[#8696a0] hover:text-[#e9edef] flex items-center gap-1 cursor-pointer transition"
              >
                {copiedId ? (
                  <span className="text-[#00a884] font-semibold">Tersalin ✓</span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#8696a0] mt-1">
              ID ini dibagikan ke teman agar mereka dapat mencari & menambahkan Anda ke kontak.
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder="Nama lengkap Anda"
              className="w-full px-3.5 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
              required
            />
          </div>

          {/* Bio / Status */}
          <div>
            <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
              Info / Status Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={80}
              placeholder="Info status (contoh: Ada di ChatID)"
              className="w-full px-3.5 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan Perubahan...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Simpan Profil & Foto
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showCameraModal && (
        <CameraCaptureModal
          onClose={() => setShowCameraModal(false)}
          onCapture={(photoDataUrl) => {
            setAvatar(photoDataUrl);
            setShowCameraModal(false);
          }}
        />
      )}
    </div>
  );
};
