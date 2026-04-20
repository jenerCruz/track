import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraId = "reader";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(cameraId);
    scannerRef.current = html5QrCode;

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 }
    };

    html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
      (decodedText) => {
        onScan(decodedText);
      },
      (errorMessage) => {
        // We don't necessarily want to toast every frame error
        if (onError && !errorMessage.includes("No QR code found")) {
          onError(errorMessage);
        }
      }
    ).catch((err) => {
      console.error("Unable to start scanning", err);
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, []); // Only run once on mount

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-square flex items-center justify-center relative">
      <div id={cameraId} className="w-full h-full object-cover"></div>
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20"></div>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
          Alinea el código QR
        </p>
      </div>
    </div>
  );
}
