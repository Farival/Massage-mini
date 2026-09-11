import React, { useState } from 'react';
import { Server, Globe, CheckCircle2, XCircle, Loader2, X, ExternalLink, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import { getCustomBackendUrl, setCustomBackendUrl, checkBackendHealth, isStaticHost } from '../utils/apiClient';

interface ServerConfigModalProps {
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ onClose }) => {
  const [url, setUrl] = useState(getCustomBackendUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBackendUrl(url);
    window.location.reload();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    // Temporarily set to test
    const cleanUrl = url.trim().replace(/\/$/, '');
    if (!cleanUrl) {
      const ok = await checkBackendHealth();
      setTesting(false);
      setTestResult({
        success: ok,
        message: ok ? 'Server default terhubung dengan baik!' : 'Server backend default tidak merespons (Mode Lokal Aktif).',
      });
      return;
    }

    try {
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        setTestResult({ success: true, message: 'Server online dan terhubung dengan sukses!' });
      } else {
        setTestResult({ success: false, message: `Server merespons dengan status ${res.status}.` });
      }
    } catch {
      setTestResult({ success: false, message: 'Tidak dapat menghubungi server. Pastikan URL benar dan server aktif.' });
    } finally {
      setTesting(false);
    }
  };

  const isGhPages = isStaticHost();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#222e35] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e9edef]">Status Server & Database</h2>
              <p className="text-[11px] text-[#8696a0]">
                {isGhPages ? 'Mode Statis (GitHub Pages)' : 'Mode Fullstack (Node.js Server)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Current Status Box */}
          <div className="p-4 rounded-xl bg-[#202c33]/70 border border-[#222e35] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8696a0]">Penyimpanan Data Saat Ini:</span>
              <span className="text-xs font-bold text-[#00a884] flex items-center gap-1.5 bg-[#00a884]/15 px-2.5 py-0.5 rounded-full border border-[#00a884]/30">
                <Database className="w-3.5 h-3.5" />
                {isGhPages && !getCustomBackendUrl() ? 'Lokal Browser (LocalStorage)' : 'Database Server Node.js'}
              </span>
            </div>
            <p className="text-xs text-[#8696a0] leading-relaxed">
              {isGhPages && !getCustomBackendUrl()
                ? 'Karena berjalan di GitHub Pages (hosting statis), data akun dan chat tersimpan aman di memori perangkat ini. Untuk chatting real-time antar perangkat berbeda secara online, hubungkan URL server backend di bawah.'
                : 'Server backend aktif mengelola database akun, enkripsi, dan koneksi WebSocket real-time antar perangkat.'}
            </p>
          </div>

          {/* Custom Backend URL Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#e9edef] mb-1.5 flex items-center justify-between">
                <span>URL Server Backend Eksternal (Opsional)</span>
                <span className="text-[10px] text-[#8696a0] font-normal">Contoh: https://my-chat.onrender.com</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#202c33] border border-[#222e35] rounded-xl text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3.5 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#222e35] border border-[#222e35] text-xs font-bold text-[#e9edef] flex items-center gap-1.5 transition cursor-pointer"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tes'}
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-[#00a884]/15 border-[#00a884]/40 text-[#00a884]'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-[#00a884] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGuide ? 'Tutup Panduan' : 'Cara Deploy Online (Gratis)'}
              </button>

              <div className="flex gap-2">
                {url && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('');
                      setCustomBackendUrl('');
                      window.location.reload();
                    }}
                    className="px-3 py-2 rounded-xl text-xs text-[#8696a0] hover:text-[#e9edef] transition cursor-pointer"
                  >
                    Reset ke Default
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-xs font-bold text-[#111b21] transition cursor-pointer"
                >
                  Simpan & Terapkan
                </button>
              </div>
            </div>
          </form>

          {/* Deployment Guide */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-[#202c33] border border-[#222e35] space-y-3 text-xs text-[#8696a0] animate-in fade-in">
              <h3 className="font-bold text-[#e9edef] text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00a884]" />
                Mengapa Layar Putih & Cara Deploy Online:
              </h3>
              <ol className="list-decimal pl-4 space-y-2 text-[#d1d7db] leading-relaxed">
                <li>
                  <strong className="text-[#e9edef]">Penyebab Layar Putih:</strong> Di GitHub Pages, link aset sebelumnya mencari direktori root (<code className="text-[#00a884]">/assets/...</code>) bukan direktori repositori Anda (<code className="text-[#00a884]">/Massage-me/assets/...</code>). Ini sudah kami perbaiki di konfigurasi <code className="text-[#00a884]">vite.config.ts</code> dengan <code className="text-[#00a884]">base: './'</code>.
                </li>
                <li>
                  <strong className="text-[#e9edef]">GitHub Pages Hanya Statis:</strong> GitHub Pages tidak bisa mengeksekusi server Node.js (<code className="text-[#00a884]">server.ts</code>) atau koneksi WebSocket untuk pertukaran pesan antar HP berbeda.
                </li>
                <li>
                  <strong className="text-[#e9edef]">Solusi Deploy Online Mudah (Pilih salah satu):</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-[#8696a0]">
                    <li>
                      <strong className="text-[#e9edef]">Render.com (Gratis & Mendukung WebSocket):</strong> Buat akun di Render.com &gt; New &gt; Web Service &gt; Hubungkan repo GitHub ini &gt; Build Command: <code className="text-[#00a884]">npm run build</code> &gt; Start Command: <code className="text-[#00a884]">npm run start</code>.
                    </li>
                    <li>
                      <strong className="text-[#e9edef]">Google AI Studio (Cloud Run):</strong> Klik menu Settings / Deploy di Google AI Studio untuk otomatis online dalam 1 klik dengan server backend aktif!
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
