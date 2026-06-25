import React, { useState, useEffect } from 'react';
import { Recipient } from '../types';
import QRCodeModal from './QRCodeModal';
import { 
  Printer, X, FileCheck, Edit3, Upload, Image as ImageIcon, 
  Trash2, Eye, FileText, AlertCircle, ChevronRight, Loader2,
  Download, Smartphone
} from 'lucide-react';
import { cn, compressImage, isBase64SizeValid } from '../lib/utils';
import * as storage from '../lib/storage';

interface ReceiptTemplateProps {
  recipient: Recipient;
  onClose: () => void;
  onEdit: (recipient: Recipient) => void;
}

const DOCUMENT_OPTIONS = [
  "Surat Permohonan",
  "Fotocopy KTP",
  "Fotocopy KK",
  "Surat Keterangan Tidak Mampu Asli",
  "Surat Keterangan Tidak Mampu Fotocopy",
  "Surat Kontrol Rumah Sakit",
  "Surat Rawat Inap Pasien",
  "Foto Mustahik",
  "Fotocopy Buku Rekening Bank",
  "Surat Keterangan Aktif Belajar",
  "Surat Keterangan Aktif Kuliah",
  "Fotocopy Rapor",
  "Fotocopy KRS",
  "Fotocopy KHS",
  "Fotocopy Transkip Nilai",
  "Lainnya"
];

export default function ReceiptTemplate({ recipient, onClose, onEdit }: ReceiptTemplateProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'template' | 'scan'>('template');
  
  const [signedReceiptPdfUrl, setSignedReceiptPdfUrl] = useState<string | null>(null);
  const [signedPdfBlobUrl, setSignedPdfBlobUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [scale, setScale] = useState(0.85);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedRecipientId, setLoadedRecipientId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Local state for template-specific edits
  const [receiptData, setReceiptData] = useState({
    name: recipient.name,
    subject: `${recipient.aidType} - ${recipient.programName}`,
    docCount: '1 (Satu) Berkas',
    identity: `${recipient.nik} / ${recipient.kk}`,
    phone: recipient.contact,
    address: `${recipient.address}, ${recipient.kampung}, ${recipient.district}`,
    documents: [
      'Surat Permohonan',
      'Fotocopy KTP',
      'Fotocopy KK',
      'Surat Keterangan Tidak Mampu Asli',
      'Foto Mustahik'
    ],
    giverName: '',
    receiverLabel: 'Penerima Berkas',
    receiverName: '',
    giverLabel: 'Pemberi Berkas'
  });

  // Load saved data from storage/cloud on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      setLogo(await storage.getItem('baznas_logo'));

      // Try local storage first
      let savedData = await storage.getItem(`receipt_data_${recipient.id}`);

      // If not in local storage, try cloud
      if (!savedData) {
        try {
          const { getRecipientTemplateData } = await import('../firebase');
          savedData = await getRecipientTemplateData(recipient.id, 'receipt');
          if (savedData) {
            await storage.setItem(`receipt_data_${recipient.id}`, savedData);
          }
        } catch (e) {
          console.error("Cloud receipt load failed", e);
        }
      }

      if (savedData) {
        setReceiptData(typeof savedData === 'string' ? JSON.parse(savedData) : savedData);
      }
      
      setLoadedRecipientId(recipient.id);
      setIsLoaded(true);
    };
    loadData();
  }, [recipient.id]);

  // Auto-save receipt data
  useEffect(() => {
    if (!isLoaded || loadedRecipientId !== recipient.id) return;

    const saveData = async () => {
      setSaveStatus('saving');
      try {
        await storage.setItem(`receipt_data_${recipient.id}`, receiptData);
        const { saveRecipientTemplateData } = await import('../firebase');
        await saveRecipientTemplateData(recipient.id, 'receipt', receiptData);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Cloud receipt save failed", e);
        setSaveStatus('error');
      }
    };

    const timer = setTimeout(saveData, 1500);
    return () => clearTimeout(timer);
  }, [receiptData, recipient.id, isLoaded, loadedRecipientId]);

  const [showQRModal, setShowQRModal] = useState(false);

  // Stream scan from subcollection
  useEffect(() => {
    // Only start attempting to load or stream if we have a recipient
    if (!recipient.id) return;
    
    let isMounted = true;
    
    const startStream = async () => {
      try {
        const { streamRecipientScan } = await import('../firebase');
        return streamRecipientScan(recipient.id, 'receipt', (base64) => {
          if (!isMounted) return;
          if (base64) {
            setSignedReceiptPdfUrl(base64);
            // Auto switch to scan mode if a new scan comes in
            setViewMode('scan');
            setIsLoadingFile(false);
          } else {
            setSignedReceiptPdfUrl(null);
            setIsLoadingFile(false);
          }
        });
      } catch (e) {
        console.error("Error setting up scan stream", e);
      }
    };
    
    setIsLoadingFile(true);
    let unsubscribe: any = null;
    startStream().then(unsub => {
      if (unsub) unsubscribe = unsub;
    });
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [recipient.id]);

  // Convert Base64 to Blob URL
  useEffect(() => {
    if (signedReceiptPdfUrl && signedReceiptPdfUrl.startsWith('data:application/pdf')) {
      const createBlobUrl = async () => {
        try {
          const response = await fetch(signedReceiptPdfUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setSignedPdfBlobUrl(url);
        } catch (e) {
          console.error("Failed to create blob URL", e);
        }
      };
      createBlobUrl();
      return () => {
        if (signedPdfBlobUrl) URL.revokeObjectURL(signedPdfBlobUrl);
      };
    } else {
      setSignedPdfBlobUrl(null);
    }
  }, [signedReceiptPdfUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setLogo(base64);
        await storage.setItem('baznas_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePdfToServer = async (base64: string | null) => {
    setIsUploading(true);
    try {
      const { updateRecipientReceiptPdf } = await import('../firebase');
      await updateRecipientReceiptPdf(recipient.id, base64);
      setSignedReceiptPdfUrl(base64);
      if (base64) setViewMode('scan');
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan ke Cloud. ' + (error.message.includes('quota') ? 'Quota storage penuh.' : 'File mungkin terlalu besar (>1MB).'));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        alert('Mohon upload file dalam format PDF atau Gambar (JPG/PNG).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;

        // If it's an image, attempt compression
        if (isImage) {
          base64 = await compressImage(base64);
        }

        // Validate size for Firestore (1MB limit)
        if (!isBase64SizeValid(base64)) {
          alert('File terlalu besar. Silakan gunakan file yang lebih kecil atau resolusi lebih rendah (Maksimal ~700KB setelah kompresi).');
          setIsUploading(false);
          return;
        }

        await handleSavePdfToServer(base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Terjadi kesalahan saat memproses file.');
      setIsUploading(false);
    }
  };

  const renderReceiptContent = (type: 'PEMOHON' | 'ARSIP') => (
    <div className="w-full p-10 font-sans leading-relaxed text-black min-h-[550px] md:min-h-[600px] print:p-6 print:min-h-[500px] relative border-gray-300 last:border-b-0 print:border-gray-400 bg-white">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6 border-b-2 border-black pb-4">
        <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-200 relative group overflow-hidden rounded bg-white print:border-none print:bg-transparent">
          {logo ? (
            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center p-2">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1 group-hover:text-indigo-400 transition-colors" />
              <p className="text-[8px] text-slate-400 group-hover:text-indigo-400 transition-colors">Logo</p>
            </div>
          )}
          <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/40 opacity-0 hover:opacity-100 transition-all print:hidden">
            <Upload className="w-6 h-6 text-white" />
            <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
          </label>
        </div>
        <div className="flex-1 text-center pr-24">
          <h1 className="text-2xl font-bold uppercase tracking-tight mb-0">BADAN AMIL ZAKAT NASIONAL</h1>
          <p className="text-xl font-bold uppercase tracking-tight mb-1">KABUPATEN SIAK</p>
          <p className="text-xs leading-tight">Gedung Graha Baznas Kabupaten Siak, Jl Sultan Syarif Ali</p>
          <p className="text-xs leading-tight">Kecamatan Siak, Kabupaten Siak, Riau</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold underline mb-1 uppercase tracking-widest">TANDA TERIMA</h2>
        <p className="text-base">Nomor: {recipient.id.substring(0, 8).toUpperCase()}/TT/BAZ-SIAK/{new Date().getFullYear()}</p>
        <span className="inline-block mt-1 px-3 py-0.5 bg-slate-100 rounded-full text-xs tracking-widest text-black border border-slate-200 uppercase print:border-black print:bg-white text-center">
          {type} COPY
        </span>
      </div>

      <p className="mb-4 text-base">
        Telah di terima berkas permohonan bantuan atas nama :
      </p>

      {/* Data Body */}
      <div className="space-y-1.5 mb-8 text-base">
        {[
          { label: 'Nama Pemohon', value: receiptData.name, key: 'name' },
          { label: 'Perihal', value: receiptData.subject, key: 'subject' },
          { label: 'Jumlah Berkas', value: receiptData.docCount, key: 'docCount' },
          { label: 'Identitas / NIK', value: receiptData.identity, key: 'identity' },
          { label: 'Nomor HP', value: receiptData.phone, key: 'phone' },
          { label: 'Alamat Lengkap', value: receiptData.address, key: 'address', multiline: true }
        ].map((item) => (
          <div key={item.key} className="grid grid-cols-[200px_10px_1fr] items-start">
            <span className="text-black">{item.label}</span>
            <span className="text-black">:</span>
            {isEditing ? (
              item.multiline ? (
                <textarea 
                  className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 px-1 resize-none font-sans"
                  rows={2}
                  value={item.value}
                  onChange={e => setReceiptData({...receiptData, [item.key]: e.target.value})}
                />
              ) : (
                <input 
                  className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 px-1 font-sans"
                  value={item.value}
                  onChange={e => setReceiptData({...receiptData, [item.key]: e.target.value})}
                />
              )
            ) : (
              <span className="text-black font-sans">{item.value}</span>
            )}
          </div>
        ))}
      </div>

      <h4 className="border-b border-black pb-1 mb-2 text-sm tracking-wider">Berkas Lampiran :</h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-10 text-xs min-h-[60px]">
        {receiptData.documents.map((doc, idx) => {
          const isPredefined = DOCUMENT_OPTIONS.slice(0, -1).includes(doc);
          const isLainnya = !isPredefined && doc !== '';

          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-black mt-1">[{idx + 1}]</span>
              {isEditing ? (
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex items-center gap-1">
                    <select 
                      className="border-b border-indigo-200 focus:border-indigo-500 outline-none flex-1 bg-indigo-50/30 font-sans py-0.5"
                      value={isPredefined ? doc : (doc === "" ? "" : "Lainnya")}
                      onChange={e => {
                        const val = e.target.value;
                        const newDocs = [...receiptData.documents];
                        newDocs[idx] = val === "Lainnya" ? "" : val;
                        setReceiptData({...receiptData, documents: newDocs});
                      }}
                    >
                      <option value="">-- Pilih Berkas --</option>
                      {DOCUMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <button 
                      onClick={() => {
                        const newDocs = receiptData.documents.filter((_, i) => i !== idx);
                        setReceiptData({...receiptData, documents: newDocs});
                      }}
                      className="text-red-400 hover:text-red-600 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {(!isPredefined || doc === "Lainnya") && doc !== undefined && (
                    <input 
                      placeholder="Masukkan nama berkas..."
                      className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-white px-1 text-[10px] font-bold text-indigo-600"
                      value={doc === "Lainnya" ? "" : doc}
                      onChange={e => {
                        const newDocs = [...receiptData.documents];
                        newDocs[idx] = e.target.value;
                        setReceiptData({...receiptData, documents: newDocs});
                      }}
                    />
                  )}
                </div>
              ) : (
                <span className="text-black font-sans py-0.5">{doc || '(Belum dipilih)'}</span>
              )}
            </div>
          );
        })}
        {isEditing && receiptData.documents.length < 12 && (
          <button 
            onClick={() => setReceiptData({...receiptData, documents: [...receiptData.documents, '']})}
            className="col-span-2 mt-2 flex items-center justify-center gap-2 py-1.5 border-2 border-dashed border-indigo-100 text-indigo-400 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-[10px] font-bold uppercase transition-all"
          >
            + Tambah Berkas Lampiran
          </button>
        )}
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-start pt-4">
        <div className="text-center w-44">
          {isEditing ? (
            <input 
              className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 text-center mb-16 text-xs uppercase"
              value={receiptData.receiverLabel}
              onChange={e => setReceiptData({...receiptData, receiverLabel: e.target.value})}
            />
          ) : (
            <p className="mb-16 text-sm">{receiptData.receiverLabel},</p>
          )}
          
          {isEditing ? (
            <input 
              className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 text-center text-sm"
              value={receiptData.receiverName}
              onChange={e => setReceiptData({...receiptData, receiverName: e.target.value})}
            />
          ) : (
            <p className="border-b border-black pb-1 uppercase tracking-tighter text-sm">{receiptData.receiverName}</p>
          )}
        </div>
        <div className="text-center w-48">
          <p className="text-sm mb-16 text-black">Siak, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="mb-1">
            {isEditing ? (
              <input 
                className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 text-center"
                value={receiptData.giverName}
                onChange={e => setReceiptData({...receiptData, giverName: e.target.value})}
              />
            ) : (
              <p className="border-b border-black pb-1 uppercase tracking-tighter text-sm">{receiptData.giverName}</p>
            )}
          </div>
          {isEditing ? (
            <input 
              className="border-b border-indigo-200 focus:border-indigo-500 outline-none w-full bg-indigo-50/30 text-center text-xs"
              value={receiptData.giverLabel}
              onChange={e => setReceiptData({...receiptData, giverLabel: e.target.value})}
            />
          ) : (
            <p className="text-xs text-black">{receiptData.giverLabel}</p>
          )}
        </div>
      </div>
      
      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-12 text-center">
        <h1 className="text-5xl leading-none">BADAN AMIL ZAKAT NASIONAL</h1>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col print:p-0 print:bg-white print:block overflow-hidden">
      {/* Scanner Mode View */}
      {showQRModal && (
        <QRCodeModal
          url={`${window.location.origin}/?scanner=true&recipientId=${recipient.id}&docType=receipt`}
          onClose={() => setShowQRModal(false)}
          title="Scan Tanda Terima"
          subtitle="Scan QR Code ini menggunakan HP Anda untuk memfoto Tanda Terima"
        />
      )}

      {/* Toolbar */}
      <div className="bg-[#111827] border-b border-white/10 p-3 flex items-center justify-between print:hidden shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Tutup (Esc)"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 h-10">
            <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <FileCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-bold text-white text-sm leading-tight">Sistem Tanda Terima</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-300/60 uppercase font-bold tracking-wider">F-AZN / {recipient.registrationId.substring(0,6)}</span>
                {saveStatus === 'saving' && <span className="text-white/40 animate-pulse text-[8px] uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">● Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400 text-[8px] uppercase tracking-tighter bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/10">● Tersimpan</span>}
                {saveStatus === 'error' && <span className="text-red-400 text-[8px] uppercase tracking-tighter bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/10">● Gagal</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shrink-0 mx-4">
          <button 
            onClick={() => setViewMode('template')}
            className={cn(
              "px-6 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
              viewMode === 'template' ? "bg-white/10 text-white shadow-xl" : "text-white/30 hover:text-white"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Template
          </button>
          <button 
            onClick={() => setViewMode('scan')}
            className={cn(
              "px-6 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all relative",
              viewMode === 'scan' ? "bg-white/10 text-white shadow-xl" : "text-white/30 hover:text-white"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Scan Tertanda
            {signedReceiptPdfUrl && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111827]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              isEditing 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
            )}
          >
            {isEditing ? <FileCheck className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? "Kembali" : "Edit Konten"}
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>

          <div className="hidden lg:flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 ml-2">
            <span className="text-[10px] font-bold text-white/40 uppercase">Zoom</span>
            <input 
              type="range" 
              min="0.3" 
              max="1.5" 
              step="0.05" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px] print:block bg-slate-950">
        {/* Document Area */}
        <div className="flex-1 p-4 md:p-10 overflow-y-auto bg-slate-950/20 flex flex-col items-center print:p-0 print:bg-white print:block scroll-smooth">
          {viewMode === 'template' ? (
            <div className="flex flex-col items-center w-full">
              <div 
                className="bg-white w-full max-w-[800px] shadow-2xl rounded-sm print:shadow-none print:rounded-none origin-top transition-transform duration-200"
                style={{ transform: `scale(${scale})` }}
              >
                {renderReceiptContent('PEMOHON')}
                <div className="bg-slate-50 py-2 border-y border-dashed border-slate-200 print:hidden flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-10 h-px bg-slate-200" />
                    Garis Potong
                    <div className="w-10 h-px bg-slate-200" />
                  </span>
                </div>
                {renderReceiptContent('ARSIP')}
              </div>
              {/* Spacer to ensure scrolling works with scale */}
              <div style={{ height: `${Math.max(100, scale * 1200)}px` }} className="print:hidden h-40" />
            </div>
          ) : (
            <div className="w-full h-full max-w-4xl flex flex-col gap-4">
              {!signedReceiptPdfUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    {isLoadingFile ? (
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <Upload className="w-10 h-10 text-white/20" />
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">
                    {isLoadingFile ? 'Memuat Dokumen dari Cloud...' : 'Belum Ada Scan Tanda Terima'}
                  </h4>
                  <p className="text-white/40 max-w-md mb-8">
                    {isLoadingFile ? 'Mohon tunggu sebentar, file berukuran besar sedang diproses.' : 'Silakan upload scan Dokumen Tanda Terima yang sudah ditandatangani oleh pemohon dan staff.'}
                  </p>
                  {!isLoadingFile && (
                    <div className="flex flex-wrap justify-center gap-3">
                      <label className={cn(
                        "px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-xl flex items-center gap-2 cursor-pointer",
                        isUploading ? "bg-slate-700 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      )}>
                        {isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Upload className="w-4 h-4" />}
                        Upload File
                        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handlePdfUpload} disabled={isUploading} />
                      </label>
                      <button 
                        onClick={() => setShowQRModal(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                      >
                        <Smartphone className="w-5 h-5" />
                        Scan via HP
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col bg-white/5 rounded-3xl overflow-hidden border border-white/10 p-2 relative shadow-2xl">
                   <object 
                    data={signedPdfBlobUrl || signedReceiptPdfUrl} 
                    type="application/pdf"
                    className="w-full h-full rounded-2xl bg-white"
                  >
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <p className="text-white font-bold mb-2 text-lg">Pratinjau Gagal Dimuat</p>
                      <p className="text-white/40 text-sm mb-8">Browser Anda mungkin memblokir pratinjau otomatis untuk file dari storage lokal.</p>
                      <a 
                        href={signedReceiptPdfUrl} 
                        download={`Tanda_Terima_Scan_${recipient.registrationId}.pdf`}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/20"
                      >
                        Download Untuk Dilihat
                      </a>
                    </div>
                  </object>
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'template' && !isEditing && (
            <p className="text-white/20 text-xs italic print:hidden py-4 border-t border-white/5 w-full max-w-[800px] flex items-center justify-center gap-2">
              <FileCheck className="w-3.5 h-3.5" />
              Dokumen ini dihasilkan secara otomatis oleh sistem administrasi Si-PANDAI
            </p>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-[320px] bg-slate-900 border-l border-white/10 p-6 hidden lg:flex flex-col gap-6 print:hidden">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Dokumen Cloud</h4>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  signedReceiptPdfUrl ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"
                )}>
                   <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold leading-none mb-1">Scan Tertanda</p>
                  <p className="text-[10px] text-white/40">{isLoadingFile ? 'Memuat...' : (signedReceiptPdfUrl ? 'Tersedia di Cloud' : 'Belum diunggah')}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className={cn(
                  "flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2.5 rounded-lg cursor-pointer transition-all",
                  isUploading ? "bg-slate-700 text-white/40 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}>
                  {isUploading ? <div className="w-3 h-3 border-2 border-white/50 border-t-transparent animate-spin rounded-full" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload Scan
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handlePdfUpload} disabled={isUploading} />
                </label>

                <button 
                  onClick={() => setShowQRModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2.5 rounded-lg cursor-pointer transition-all bg-white/5 hover:bg-white/10 text-white"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Scan dari HP
                </button>
                
                {signedReceiptPdfUrl && (
                  <button 
                    disabled={isUploading}
                    onClick={() => {
                      if(confirm('Hapus file scan dari Cloud?')) handleSavePdfToServer(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                ) }
              </div>
            </div>
          </div>

          <div className="mt-auto">
             <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 mb-4">
              <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Printer className="w-3 h-3" />
                Instruksi Cetak
              </h5>
              <p className="text-[10px] text-indigo-300/60 leading-relaxed italic">
                Pilih format A4 pada pengaturan printer. Gunakan margin "None" atau "Minimum" untuk hasil cetak yang maksimal.
              </p>
            </div>
            
            <button 
              onClick={onClose}
              className="w-full py-4 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
