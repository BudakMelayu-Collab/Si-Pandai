import React, { useState } from 'react';
import { Recipient } from '../types';
import { 
  Printer, X, FileText, CheckSquare, Square, 
  Image as ImageIcon, Upload, Edit3, Plus, Trash2,
  FileCheck, ExternalLink, Download, Loader2, ChevronRight
} from 'lucide-react';
import { cn, compressImage, isBase64SizeValid } from '../lib/utils';
import * as storage from '../lib/storage';

interface MPZISTemplateProps {
  recipient: Recipient;
  onClose: () => void;
}

export default function MPZISTemplate({ recipient, onClose }: MPZISTemplateProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'scan'>('template');
  const [mpzisFiles, setMpzisFiles] = useState<{ name: string; data: string }[]>([]);
  const [ isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedRecipientId, setLoadedRecipientId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Load saved data from storage on mount
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      setLogo(await storage.getItem('baznas_logo'));
      
      // Load memorandum data
      let savedMemo = await storage.getItem(`mpzis_memo_${recipient.id}`);
      if (!savedMemo) {
        try {
          const { getRecipientTemplateData } = await import('../firebase');
          savedMemo = await getRecipientTemplateData(recipient.id, 'mpzis');
        } catch (e) {
          console.error("Cloud memo load failed", e);
        }
      }

      if (savedMemo) {
        setMemoData(typeof savedMemo === 'string' ? JSON.parse(savedMemo) : savedMemo);
      }
      setLoadedRecipientId(recipient.id);
      setIsLoaded(true);

      const savedData = await storage.getItem(`survey_${recipient.nik || recipient.id}`);
      let currentFiles: { name: string; data: string }[] = [];
      
      if (savedData) {
        try {
          const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
          currentFiles = parsed.mpzisFiles || [];
          setMpzisFiles(currentFiles);
        } catch (e) {
          console.error('Failed to load MPZIS survey data', e);
        }
      }

      // If no local files but firestore says we have one, fetch it
      if (currentFiles.length === 0 && recipient.hasSignedMPZISPdf) {
        setIsLoadingFile(true);
        try {
          const { getRecipientFile } = await import('../firebase');
          const base64 = await getRecipientFile(recipient.id, 'mpzis');
          if (base64) {
            setMpzisFiles([{ name: 'Scan_MPZIS_Cloud.pdf', data: base64 }]);
          } else {
            // Stale flag detected (flag is true but file is missing), clear it
            const { updateRecipientMPZISPdf } = await import('../firebase');
            await updateRecipientMPZISPdf(recipient.id, null);
          }
        } catch (error) {
          console.error('Failed to fetch MPZIS scan from cloud', error);
        } finally {
          setIsLoadingFile(false);
        }
      }
    };
    loadData();
  }, [recipient.id, recipient.nik, recipient.hasSignedMPZISPdf]);

  const handleSaveArchives = async (updatedFiles: { name: string; data: string }[]) => {
    // Current behavior: saves array of files to storage
    const savedData = await storage.getItem(`survey_${recipient.nik || recipient.id}`);
    let dataToSave: any = {};
    if (savedData) {
      dataToSave = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
    }
    dataToSave.mpzisFiles = updatedFiles;
    await storage.setItem(`survey_${recipient.nik || recipient.id}`, dataToSave);

    // New behavior: Upate Firestore with the first file if it's the primary scan
    if (updatedFiles.length > 0) {
      try {
        const { updateRecipientMPZISPdf } = await import('../firebase');
        await updateRecipientMPZISPdf(recipient.id, updatedFiles[0].data);
      } catch (error) {
        console.error('Failed to update MPZIS PDF in Firestore', error);
      }
    } else {
      try {
        const { updateRecipientMPZISPdf } = await import('../firebase');
        await updateRecipientMPZISPdf(recipient.id, null);
      } catch (error) {
        console.error('Failed to clear MPZIS PDF in Firestore', error);
      }
    }
  };
  
  const handleMpzisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsSaving(true);
      const newFiles: { name: string; data: string }[] = [];
      const fileList = Array.from(files) as File[];
      let processedCount = 0;

      for (const file of fileList) {
        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        
        if (isPdf || isImage) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            let base64 = reader.result as string;

            if (isImage) {
              base64 = await compressImage(base64);
            }

            if (!isBase64SizeValid(base64)) {
              alert(`File "${file.name}" terlalu besar. Silakan gunakan resolusi lebih rendah atau file yang lebih kecil (Maksimal ~700KB per file).`);
              processedCount++;
              if (processedCount === fileList.length) setIsSaving(false);
              return;
            }

            newFiles.push({
              name: file.name,
              data: base64
            });
            processedCount++;
            
            if (processedCount === fileList.length) {
              const updated = [...mpzisFiles, ...newFiles];
              setMpzisFiles(updated);
              await handleSaveArchives(updated);
              setIsSaving(false);
              if (newFiles.length > 0) {
                alert('Berhasil mengunggah scan MPZIS');
                setActiveTab('scan'); // Switch to scan tab to show results
              }
            }
          };
          reader.readAsDataURL(file);
        } else {
          processedCount++;
          alert(`Format file ${file.name} tidak didukung. Harap unggah PDF atau Foto (JPEG/PNG).`);
          if (processedCount === fileList.length) {
            if (newFiles.length > 0) {
              const updated = [...mpzisFiles, ...newFiles];
              setMpzisFiles(updated);
              await handleSaveArchives(updated);
            }
            setIsSaving(false);
          }
        }
      }
    }
  };

  const removeMpzisFile = (index: number) => {
    const updated = mpzisFiles.filter((_, i) => i !== index);
    setMpzisFiles(updated);
    handleSaveArchives(updated);
  };

  const openInNewTab = (data: string) => {
    try {
      const parts = data.split(';base64,');
      if (parts.length > 1) {
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(data, '_blank');
      }
    } catch (e) {
      console.error('Failed to open file', e);
      window.open(data, '_blank');
    }
  };

  const downloadFile = (data: string, name: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Local state for memorandum data
  const [memoData, setMemoData] = useState({
    nomor: `${recipient.registrationId}/MPZIS/SP/I/${new Date().getFullYear()}`,
    classification: `Baznas ${recipient.sector || 'Siak Sehat'}`,
    purpose: `Melaksanakan program ${recipient.programName}`,
    ashnaf: 'Miskin',
    source: 'Zakat / Infaq / Shadaqah',
    budgetPost: recipient.aidType,
    transactionType: 'TRANSFER' as 'CASH' | 'TRANSFER',
    columns: [
      { key: 'description', label: 'URAIAN' },
      { key: 'name', label: 'NAMA' },
      { key: 'nik', label: 'IDENTITAS/NIK' },
      { key: 'bank', label: 'REKENING/BANK/NAMA REKENING' },
      { key: 'amount', label: 'JUMLAH BANTUAN' }
    ],
    rows: [
      { 
        id: Date.now(), 
        description: recipient.aidType, 
        name: recipient.name, 
        nik: recipient.nik,
        bank: `${recipient.bankAccountNo || '-'} / ${recipient.bankName || '-'} / ${recipient.bankAccountHolder || '-'}`,
        amount: Number(recipient.amountProposed) 
      }
    ],
    signersTop: [
      { label: 'Disiapkan', name: 'Rina Wasih', role: 'PIC Program' },
      { label: 'Diperiksa', name: 'Andreas Supriadi, S.I.Kom', role: 'KABID. Pendistribusian dan Pendayagunaan' },
      { label: 'Disetujui', name: 'Sutarno Nurdianto, SE', role: 'Kepala Pelaksana' }
    ],
    signersBottom: [
      { name: "H. Samparis Bin Tatan, S.Pd.I", role: "Ketua" },
      { name: "Syukron Wahib, M.Pd.I", role: "Wakil Ketua 1" },
      { name: "H. Sukijo", role: "Wakil Ketua 2" },
      { name: "KH. Moch Sowwam Amin, SH", role: "Wakil Ketua 3" },
      { name: "H. Rojikin, S.Ag, MH", role: "Wakil Ketua 4" }
    ]
  });
  
  // Auto-save memo data
  React.useEffect(() => {
    if (!isLoaded || loadedRecipientId !== recipient.id) return;
    const saveMemo = async () => {
      setSaveStatus('saving');
      try {
        await storage.setItem(`mpzis_memo_${recipient.id}`, memoData);
        const { saveRecipientTemplateData } = await import('../firebase');
        await saveRecipientTemplateData(recipient.id, 'mpzis', memoData);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Cloud memo save failed", e);
        setSaveStatus('error');
      }
    };
    const timer = setTimeout(saveMemo, 1000);
    return () => clearTimeout(timer);
  }, [memoData, recipient.id, isLoaded, loadedRecipientId]);

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

  const addColumn = () => {
    const newKey = `col_${Date.now()}`;
    setMemoData({
      ...memoData,
      columns: [...memoData.columns, { key: newKey, label: 'KOLOM BARU' }],
      rows: memoData.rows.map(row => ({ ...row, [newKey]: '' }))
    });
  };

  const removeColumn = (key: string) => {
    if (memoData.columns.length > 1) {
      setMemoData({
        ...memoData,
        columns: memoData.columns.filter(col => col.key !== key)
      });
    }
  };

  const addRow = () => {
    setMemoData({
      ...memoData,
      rows: [...memoData.rows, { id: Date.now() + Math.random(), description: '', name: '', nik: '', bank: '', amount: 0 }]
    });
  };

  const removeRow = (id: number) => {
    if (memoData.rows.length > 1) {
      setMemoData({
        ...memoData,
        rows: memoData.rows.filter(row => row.id !== id)
      });
    }
  };

  const updateRow = (id: number, field: string, value: any) => {
    setMemoData({
      ...memoData,
      rows: memoData.rows.map(row => row.id === id ? { ...row, [field]: value } : row)
    });
  };

  const totalAmount = memoData.rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  // Helper to convert number to Indonesian words
  const terbilang = (n: number): string => {
    if (n === 0) return 'NOL RUPIAH';
    
    const helper = (num: number): string => {
      const units = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN', 'SEPULUH', 'SEBELAS'];
      if (num === 0) return '';
      if (num < 12) return units[num];
      if (num < 20) return units[num - 10] + ' BELAS';
      if (num < 100) return units[Math.floor(num / 10)] + ' PULUH ' + helper(num % 10);
      if (num < 200) return 'SERATUS ' + helper(num - 100);
      if (num < 1000) return units[Math.floor(num / 100)] + ' RATUS ' + helper(num % 100);
      if (num < 2000) return 'SERIBU ' + helper(num - 1000);
      if (num < 1000000) return helper(Math.floor(num / 1000)) + ' RIBU ' + helper(num % 1000);
      if (num < 1000000000) return helper(Math.floor(num / 1000000)) + ' JUTA ' + helper(num % 1000000);
      return '';
    };
    
    return helper(n).replace(/\s+/g, ' ').trim() + ' RUPIAH';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col print:p-0 print:bg-white print:block overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[#0f2a24] border-b border-white/10 p-3 flex items-center justify-between print:hidden shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Tutup (Esc)"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 h-10">
            <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-bold text-white text-sm leading-tight">MPZIS Administrator</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-300/60 uppercase font-bold tracking-wider italic">Sistem Administrasi BAZNAS</span>
                {saveStatus === 'saving' && <span className="text-white/40 animate-pulse text-[8px] uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">● Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400 text-[8px] uppercase tracking-tighter bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/10">● Tersimpan</span>}
                {saveStatus === 'error' && <span className="text-red-400 text-[8px] uppercase tracking-tighter bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/10">● Gagal</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2 max-w-xl px-4 overflow-x-auto scrollbar-hide">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shrink-0 mr-2">
            <button
              onClick={() => setActiveTab('template')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'template' 
                  ? "bg-emerald-600 text-white shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={() => setActiveTab('scan')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative",
                activeTab === 'scan' 
                  ? "bg-purple-600 text-white shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Hasil Scan
              {mpzisFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border border-black group-hover:scale-110 transition-transform">
                  {mpzisFiles.length}
                </span>
              )}
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 shrink-0" />

          {activeTab === 'template' && (
            <>
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
                {isEditing ? "Selesai Edit" : "Edit Konten"}
              </button>

              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-emerald-500/20"
              >
                <Printer className="w-4 h-4" />
                Cetak Memo
              </button>
            </>
          )}

          {activeTab === 'scan' && (
            <label className={cn(
              "px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 active:scale-95 cursor-pointer shrink-0",
              (isSaving || isLoadingFile) && "opacity-50 animate-pulse pointer-events-none"
            )}>
              <Upload className="w-4 h-4" />
              {isSaving || isLoadingFile ? "Memproses..." : "Upload Scan Baru"}
              <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={handleMpzisUpload} />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={async () => {
              setSaveStatus('saving');
              try {
                const { saveRecipientTemplateData } = await import('../firebase');
                await saveRecipientTemplateData(recipient.id, 'mpzis', memoData);
                await storage.setItem(`mpzis_memo_${recipient.id}`, memoData);
                setSaveStatus('saved');
              } catch (e) {
                console.error("Manual save failed", e);
                setSaveStatus('error');
              }
            }}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Simpan ke Server
          </button>
        </div>
      </div>

      {/* Document View */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-900/50 flex flex-col items-center print:p-0 print:bg-white">
        {activeTab === 'template' ? (
          <div className={cn(
            "bg-white w-full max-w-[900px] shadow-2xl p-12 text-black font-sans relative transition-all print:shadow-none print:p-8",
            isEditing && "ring-4 ring-amber-500/30"
          )}>
          
          {/* Badge top right */}
          <div className="flex justify-end mb-4">
            <div className="border-2 border-black px-4 py-1 font-bold text-sm">
              SIAK {recipient.sector?.toUpperCase() || 'SEHAT'}
            </div>
          </div>

          {/* Title Section */}
          <div className="flex items-start gap-8 mb-8 border-b-2 border-black pb-6">
            <div className="w-28 flex-shrink-0 relative group">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-auto object-contain" />
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center rounded">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                  <p className="text-[8px] text-slate-400">Upload Logo</p>
                </div>
              )}
              <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black/20 flex items-center justify-center transition-all print:hidden">
                <Upload className="w-5 h-5 text-white" />
                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
              </label>
            </div>
            
            <div className="flex-1 text-center pr-24">
              <h1 className="text-xl font-bold mb-1">MEMORANDUM</h1>
              <h2 className="text-sm font-bold uppercase mb-1">PENYALURAN DANA ZAKAT INFAQ DAN SHADAQAH</h2>
              <h2 className="text-sm font-bold uppercase mb-2">TAHUN {new Date().getFullYear()}</h2>
              {isEditing ? (
                <input 
                  className="text-center w-full bg-amber-50 border-b border-amber-200 outline-none p-1 text-sm"
                  value={memoData.nomor}
                  onChange={e => setMemoData({...memoData, nomor: e.target.value})}
                />
              ) : (
                <p className="text-sm">NOMOR : {memoData.nomor}</p>
              )}
            </div>

            <div className="text-right text-[10px] leading-tight pt-2">
              <p>Prog <span className="font-bold">Program</span></p>
              <p><span className="font-bold">{recipient.sector || 'Sehat'} {new Date().getFullYear()}</span></p>
            </div>
          </div>

          {/* Date */}
          <div className="text-right text-xs mb-6">
            {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} → {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <p className="text-xs mb-6 leading-relaxed">
            Kami yang bertanda tangan dibawah ini Komite Pendistribusian dan Pendayagunaan menyetujui dan memutuskan penyaluran sebagai berikut :
          </p>

          {/* List Details */}
          <div className="space-y-2 text-xs mb-8">
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">1. Klasifikasi Program</span>
              <span>:</span>
              {isEditing ? (
                <input className="bg-amber-50 border-b border-amber-200 outline-none w-full px-1" value={memoData.classification} onChange={e => setMemoData({...memoData, classification: e.target.value})} />
              ) : (
                <span>{memoData.classification}</span>
              )}
            </div>
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">2. Tujuan Penyaluran</span>
              <span>:</span>
              {isEditing ? (
                <input className="bg-amber-50 border-b border-amber-200 outline-none w-full px-1" value={memoData.purpose} onChange={e => setMemoData({...memoData, purpose: e.target.value})} />
              ) : (
                <span>{memoData.purpose}</span>
              )}
            </div>
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">3. Ashnaf</span>
              <span>:</span>
              {isEditing ? (
                <input className="bg-amber-50 border-b border-amber-200 outline-none w-full px-1" value={memoData.ashnaf} onChange={e => setMemoData({...memoData, ashnaf: e.target.value})} />
              ) : (
                <span>{memoData.ashnaf}</span>
              )}
            </div>
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">4. Sumber Dana</span>
              <span>:</span>
              {isEditing ? (
                <input className="bg-amber-50 border-b border-amber-200 outline-none w-full px-1" value={memoData.source} onChange={e => setMemoData({...memoData, source: e.target.value})} />
              ) : (
                <span>{memoData.source}</span>
              )}
            </div>
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">5. Post Anggaran RKAT</span>
              <span>:</span>
              {isEditing ? (
                <input className="bg-amber-50 border-b border-amber-200 outline-none w-full px-1" value={memoData.budgetPost} onChange={e => setMemoData({...memoData, budgetPost: e.target.value})} />
              ) : (
                <span>{memoData.budgetPost}</span>
              )}
            </div>
            <div className="grid grid-cols-[180px_10px_1fr] items-center">
              <span className="font-bold">6. Jenis Transaksi</span>
              <span>:</span>
              <div className="flex items-center gap-4">
                <div 
                  className={cn("flex items-center gap-1 cursor-pointer", isEditing && "hover:text-emerald-600")}
                  onClick={() => isEditing && setMemoData({...memoData, transactionType: 'CASH'})}
                >
                  {memoData.transactionType === 'CASH' ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>Cash</span>
                </div>
                <div 
                  className={cn("flex items-center gap-1 cursor-pointer", isEditing && "hover:text-emerald-600")}
                  onClick={() => isEditing && setMemoData({...memoData, transactionType: 'TRANSFER'})}
                >
                  {memoData.transactionType === 'TRANSFER' ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>Transfer</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide">7. Penerima Dana :</p>
            {isEditing && (
              <div className="flex gap-2">
                <button 
                  onClick={addColumn}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Kolom
                </button>
                <button 
                  onClick={addRow}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Baris
                </button>
              </div>
            )}
          </div>
          
          <table className="w-full border-collapse border-2 border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-2 w-10">NO</th>
                {memoData.columns.map((col) => (
                  <th key={col.key} className="border-2 border-black p-2 relative group">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input 
                          className="w-full text-center bg-amber-50 outline-none border-b border-amber-200"
                          value={col.label}
                          onChange={e => {
                            const newCols = memoData.columns.map(c => c.key === col.key ? {...c, label: e.target.value} : c);
                            setMemoData({...memoData, columns: newCols});
                          }}
                        />
                        <button 
                          onClick={() => removeColumn(col.key)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                {isEditing && <th className="border-2 border-black p-2 w-10 print:hidden text-slate-400 select-none">#</th>}
              </tr>
            </thead>
            <tbody>
              {memoData.rows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                  {memoData.columns.map((col) => (
                    <td key={col.key} className={cn("border-2 border-black p-2", col.key === 'amount' ? "text-right font-bold text-sm" : "")}>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          {col.key === 'amount' && <span>Rp.</span>}
                          <input 
                            className={cn(
                              "w-full outline-none bg-transparent",
                              col.key === 'amount' ? "text-right font-bold" : "",
                              col.key === 'name' ? "font-bold" : ""
                            )}
                            type={col.key === 'amount' ? 'number' : 'text'}
                            value={(row as any)[col.key]} 
                            onChange={e => updateRow(row.id, col.key, e.target.value)} 
                          />
                        </div>
                      ) : (
                        col.key === 'amount' 
                          ? `Rp. ${Number((row as any)[col.key]).toLocaleString('id-ID')},-`
                          : (row as any)[col.key]
                      )}
                    </td>
                  ))}
                  {isEditing && (
                    <td className="border-2 border-black p-1 text-center print:hidden">
                      <button 
                        onClick={() => removeRow(row.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-black">
                <td colSpan={memoData.columns.length} className="border-2 border-black p-2 text-right uppercase">Total Bantuan</td>
                <td className="border-2 border-black p-2 text-right text-sm">
                  Rp. {totalAmount.toLocaleString('id-ID')},-
                </td>
                {isEditing && <td className="border-2 border-black p-2 print:hidden bg-slate-100"></td>}
              </tr>
            </tbody>
          </table>

          <div className="border-2 border-black p-3 text-[10px] font-bold mb-6 bg-slate-50 uppercase">
            TERBILANG : {terbilang(totalAmount)}
          </div>

          <p className="text-xs italic mb-10 text-center leading-relaxed">
            Demikian Memorandum Penyaluran ZIS ini dibuat dengan sebenarnya dan dapat dipergunakan dengan semestinya.
          </p>

          {/* Approval Section */}
          <div className="grid grid-cols-3 border-2 border-black mb-8 text-xs font-sans">
            {memoData.signersTop.map((signer, idx) => (
              <div key={idx} className={cn("p-2 flex flex-col items-center", idx < 2 && "border-r-2 border-black")}>
                {isEditing ? (
                  <input 
                    className="font-bold mb-16 border-b-2 border-black pb-1 w-full text-center bg-amber-50 outline-none"
                    value={signer.label}
                    onChange={e => {
                      const newSigners = [...memoData.signersTop];
                      newSigners[idx].label = e.target.value;
                      setMemoData({...memoData, signersTop: newSigners});
                    }}
                  />
                ) : (
                  <p className="font-bold mb-16 border-b-2 border-black pb-1 w-full text-center">{signer.label}</p>
                )}
                
                <div className="text-center w-full">
                  {isEditing ? (
                    <>
                      <input 
                        className="font-bold underline leading-none mb-1 w-full text-center bg-amber-50 outline-none"
                        value={signer.name}
                        onChange={e => {
                          const newSigners = [...memoData.signersTop];
                          newSigners[idx].name = e.target.value;
                          setMemoData({...memoData, signersTop: newSigners});
                        }}
                      />
                      <input 
                        className="text-[10px] w-full text-center bg-amber-50 outline-none"
                        value={signer.role}
                        onChange={e => {
                          const newSigners = [...memoData.signersTop];
                          newSigners[idx].role = e.target.value;
                          setMemoData({...memoData, signersTop: newSigners});
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <p className="font-bold underline leading-none mb-1">{signer.name}</p>
                      <p className="text-[10px]">{signer.role}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Decision Section */}
          <div className="grid grid-cols-[200px_1fr] border-2 border-black text-xs font-sans">
            <div className="border-r-2 border-black p-4 bg-slate-50">
              <p className="font-bold mb-2">Catatan :</p>
              <div className="h-24"></div>
            </div>
            <div>
              <p className="text-center font-bold border-b-2 border-black py-1 bg-slate-100 italic">Diputuskan</p>
              <div className="grid grid-cols-5 h-32">
                {memoData.signersBottom.map((signer, idx) => (
                  <div key={idx} className="border-r-2 last:border-r-0 border-black p-1 flex flex-col justify-end text-center">
                    {isEditing ? (
                      <>
                        <input 
                          className="font-bold text-[8px] underline leading-tight mb-1 w-full text-center bg-amber-50 outline-none"
                          value={signer.name}
                          onChange={e => {
                            const newSigners = [...memoData.signersBottom];
                            newSigners[idx].name = e.target.value;
                            setMemoData({...memoData, signersBottom: newSigners});
                          }}
                        />
                        <input 
                          className="text-[7px] leading-none mb-2 w-full text-center bg-amber-50 outline-none"
                          value={signer.role}
                          onChange={e => {
                            const newSigners = [...memoData.signersBottom];
                            newSigners[idx].role = e.target.value;
                            setMemoData({...memoData, signersBottom: newSigners});
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-[8px] underline leading-tight mb-1">{signer.name}</p>
                        <p className="text-[7px] leading-none mb-2">{signer.role}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none -rotate-12 select-none text-center">
            <h1 className="text-8xl font-black whitespace-nowrap">BAZNAS SIAK</h1>
          </div>
          </div>
        ) : (
          /* Scan Results Tab */
          <div className="w-full max-w-4xl space-y-6 pb-20">
            {mpzisFiles.length === 0 ? (
              <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mb-6">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Belum ada Scan MPZIS</h3>
                <p className="text-white/40 text-sm max-w-xs">
                  Silakan unggah berkas MPZIS yang sudah ditandatangani untuk arsip digital.
                </p>
                <label className="mt-8 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold cursor-pointer hover:bg-purple-500 transition-all flex items-center gap-2 shadow-xl shadow-purple-500/20">
                  <Plus className="w-5 h-5" />
                  Unggah Sekarang
                  <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={handleMpzisUpload} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mpzisFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col group hover:border-purple-400 transition-all"
                  >
                    <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {file.data.startsWith('data:application/pdf') ? (
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FileText className="w-12 h-12" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">PDF Document</span>
                        </div>
                      ) : (
                        <img 
                          src={file.data} 
                          alt={file.name} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => openInNewTab(file.data)}
                          className="p-3 bg-white text-black rounded-full hover:bg-purple-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0"
                          title="Buka di tab baru"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => downloadFile(file.data, file.name)}
                          className="p-3 bg-white text-black rounded-full hover:bg-emerald-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 delay-75"
                          title="Unduh"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 flex items-center justify-between border-t border-slate-100">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold text-slate-900 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Hlm {idx + 1} • Scan MPZIS</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => removeMpzisFile(idx)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add More Card */}
                <label className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-400/50 hover:bg-white/5 transition-all group">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/20 mb-4 group-hover:scale-110 group-hover:text-purple-400 transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-white/40 group-hover:text-white transition-colors">Tambah Scan Lagi</span>
                  <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={handleMpzisUpload} />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
