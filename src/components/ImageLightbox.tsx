import React, { useEffect } from 'react';
import { X, Download, ZoomIn, Calendar, ShieldCheck } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  caption?: string;
  senderName: string;
  timestamp: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  caption,
  senderName,
  timestamp,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `chatID_photo_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[92vh] flex flex-col bg-[#111b21] rounded-2xl border border-[#222e35] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox Header */}
        <div className="bg-[#202c33]/90 backdrop-blur-sm px-5 py-3 flex items-center justify-between border-b border-[#222e35]">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-bold text-[#e9edef] flex items-center gap-1.5">
                <span>{senderName}</span>
                <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Foto Terenkripsi
                </span>
              </div>
              <div className="text-[11px] text-[#8696a0] flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(timestamp).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              title="Unduh Foto"
              className="p-2 rounded-lg bg-[#111b21] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] transition flex items-center gap-1 text-xs"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Simpan</span>
            </button>
            <button
              onClick={onClose}
              title="Tutup"
              className="p-2 rounded-lg bg-[#111b21] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Container */}
        <div className="flex-1 flex items-center justify-center p-2 bg-black/40 overflow-hidden min-h-[300px]">
          <img
            src={imageUrl}
            alt="Foto Chat"
            className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-lg select-none"
          />
        </div>

        {/* Photo Caption if present */}
        {caption && (
          <div className="bg-[#202c33] px-5 py-3 border-t border-[#222e35] text-sm text-[#e9edef] leading-relaxed">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
