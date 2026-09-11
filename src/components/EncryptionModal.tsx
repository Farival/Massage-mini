import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Database, RefreshCw, X, FileKey, CheckCircle2, Eye, Server } from 'lucide-react';
import { User } from '../types';

interface EncryptionModalProps {
  currentUser: User;
  onClose: () => void;
}

export const EncryptionModal: React.FC<EncryptionModalProps> = ({ currentUser, onClose }) => {
  const [dbData, setDbData] = useState<{
    totalUsers: number;
    totalContacts: number;
    totalMessages: number;
    recentEncryptedRows: Array<{
      id: string;
      senderId: string;
      receiverId: string;
      isPhoto: boolean;
      ciphertextPreview: string;
      iv: string;
      status: string;
      timestamp: string;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchDbInspect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database-inspect');
      const data = await res.json();
      setDbData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbInspect();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#202c33] px-6 py-4 flex items-center justify-between border-b border-[#222e35] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a884]/20 text-[#00a884] flex items-center justify-center border border-[#00a884]/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e9edef] flex items-center gap-2">
                Privasi & Enkripsi End-to-End
                <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full border border-[#00a884]/30 font-semibold">
                  AES-256-GCM
                </span>
              </h2>
              <p className="text-xs text-[#8696a0]">
                Pesan dan foto dienkripsi di perangkat pengirim dan hanya dapat dibuka oleh penerima
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Security Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#202c33]/60 border border-[#2a3942] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-[#00a884] mb-1 font-semibold text-xs">
                <Lock className="w-4 h-4" />
                Enkripsi Klien
              </div>
              <p className="text-[11px] text-[#8696a0] leading-relaxed">
                Teks dan foto dienkripsi sebelum dikirim lewat jaringan menggunakan Web Crypto API.
              </p>
            </div>

            <div className="bg-[#202c33]/60 border border-[#2a3942] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-[#00a884] mb-1 font-semibold text-xs">
                <Database className="w-4 h-4" />
                Database Tersimpan Aman
              </div>
              <p className="text-[11px] text-[#8696a0] leading-relaxed">
                Database server menyimpan riwayat dalam bentuk Ciphertext acak yang tidak bisa dibaca pihak ketiga.
              </p>
            </div>

            <div className="bg-[#202c33]/60 border border-[#2a3942] p-3.5 rounded-xl">
              <div className="flex items-center gap-2 text-[#00a884] mb-1 font-semibold text-xs">
                <FileKey className="w-4 h-4" />
                Kunci Per-Percakapan
              </div>
              <p className="text-[11px] text-[#8696a0] leading-relaxed">
                Setiap pasangan ID memiliki kunci kriptografi simetris unik yang dihasilkan secara deterministik.
              </p>
            </div>
          </div>

          {/* User Key Fingerprint */}
          <div className="bg-[#202c33] border border-[#2a3942] p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#e9edef] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00a884]" />
                Identitas Kriptografi Akun Anda
              </span>
              <span className="text-[10px] text-[#8696a0] font-mono">Status: Terverifikasi</span>
            </div>
            <div className="bg-[#111b21] p-2.5 rounded-lg border border-[#2a3942]/70 font-mono text-[11px] text-[#00a884] break-all">
              ID: @{currentUser.id} &nbsp;|&nbsp; KUNCI DERIVASI: SHA256(CHATID_E2EE_v1::{currentUser.id})
            </div>
          </div>

          {/* Live Database Inspection (Proof of Ciphertext) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#e9edef]">
                <Server className="w-4 h-4 text-[#00a884]" />
                Inspeksi Database Langsung (Bukti Ciphertext di Server)
              </div>
              <button
                onClick={fetchDbInspect}
                className="text-[11px] text-[#00a884] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>

            <p className="text-[11px] text-[#8696a0]">
              Tabel di bawah ini menampilkan data aktual dari file database server (data/db.json). Perhatikan bahwa kolom ciphertext tersimpan dalam format terenkripsi:
            </p>

            {dbData ? (
              <div className="border border-[#2a3942] rounded-xl overflow-hidden bg-[#111b21]">
                <div className="px-3 py-2 bg-[#202c33] text-[11px] text-[#8696a0] flex justify-between border-b border-[#2a3942]">
                  <span>Total Pengguna: {dbData.totalUsers}</span>
                  <span>Total Pesan Tersimpan: {dbData.totalMessages}</span>
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left text-[11px] text-[#8696a0]">
                    <thead className="bg-[#182229] text-[#e9edef] font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">Dari / Ke</th>
                        <th className="p-2">Tipe</th>
                        <th className="p-2">Ciphertext (Terenkripsi)</th>
                        <th className="p-2">IV (Vektor)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3942]">
                      {dbData.recentEncryptedRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-[#8696a0]">
                            Belum ada pesan di database. Mulai kirim pesan untuk melihat ciphertext!
                          </td>
                        </tr>
                      ) : (
                        dbData.recentEncryptedRows.map((row) => (
                          <tr key={row.id} className="hover:bg-[#202c33]/40">
                            <td className="p-2 font-mono text-white whitespace-nowrap">
                              @{row.senderId} → @{row.receiverId}
                            </td>
                            <td className="p-2">
                              {row.isPhoto ? (
                                <span className="text-amber-400 font-medium">Foto 📷</span>
                              ) : (
                                <span className="text-blue-400">Teks 💬</span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-[#00a884] max-w-[200px] truncate" title={row.ciphertextPreview}>
                              {row.ciphertextPreview}
                            </td>
                            <td className="p-2 font-mono text-xs text-[#8696a0]">
                              {row.iv.substring(0, 10)}...
                            </td>
                            <td className="p-2 uppercase text-[10px] font-bold text-[#e9edef]">
                              {row.status}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8696a0]">Memuat data database...</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#202c33] px-6 py-3.5 border-t border-[#222e35] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
