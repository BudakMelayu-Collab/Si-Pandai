import React, { useState, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { updateRecipientReceiptPdf, updateRecipientMPZISPdf, updateRecipientPdf, updateRecipientSurveyPdf } from '../firebase';
import { compressImage } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipient } from '../types';

interface MobileScannerProps {
  recipientId: string;
  docType: 'receipt' | 'mpzis' | 'eppd' | 'survey';
}

export default function MobileScanner({ recipientId, docType }: MobileScannerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);

  useEffect(() => {
    // Load recipient context
    const loadRecipient = async () => {
      try {
        const ref = doc(db, 'recipients', recipientId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRecipient(snap.data() as Recipient);
        }
      } catch (e) {
        console.error("Gagal memuat recipient", e);
      }
    }
    loadRecipient();
  }, [recipientId]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;

        // Compress image before saving
        if (file.type.startsWith('image/')) {
          base64 = await compressImage(base64);
        }

        switch (docType) {
          case 'receipt':
            await updateRecipientReceiptPdf(recipientId, base64);
            break;
          case 'mpzis':
            await updateRecipientMPZISPdf(recipientId, base64);
            break;
          case 'eppd':
            await updateRecipientPdf(recipientId, base64); // This currently handles eppd pdf
            break;
          case 'survey':
            await updateRecipientSurveyPdf(recipientId, base64);
            break;
          default:
            throw new Error("Tipe dokumen tidak valid");
        }

        setSuccess(true);
      };
      
      reader.onerror = () => {
        throw new Error("Gagal membaca file gambar");
      }

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Gagal mengunggah foto. Pastikan koneksi stabil.");
      setSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const docNames = {
    receipt: 'Tanda Terima',
    mpzis: 'MPZIS / Memorandum',
    eppd: 'E-PPD',
    survey: 'Lembar Verifikasi'
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Berhasil!</h2>
        <p className="text-slate-600 mb-8 max-w-sm">
          Dokumen {docNames[docType]} berhasil diunggah. Silakan kembali ke aplikasi di komputer Anda.
        </p>
        <button 
          onClick={() => { setSuccess(false); setError(null); }}
          className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm"
        >
          Scan Ulang Dokumen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-600" />
          Si-PANDAI Scanner
        </h1>
        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider">
          {docNames[docType]}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {recipient && (
          <div className="w-full max-w-sm bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center mt-4">
            <h3 className="font-bold text-indigo-900 line-clamp-1">{recipient.name}</h3>
            <p className="text-xs text-indigo-700 mt-1 line-clamp-1">"{recipient.programName}"</p>
          </div>
        )}

        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-indigo-900 animate-pulse">Mengunggah Foto...</p>
          </div>
        ) : (
          <div className="w-full max-w-sm gap-4 flex flex-col">
            <label className="w-full aspect-[4/3] bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-100 transition-all group">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <div className="text-center">
                <span className="font-extrabold text-slate-700 block">Ambil Foto Dokumen</span>
                <span className="text-xs text-slate-500 mt-1 block">Gunakan Kamera HP Anda</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handleCapture} 
              />
            </label>

            <label className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all font-bold text-slate-600 text-sm">
              <Upload className="w-4 h-4" />
              Pilih dari Galeri/File
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                onChange={handleCapture} 
              />
            </label>
          </div>
        )}

        {error && (
          <div className="w-full max-w-sm bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex gap-2 text-left mt-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
