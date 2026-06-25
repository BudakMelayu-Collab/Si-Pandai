import React from 'react';
import { X, Smartphone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  url: string;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function QRCodeModal({ url, onClose, title = "Scan via HP", subtitle = "Scan QR Code di bawah menggunakan kamera HP Anda" }: QRCodeModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 mb-2">{title}</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-[250px]">
            {subtitle}
          </p>

          <div className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <QRCodeSVG 
              value={url} 
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#1e293b" 
            />
          </div>

          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-8 flex items-center gap-2">
            <QrCode className="w-3.5 h-3.5" />
            Buka URL di HP untuk menscan
          </p>
        </div>
      </div>
    </div>
  );
}
