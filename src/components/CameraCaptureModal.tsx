import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Check,
  SwitchCamera,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react';

interface CameraCaptureModalProps {
  onClose: () => void;
  onCapture: (photoDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  onClose,
  onCapture,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  // Check if multiple video devices exist
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length > 1) {
          setHasMultipleCameras(true);
        }
      }).catch(() => {});
    }
  }, []);

  // Stop current stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop any existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat atau browser ini tidak mendukung akses kamera langsung.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.warn('getUserMedia error:', err);
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Silakan berikan izin kamera di browser Anda atau gunakan tombol Kamera Sistem di bawah.'
          : 'Tidak dapat mengakses kamera. Silakan gunakan tombol Kamera Sistem untuk mengambil foto.';
      setCameraError(message);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stream]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      // Cleanup tracks on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Capture frame from video stream
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    const MAX_DIM = 1280;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, flip horizontally for natural mirror look
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      stopStream();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (capturedPhoto) {
      stopStream();
      onCapture(capturedPhoto);
    }
  };

  // Handle fallback file / capture input
  const handleFallbackCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedPhoto(dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="h-14 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#2a3942] z-10">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <Camera className="w-5 h-5 text-[#00a884]" />
            <h2 className="font-bold text-sm">
              {capturedPhoto ? 'Pratinjau Foto' : 'Ambil Foto Langsung'}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {!capturedPhoto && hasMultipleCameras && !cameraError && (
              <button
                type="button"
                onClick={handleToggleCamera}
                title="Putar Kamera Depan/Belakang"
                className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248] transition cursor-pointer"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              title="Tutup"
              className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {/* Fallback Native Input */}
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackCapture}
            className="hidden"
          />

          {capturedPhoto ? (
            /* Captured Snapshot Preview */
            <img
              src={capturedPhoto}
              alt="Hasil Foto"
              className="w-full h-full object-contain"
            />
          ) : cameraError ? (
            /* Error & Fallback View */
            <div className="p-6 text-center max-w-xs flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#e9edef] leading-relaxed mb-4">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="px-4 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg"
              >
                <Camera className="w-4 h-4" />
                Buka Kamera HP / Perangkat
              </button>
            </div>
          ) : (
            /* Live Camera Stream */
            <>
              {isLoadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                  <Loader2 className="w-8 h-8 text-[#00a884] animate-spin mb-2" />
                  <span className="text-xs text-[#8696a0]">Menghubungkan ke kamera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl flex items-center justify-center">
                <div className="w-3 h-3 border-t-2 border-l-2 border-[#00a884] absolute top-2 left-2" />
                <div className="w-3 h-3 border-t-2 border-r-2 border-[#00a884] absolute top-2 right-2" />
                <div className="w-3 h-3 border-b-2 border-l-2 border-[#00a884] absolute bottom-2 left-2" />
                <div className="w-3 h-3 border-b-2 border-r-2 border-[#00a884] absolute bottom-2 right-2" />
              </div>
            </>
          )}
        </div>

        {/* Bottom Control Actions */}
        <div className="p-4 bg-[#202c33] flex items-center justify-around border-t border-[#2a3942]">
          {capturedPhoto ? (
            /* Actions After Snapping */
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 max-w-[150px] py-2.5 px-4 rounded-xl bg-[#2a3942] hover:bg-[#374248] text-xs font-semibold text-[#e9edef] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Ambil Ulang
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 max-w-[180px] py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-xs font-bold text-[#111b21] flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#00a884]/20"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto Ini
              </button>
            </div>
          ) : !cameraError ? (
            /* Shutter Button & Controls */
            <div className="flex items-center justify-between w-full max-w-xs mx-auto">
              {/* Left: Native Camera shortcut */}
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                title="Gunakan Kamera Bawaan HP"
                className="p-3 rounded-full bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition cursor-pointer"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Center: Big Shutter Button */}
              <button
                type="button"
                onClick={handleSnapPhoto}
                title="Ambil Foto"
                disabled={isLoadingCamera}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <div className="w-full h-full rounded-full bg-[#00a884] hover:bg-[#00a884]/90 flex items-center justify-center text-[#111b21]">
                  <Camera className="w-6 h-6" />
                </div>
              </button>

              {/* Right: Flip Camera button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                title="Putar Kamera"
                className="p-3 rounded-full bg-[#111b21] text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition cursor-pointer"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="py-2 px-6 rounded-xl bg-[#2a3942] hover:bg-[#374248] text-xs font-semibold text-[#e9edef] transition cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
