import React, { useState, useEffect, useRef } from 'react';
import { Shield, UserPlus, KeyRound, Sparkles, Smartphone, CheckCircle2, XCircle, Loader2, ArrowRight, Eye, EyeOff, Camera, Upload, Server } from 'lucide-react';
import { User } from '../types';
import { api, isStaticHost } from '../utils/apiClient';
import { ServerConfigModal } from './ServerConfigModal';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'create' | 'connect'>('create');
  
  // Create ID fields
  const [createId, setCreateId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [bio, setBio] = useState('Ada di ChatID');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);

  // ID availability state
  const [idChecking, setIdChecking] = useState(false);
  const [idStatus, setIdStatus] = useState<{ available?: boolean; message?: string } | null>(null);

  // Connect ID fields
  const [connectId, setConnectId] = useState('');
  const [connectPin, setConnectPin] = useState('');
  const [showConnectPin, setShowConnectPin] = useState(false);

  // Global loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle custom photo upload on registration
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Harap pilih file gambar (JPG, PNG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
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
          setSelectedAvatar(canvas.toDataURL('image/jpeg', 0.88));
          setError(null);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Check ID availability with debounce
  useEffect(() => {
    const rawId = createId.trim().toLowerCase();
    if (!rawId) {
      setIdStatus(null);
      return;
    }
    if (rawId.length < 3) {
      setIdStatus({ available: false, message: 'Minimal 3 karakter' });
      return;
    }

    const timer = setTimeout(async () => {
      setIdChecking(true);
      try {
        const data = await api.checkId(rawId);
        if (!data.validFormat) {
          setIdStatus({ available: false, message: data.message });
        } else if (data.available) {
          setIdStatus({ available: true, message: 'ID unik tersedia!' });
        } else {
          setIdStatus({ available: false, message: 'ID sudah dipakai orang lain! Pilih ID berbeda.' });
        }
      } catch {
        setIdStatus(null);
      } finally {
        setIdChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [createId]);

  // Handle Create ID
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = createId.trim().toLowerCase();
    if (!cleanId || cleanId.length < 3) {
      setError('ID harus minimal 3 karakter.');
      return;
    }
    if (idStatus && !idStatus.available) {
      setError('ID sudah dipakai atau tidak valid. Silakan ganti.');
      return;
    }
    if (!displayName.trim()) {
      setError('Nama tampilan tidak boleh kosong.');
      return;
    }
    if (pin.length < 4) {
      setError('PIN keamanan minimal 4 digit untuk keamanan.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.createId({
        id: cleanId,
        displayName: displayName.trim(),
        pin,
        avatar: selectedAvatar,
        bio,
      });
      onSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Connect ID (From previous device)
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = connectId.trim().toLowerCase();
    if (!cleanId) {
      setError('Masukkan ID akun Anda.');
      return;
    }
    if (!connectPin) {
      setError('Masukkan PIN keamanan ID Anda.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.connectId({
        id: cleanId,
        pin: connectPin,
      });
      onSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyambungkan ID.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Switch for testing
  const handleQuickLogin = (demoId: string) => {
    setMode('connect');
    setConnectId(demoId);
    setConnectPin('123456');
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div id="auth-card" className="w-full max-w-md my-auto bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Branding */}
        <div className="bg-[#202c33] px-6 py-6 border-b border-[#222e35] text-center relative">
          {/* Server Config Button */}
          <button
            type="button"
            onClick={() => setShowServerConfig(true)}
            title="Konfigurasi Server & Hosting"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-[#111b21]/70 hover:bg-[#111b21] text-[#8696a0] hover:text-[#00a884] border border-[#222e35] text-[11px] flex items-center gap-1 cursor-pointer transition"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Server</span>
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 text-[#00a884] mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-[#e9edef] tracking-tight flex items-center justify-center gap-2">
            ChatID Messenger
            <span className="text-[10px] font-semibold bg-[#00a884] text-[#111b21] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Enkripsi AES
            </span>
          </h1>
          <p className="text-xs text-[#8696a0] mt-1">
            Chatting aman berbasis ID unik tanpa membagikan nomor telepon
          </p>

          {isStaticHost() && (
            <div className="mt-2.5 text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/20 py-1.5 px-3 rounded-lg flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Mode Statis (GitHub Pages)
              </span>
              <button
                type="button"
                onClick={() => setShowServerConfig(true)}
                className="text-[#00a884] underline font-semibold cursor-pointer"
              >
                Atur Server
              </button>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#111b21] p-1 rounded-xl mt-4 border border-[#2a3942]">
            <button
              id="tab-create-id"
              type="button"
              onClick={() => { setMode('create'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-[#00a884] text-[#111b21] shadow-sm'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Buat ID Baru
            </button>
            <button
              id="tab-connect-id"
              type="button"
              onClick={() => { setMode('connect'); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'connect'
                  ? 'bg-[#00a884] text-[#111b21] shadow-sm'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Sambungkan ID Lama
            </button>
          </div>
        </div>

        {/* Card Body Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'create' ? (
            /* CREATE NEW UNIQUE ID FORM */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* ID Input with uniqueness check */}
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  Tentukan ID Unik Anda (Tidak boleh sama dengan orang lain)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] font-semibold text-sm">
                    @
                  </span>
                  <input
                    id="input-create-id"
                    type="text"
                    value={createId}
                    onChange={(e) => setCreateId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="contoh: alex_01 atau rian99"
                    maxLength={20}
                    className="w-full pl-8 pr-10 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {idChecking && <Loader2 className="w-4 h-4 text-[#00a884] animate-spin" />}
                    {!idChecking && idStatus?.available === true && (
                      <CheckCircle2 className="w-4 h-4 text-[#00a884]" />
                    )}
                    {!idChecking && idStatus?.available === false && (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                {idStatus?.message && (
                  <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${
                    idStatus.available ? 'text-[#00a884]' : 'text-red-400'
                  }`}>
                    {idStatus.message}
                  </p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  Nama Tampilan
                </label>
                <input
                  id="input-create-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama lengkap atau panggilan Anda"
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
                  required
                />
              </div>

              {/* PIN Keamanan */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#8696a0]">
                    PIN Keamanan (Untuk HP / Perangkat Lain)
                  </label>
                  <span className="text-[11px] text-[#8696a0]/80">Minimal 4 digit</span>
                </div>
                <div className="relative">
                  <input
                    id="input-create-pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Contoh: 123456"
                    maxLength={10}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#8696a0] mt-1">
                  💡 Simpan PIN ini untuk menyambungkan chat & kontak Anda di HP lain.
                </p>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-2">
                  Foto Profil (Bisa Upload Foto Sendiri atau Pilih Avatar)
                </label>

                {/* Custom Photo Upload Box */}
                <div className="flex items-center gap-3 p-3 bg-[#202c33]/70 border border-[#2a3942] rounded-xl mb-3">
                  <div className="relative group shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#00a884] shadow-md bg-[#111b21]">
                      <img
                        src={selectedAvatar}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover group-hover:brightness-75 transition"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow">
                      <Camera className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#00a884]/15 hover:bg-[#00a884]/25 border border-[#00a884]/40 text-[#00a884] font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Foto Sendiri
                    </button>
                    <p className="text-[10px] text-[#8696a0] mt-1 truncate">
                      Pilih gambar dari galeri HP / komputer
                    </p>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <span className="block text-[11px] text-[#8696a0] mb-1.5">
                  Atau pilih avatar karakter:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative w-10 h-10 rounded-full overflow-hidden shrink-0 transition-transform ${
                        selectedAvatar === url
                          ? 'ring-2 ring-[#00a884] scale-105 opacity-100'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-create-submit"
                type="submit"
                disabled={loading || (idStatus !== null && !idStatus.available)}
                className="w-full mt-2 py-3 px-4 bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50 text-[#111b21] font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat Akun & Kunci Enkripsi...
                  </>
                ) : (
                  <>
                    Buat ID & Masuk ke Chat
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* CONNECT EXISTING ID FORM */
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div className="bg-[#202c33]/60 border border-[#2a3942] p-3 rounded-xl text-xs text-[#8696a0] leading-relaxed">
                📱 <strong className="text-[#e9edef]">Punya ID dari HP sebelumnya?</strong> Masukkan ID dan PIN Anda untuk memulihkan seluruh riwayat chat, foto, dan daftar kontak Anda secara otomatis.
              </div>

              {/* ID Input */}
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  ID Pengguna Anda
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0] font-semibold text-sm">
                    @
                  </span>
                  <input
                    id="input-connect-id"
                    type="text"
                    value={connectId}
                    onChange={(e) => setConnectId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="contoh: budi_santoso"
                    className="w-full pl-8 pr-4 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition"
                    required
                  />
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1.5">
                  PIN Keamanan ID
                </label>
                <div className="relative">
                  <input
                    id="input-connect-pin"
                    type={showConnectPin ? 'text' : 'password'}
                    value={connectPin}
                    onChange={(e) => setConnectPin(e.target.value)}
                    placeholder="Masukkan PIN Anda"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#202c33] border border-[#2a3942] focus:border-[#00a884] focus:outline-none rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0]/60 transition font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConnectPin(!showConnectPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
                  >
                    {showConnectPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Connect */}
              <button
                id="btn-connect-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50 text-[#111b21] font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyambungkan & Memulihkan Chat...
                  </>
                ) : (
                  <>
                    Sambungkan & Pulihkan Data
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Demo Account Quick Links for Testing */}
          <div className="mt-6 pt-5 border-t border-[#222e35]">
            <p className="text-[11px] font-semibold text-[#8696a0] mb-2 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#00a884]" />
              Akun Uji Coba Cepat (PIN: 123456)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('budi_santoso')}
                className="p-2 rounded-lg bg-[#202c33]/70 hover:bg-[#202c33] border border-[#2a3942] text-left text-xs transition flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center text-[10px] font-bold">
                  B
                </div>
                <div className="truncate">
                  <div className="font-medium text-[#e9edef] truncate">Budi Santoso</div>
                  <div className="text-[10px] text-[#8696a0]">@budi_santoso</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sarah_art')}
                className="p-2 rounded-lg bg-[#202c33]/70 hover:bg-[#202c33] border border-[#2a3942] text-left text-xs transition flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center text-[10px] font-bold">
                  S
                </div>
                <div className="truncate">
                  <div className="font-medium text-[#e9edef] truncate">Sarah Art</div>
                  <div className="text-[10px] text-[#8696a0]">@sarah_art</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showServerConfig && (
        <ServerConfigModal onClose={() => setShowServerConfig(false)} />
      )}
    </div>
  );
};
