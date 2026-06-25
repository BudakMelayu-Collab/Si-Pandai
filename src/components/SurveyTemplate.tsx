import React, { useState, useMemo, useEffect } from 'react';
import QRCodeModal from './QRCodeModal';
import { Recipient } from '../types';
import { Printer, X, ClipboardList, Scissors, Save, Calculator, Landmark, Wallet, Plus, Trash2, Users, FileText, CheckCircle2, ExternalLink, Download, Upload, ChevronRight, Image as ImageIcon, Loader2, Smartphone } from 'lucide-react';
import { cn, compressImage, isBase64SizeValid } from '../lib/utils';
import * as storage from '../lib/storage';

interface SurveyTemplateProps {
  recipient: Recipient;
  onClose: () => void;
}

export default function SurveyTemplate({ recipient, onClose }: SurveyTemplateProps) {
  const [logo, setLogo] = useState<string | null>(null);

  const [scale, setScale] = useState(0.8);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [familyCount, setFamilyCount] = useState(1);
  const [surveyDate, setSurveyDate] = useState('');
  const [skmpKe, setSkmpKe] = useState('1');
  const [photos, setPhotos] = useState<string[]>([]);
  const [archivedFiles, setArchivedFiles] = useState<{ name: string; data: string }[]>([]);
  const [signedSurveyPdfUrl, setSignedSurveyPdfUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedRecipientId, setLoadedRecipientId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showQRModal, setShowQRModal] = useState(false);

  // Toolbar switcher state
  const [activeTab, setActiveTab] = useState<'survey' | 'scan'>('survey');

  // Fetch scan from subcollection
  React.useEffect(() => {
    const fetchScan = async () => {
      if (recipient.hasSignedSurveyPdf && !signedSurveyPdfUrl) {
        setIsLoadingFile(true);
        try {
          const { getRecipientFile } = await import('../firebase');
          const base64 = await getRecipientFile(recipient.id, 'survey');
          if (base64) {
            setSignedSurveyPdfUrl(base64);
          } else {
            // Clear stale flag
            const { updateRecipientSurveyPdf } = await import('../firebase');
            await updateRecipientSurveyPdf(recipient.id, null);
          }
        } catch (error) {
          console.error("Failed to fetch scan", error);
        } finally {
          setIsLoadingFile(false);
        }
      }
    };
    fetchScan();
  }, [recipient.id, recipient.hasSignedSurveyPdf]);

  // Financial State
  const [income, setIncome] = useState({
    husband: '',
    wife: '',
    others: '',
    parents: '',
    children: '',
    additional: '',
    additionalNominal: ''
  });

  const [expenses, setExpenses] = useState({
    kitchen: '',
    education: '',
    health: '',
    electricity: '',
    water: '',
    security: '',
    transport: '',
    rent: '',
    others: ''
  });

  const [explanation, setExplanation] = useState('');

  // Load saved data from storage on mount
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      setLogo(await storage.getItem('baznas_logo'));
      
      let savedData = await storage.getItem(`survey_${recipient.nik || recipient.id}`);
      
      if (!savedData) {
        try {
          const { getRecipientTemplateData } = await import('../firebase');
          savedData = await getRecipientTemplateData(recipient.id, 'survey');
          if (savedData) {
             await storage.setItem(`survey_${recipient.nik || recipient.id}`, savedData);
          }
        } catch (e) {
          console.error("Cloud survey load failed", e);
        }
      }

      if (savedData) {
        try {
          const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
          setIncome(parsed.income || income);
          setExpenses(parsed.expenses || expenses);
          setExplanation(parsed.explanation || '');
          setFamilyCount(parsed.familyCount || 1);
          setSurveyDate(parsed.surveyDate || '');
          setSkmpKe(parsed.skmpKe || '1');
          setPhotos(parsed.photos || []);
          setArchivedFiles(parsed.archivedFiles || []);
        } catch (e) {
          console.error('Failed to load survey data', e);
        }
      }
      setLoadedRecipientId(recipient.id);
      setIsLoaded(true);
    };
    loadData();
  }, [recipient.id, recipient.nik]);

  // Auto-save survey data
  React.useEffect(() => {
    if (!isLoaded || loadedRecipientId !== recipient.id) return;
    
    const saveToCloud = async () => {
      setSaveStatus('saving');
      const dataToSave = {
        income,
        expenses,
        explanation,
        familyCount,
        surveyDate,
        skmpKe,
        photos,
        archivedFiles
      };
      
      try {
        await storage.setItem(`survey_${recipient.nik || recipient.id}`, dataToSave);
        const { saveRecipientTemplateData } = await import('../firebase');
        await saveRecipientTemplateData(recipient.id, 'survey', dataToSave);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Cloud survey save failed", e);
        setSaveStatus('error');
      }
    };

    const timer = setTimeout(saveToCloud, 2000); // Debounce auto-save
    return () => clearTimeout(timer);
  }, [income, expenses, explanation, familyCount, surveyDate, skmpKe, photos, archivedFiles, recipient.nik, recipient.id, isLoaded, loadedRecipientId]);

  // Stream scan from cloud
  useEffect(() => {
    if (!recipient.id) return;
    let isMounted = true;
    
    const startStream = async () => {
      try {
        const { streamRecipientScan } = await import('../firebase');
        return streamRecipientScan(recipient.id, 'survey', (base64) => {
          if (!isMounted) return;
          if (base64) {
             setSignedSurveyPdfUrl(base64);
          } else {
             setSignedSurveyPdfUrl(null);
          }
        });
      } catch (e) {
        console.error("Error setting up survey stream", e);
      }
    };
    
    let unsubscribe: any = null;
    startStream().then(unsub => { if(unsub) unsubscribe = unsub; });
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [recipient.id]);

  const handleSave = async () => {
    setIsSaving(true);
    const dataToSave = {
      income,
      expenses,
      explanation,
      familyCount,
      surveyDate,
      skmpKe,
      photos,
      archivedFiles
    };
    
    try {
      await storage.setItem(`survey_${recipient.nik || recipient.id}`, dataToSave);
      
      setTimeout(() => {
        setIsSaving(false);
        alert('Data survey berhasil disimpan!');
      }, 500);
    } catch (e) {
      console.error('Save failed', e);
      setIsSaving(false);
      alert('Gagal menyimpan data: Ukuran file mungkin terlalu besar atau penyimpanan penuh.');
    }
  };
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string, 800, 0.6); // Aggressive compression for photos
          setPhotos(prev => [...prev, compressed]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleArchiveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files) as File[];
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
              alert(`File "${file.name}" terlalu besar. Maksimal ~700KB setelah kompresi.`);
              return;
            }

            setArchivedFiles(prev => [...prev, {
              name: file.name,
              data: base64
            }]);
          };
          reader.readAsDataURL(file);
        } else {
          alert(`Format file ${file.name} tidak didukung. Harap unggah PDF atau Foto (JPEG/PNG).`);
        }
      }
    }
  };

  const removeArchiveFile = (index: number) => {
    setArchivedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSurveyScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        alert('Mohon upload file dalam format PDF atau Gambar (JPG/PNG).');
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;

        if (isImage) {
          base64 = await compressImage(base64);
        }

        if (!isBase64SizeValid(base64)) {
          alert('File scan terlalu besar. Silakan gunakan resolusi lebih rendah atau file yang lebih kecil (Maksimal ~700KB setelah kompresi).');
          setIsUploading(false);
          return;
        }

        try {
          const { updateRecipientSurveyPdf } = await import('../firebase');
          await updateRecipientSurveyPdf(recipient.id, base64);
          setSignedSurveyPdfUrl(base64);
          await storage.setItem(`survey_signed_pdf_${recipient.id}`, base64);
        } catch (error) {
          console.error(error);
          alert('Gagal mengunggah scan ke Cloud.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Scan upload error:', error);
      setIsUploading(false);
    }
  };

  const removeSurveyScan = async () => {
    if (confirm('Hapus scan Lembar Verifikasi?')) {
      setIsUploading(true);
      try {
        const { updateRecipientSurveyPdf } = await import('../firebase');
        await updateRecipientSurveyPdf(recipient.id, null);
        setSignedSurveyPdfUrl(null);
        await storage.setItem(`survey_signed_pdf_${recipient.id}`, null);
      } catch (error) {
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
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

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalA = useMemo(() => {
    const values = [
      income.husband, income.wife, income.others, 
      income.parents, income.children, income.additionalNominal
    ];
    return values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [income]);

  const totalB = useMemo(() => {
    const values = [
      expenses.kitchen, expenses.education, expenses.health,
      expenses.electricity, expenses.water, expenses.security,
      expenses.transport, expenses.rent, expenses.others
    ];
    return values.reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [expenses]);

  const balance = totalA - totalB;
  const perCapita = familyCount > 0 ? totalA / familyCount : 0;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '0';
    return new Intl.NumberFormat('id-ID').format(val);
  };

  const PageHeader = () => (
    <div className="flex items-stretch border border-black mb-4">
      <div className="w-[150px] p-2 flex items-center justify-center border-r border-black">
        {logo ? (
          <img src={logo} alt="BAZNAS Logo" className="max-h-12 object-contain" />
        ) : (
          <div className="text-center font-bold text-[8px]">
            <p>BAZNAS</p>
            <p className="text-[6px]">Badan Amil Zakat Nasional</p>
            <p className="text-[6px]">KABUPATEN SIAK</p>
          </div>
        )}
      </div>
      <div className="flex-1 p-2 flex flex-col items-center justify-center text-center">
        <h1 className="text-base font-bold uppercase tracking-tight">SURVEY MUSTAHIK (PERORANGAN)</h1>
        <p className="text-[10px] font-medium">F-AZN / PDP /</p>
      </div>
      <div className="w-[100px] p-2 flex items-center justify-center border-l border-black text-[10px] font-bold">
        F-AZN / PDP /
      </div>
    </div>
  );

  const Checkbox = ({ label, checked }: { label: string; checked?: boolean }) => (
    <div className="flex items-center gap-2 mb-0.5">
      <div className={cn(
        "w-3 h-3 border border-black flex items-center justify-center text-[8px]",
        checked && "bg-black text-white"
      )}>
        {checked && "✓"}
      </div>
      <span className="text-[9px] whitespace-nowrap">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col print:p-0 print:bg-white print:block overflow-hidden">
      {/* Scanner Mode View */}
      {showQRModal && (
        <QRCodeModal
          url={`${window.location.origin}/?scanner=true&recipientId=${recipient.id}&docType=survey`}
          onClose={() => setShowQRModal(false)}
          title="Scan Lembar Verifikasi"
          subtitle="Scan QR Code ini menggunakan HP Anda untuk memfoto Lembar Verifikasi"
        />
      )}
      
      {/* Toolbar */}
      <div className="bg-[#0f172a] border-b border-white/10 p-3 flex items-center justify-between print:hidden shrink-0">
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
              <ClipboardList className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-bold text-white text-sm leading-tight">Verification System</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-300/60 uppercase font-bold tracking-wider">Survey & Verifikasi Mustahik</span>
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
              onClick={() => setActiveTab('survey')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'survey' 
                  ? "bg-indigo-600 text-white shadow-lg" 
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
              {signedSurveyPdfUrl && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border border-black">
                  1
                </span>
              )}
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 shrink-0 mx-2" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            <span className="text-[10px] font-bold text-white/40 uppercase">Zoom</span>
            <input 
              type="range" 
              min="0.4" 
              max="1.2" 
              step="0.05" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-[10px] font-mono font-bold text-white/60 min-w-[30px] text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              isSidebarOpen 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
            )}
          >
            <Calculator className="w-4 h-4" />
            {isSidebarOpen ? "Tutup Editor" : "Buka Editor"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-white/10"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Manual
          </button>
        </div>
      </div>


      <div className="flex-1 flex overflow-hidden print:block">
        {/* Sidebar Form */}
        {isSidebarOpen && (
          <div className="w-[450px] border-r border-white/10 bg-white/5 overflow-y-auto p-6 space-y-8 print:hidden scrollbar-hide">
            {/* Income Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Landmark className="w-5 h-5" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Pendapatan (A)</h4>
              </div>
              <div className="grid gap-3">
                {[
                  { key: 'husband', label: 'Usaha Pokok Suami' },
                  { key: 'wife', label: 'Usaha Pokok Istri' },
                  { key: 'others', label: 'Usaha Lainnya' },
                  { key: 'parents', label: 'Dari Orang Tua' },
                  { key: 'children', label: 'Dari Anak/Menantu' },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1">{item.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-[10px]">Rp</span>
                      <input 
                        type="number"
                        value={income[item.key as keyof typeof income]}
                        onChange={(e) => setIncome({ ...income, [item.key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-white text-xs focus:border-emerald-500/50 outline-none"
                      />
                    </div>
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1">Penghasilan Lainnya</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Keterangan..."
                      value={income.additional}
                      onChange={(e) => setIncome({ ...income, additional: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-[10px] outline-none focus:border-emerald-500/50"
                    />
                    <input 
                      type="number"
                      placeholder="Nominal"
                      value={income.additionalNominal}
                      onChange={(e) => setIncome({ ...income, additionalNominal: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-[10px] outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <Wallet className="w-5 h-5" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Pengeluaran (B)</h4>
              </div>
              <div className="grid gap-3">
                {[
                  { key: 'kitchen', label: 'Kebutuhan Dapur' },
                  { key: 'education', label: 'Pendidikan' },
                  { key: 'health', label: 'Kesehatan' },
                  { key: 'electricity', label: 'Listrik' },
                  { key: 'water', label: 'Air Minum' },
                  { key: 'security', label: 'Siskamling' },
                  { key: 'transport', label: 'Transportasi' },
                  { key: 'rent', label: 'Sewa Rumah' },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1">{item.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-[10px]">Rp</span>
                      <input 
                        type="number"
                        value={expenses[item.key as keyof typeof expenses]}
                        onChange={(e) => setExpenses({ ...expenses, [item.key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-white text-xs focus:border-rose-500/50 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

                {/* Family Members Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Informasi Survey</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1">SKMP Ke</label>
                  <select 
                    value={skmpKe}
                    onChange={(e) => setSkmpKe(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-xs outline-none focus:border-blue-500/50"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n} className="bg-slate-900 text-white">{n}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1">Tgl Survey</label>
                  <input 
                    type="date"
                    value={surveyDate}
                    onChange={(e) => setSurveyDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase pl-1">Jumlah Anggota Keluarga</label>
                <input 
                  type="number"
                  min="1"
                  value={familyCount}
                  onChange={(e) => setFamilyCount(Number(e.target.value) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-xs outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Photo & Archive Upload Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1 flex items-center justify-between">
                    <span>Dokumentasi Lapangan</span>
                    <span className="text-emerald-400 font-mono">{photos.length} Foto</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square group">
                        <img src={photo} alt="" className="w-full h-full object-cover rounded-lg border border-white/10" />
                        <button 
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-white/20 hover:text-emerald-400">
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-[8px] font-bold uppercase">Tambah</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1 flex items-center justify-between">
                    <span>Arsip Hasil Scan (PDF/Foto)</span>
                    <span className="text-blue-400 font-mono text-[9px]">{archivedFiles.length} Berkas</span>
                  </label>
                  
                  <div className="space-y-2">
                    {archivedFiles.map((file, idx) => (
                      <div key={idx} className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2.5 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-white text-[10px] font-bold truncate">{file.name}</span>
                            <span className="text-white/30 text-[8px] uppercase font-bold">Hlm {idx + 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button 
                            onClick={() => openInNewTab(file.data)}
                            title="Buka di tab baru"
                            className="p-1.5 text-white/20 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => downloadFile(file.data, file.name)}
                            title="Unduh berkas"
                            className="p-1.5 text-white/20 hover:text-emerald-400 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => removeArchiveFile(idx)}
                            title="Hapus"
                            className="p-1.5 text-white/20 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <label className="w-full flex items-center gap-3 bg-white/5 border border-dashed border-white/10 rounded-xl p-3 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-[10px] font-bold uppercase">Tambah Berkas Scan</span>
                        <span className="text-white/30 text-[9px]">Maks 5MB • PDF, JPG, PNG</span>
                      </div>
                      <input type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={handleArchiveUpload} />
                    </label>
                  </div>
                </div>

                {/* Lembar Verifikasi Scan Section */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <label className="text-[10px] font-bold text-white/40 uppercase pl-1 flex items-center justify-between">
                    <span>Scan Lembar Verifikasi Bertanda Tangan</span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded",
                      signedSurveyPdfUrl ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    )}>
                      {signedSurveyPdfUrl ? "SUDAH UPLOAD" : "BELUM UPLOAD"}
                    </span>
                  </label>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {signedSurveyPdfUrl ? (
                      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-white text-[10px] font-bold truncate">Verification_Scan.pdf</span>
                            <span className="text-white/30 text-[8px] uppercase font-bold text-emerald-400/60">Tersimpan di Cloud</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => openInNewTab(signedSurveyPdfUrl)}
                            className="p-2 text-white/20 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={removeSurveyScan}
                            className="p-2 text-white/20 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className={cn(
                          "w-full flex items-center gap-4 bg-white/5 border border-dashed border-white/10 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group",
                          (isUploading || isLoadingFile) && "opacity-50 cursor-not-allowed"
                        )}>
                          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                            {isUploading || isLoadingFile ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full" /> : <Upload className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white text-[11px] font-bold uppercase">
                              {isLoadingFile ? 'Memuat dari Cloud...' : 'Upload Hasil Scan Bertanda Tangan'}
                            </span>
                            <span className="text-white/30 text-[9px]">Maks 1MB • PDF, JPG, PNG</span>
                          </div>
                          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleSurveyScanUpload} disabled={isUploading || isLoadingFile} />
                        </label>
                        <button 
                          onClick={() => setShowQRModal(true)}
                          className="w-full flex items-center justify-center gap-2 text-white text-[10px] font-bold py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Scan lewat kamera HP
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Explanation Section */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase pl-1">Penjelasan / Catatan Survey</label>
                <textarea 
                  rows={4}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-xs outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Masukkan penjelasan tambahan..."
                />
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="bg-emerald-600/10 rounded-xl p-4 border border-emerald-500/20 space-y-3 sticky bottom-0 backdrop-blur-md">
              <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ringkasan Otomatis</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/60">Total A (Pendapatan)</span>
                  <span className="text-emerald-400 font-bold">Rp {formatCurrency(totalA)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/60">Total B (Pengeluaran)</span>
                  <span className="text-rose-400 font-bold">Rp {formatCurrency(totalB)}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white font-bold text-[11px]">Sisa (A-B)</span>
                  <span className={cn(balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    Rp {formatCurrency(balance)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-white/5">
                  <span className="text-white/40 italic">Jml. Anggota Keluarga</span>
                  <span className="text-white/60 font-mono">{familyCount} Jiwa</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 italic">Pendapatan (A) / Anggota</span>
                  <span className="text-emerald-400/80 font-bold">Rp {formatCurrency(Math.round(perCapita))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center bg-slate-950 print:p-0 print:bg-white print:block shadow-inner scrollbar-hide">
          {activeTab === 'survey' ? (
            <div 
              className="bg-white w-full max-w-[850px] shadow-2xl rounded-sm print:shadow-none print:rounded-none origin-top transition-all duration-300 p-8 flex flex-col gap-6 mb-40 print:mb-0"
              style={{ transform: `scale(${scale})` }}
            >
            {/* PAGE 1 */}
            <div className="min-h-[1050px] flex flex-col bg-white overflow-hidden">
              <PageHeader />

              <div className="grid grid-cols-[1fr_1fr] gap-x-6 mb-4 text-[10px]">
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>Nama</span><span>:</span><span className="font-bold uppercase">{recipient.name}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>NIK</span><span>:</span><span>{recipient.nik}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>No. KK</span><span>:</span><span>{recipient.kk}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>TTL</span><span>:</span><span>{recipient.pob}, {recipient.dob ? new Date(recipient.dob).toLocaleDateString('id-ID') : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>Kelamin</span><span>:</span><span>{recipient.gender}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>Alamat</span><span>:</span><span>{recipient.address}, RT/RW {recipient.rt}/{recipient.rw}, {recipient.kampung}, Kec. {recipient.district}</span>
                  </div>
                  <div className="grid grid-cols-[70px_10px_1fr]">
                    <span>Nomor Hp</span><span>:</span><span>{recipient.contact}</span>
                  </div>
                  {recipient.headOfFamilyName && (
                    <div className="grid grid-cols-[70px_10px_1fr]">
                      <span>Kepala Kel.</span><span>:</span><span>{recipient.headOfFamilyName} ({recipient.familyStatus})</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>SKMP KE -</span><span>:</span><span className="font-bold">{skmpKe}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Tanggal Survey</span><span>:</span><span className="font-bold">{surveyDate ? new Date(surveyDate).toLocaleDateString('id-ID') : '-'}</span>
                  </div>
                  <div className="h-1" />
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>ID Registrasi</span><span>:</span><span>{recipient.registrationId}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Sumber Berkas</span><span>:</span><span>{recipient.source}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Bidang</span><span>:</span><span>{recipient.sector} - {recipient.subSector}</span>
                  </div>
                  <div className="h-1" />
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Program</span><span>:</span><span className="font-bold">{recipient.programName}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Tgl Pengajuan</span><span>:</span><span>{recipient.submissionDate ? new Date(recipient.submissionDate).toLocaleDateString('id-ID') : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span>Tujuan Bantu</span><span>:</span><span>{recipient.purpose}</span>
                  </div>
                  {recipient.schoolName && (
                    <div className="grid grid-cols-[100px_10px_1fr]">
                       <span>Sekolah</span><span>:</span><span>{recipient.schoolName} ({recipient.schoolLevel} - {recipient.schoolClass})</span>
                    </div>
                  )}
                  {recipient.bankName && (
                    <div className="grid grid-cols-[100px_10px_1fr]">
                      <span>Rekening</span><span>:</span><span>{recipient.bankName} {recipient.bankAccountNo} a/n {recipient.bankAccountHolder}</span>
                    </div>
                  )}
                  {recipient.amountProposed > 0 && (
                     <div className="grid grid-cols-[100px_10px_1fr]">
                        <span>Nominal Ajuan</span><span>:</span><span className="font-bold">Rp {formatCurrency(recipient.amountProposed)}</span>
                     </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 border border-black">
                {/* Left Column: INDEKS RUMAH */}
                <div className="border-r border-black">
                  <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold text-[10px] uppercase">INDEKS RUMAH</div>
                  
                  {/* Ukuran Rumah */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Ukuran Rumah<br/>(m²/orang)</div>
                    <div className="p-1">
                      <Checkbox label="Sangat Kecil ( < 4 m²)" />
                      <Checkbox label="Kecil (4-6 m²)" />
                      <Checkbox label="Sedang (6-8 m²)" />
                      <Checkbox label="Besar ( > 8 m²)" />
                    </div>
                  </div>

                  {/* Dinding Rumah */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Dinding Rumah</div>
                    <div className="p-1">
                      <Checkbox label="Bilik Bambu/Kayu" />
                      <Checkbox label="Semi" />
                      <Checkbox label="Tembok/Beton" />
                      <div className="h-4"></div>
                    </div>
                  </div>

                  {/* Lantai */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Lantai</div>
                    <div className="p-1">
                      <Checkbox label="Tanah" />
                      <Checkbox label="Panggung" />
                      <Checkbox label="Semen" />
                      <Checkbox label="Keramik" />
                    </div>
                  </div>

                  {/* Atap */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Atap</div>
                    <div className="p-1">
                      <Checkbox label="Kirai/Ijuk" />
                      <Checkbox label="Genteng/Seng" />
                      <div className="h-2"></div>
                      <Checkbox label="Asbes/Berglazur" />
                    </div>
                  </div>

                  {/* Kepemilikan Rumah */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Kepemilikan Rumah</div>
                    <div className="p-1">
                      <Checkbox label="Menumpang" />
                      <Checkbox label="Kontrak" />
                      <Checkbox label="Keluarga" />
                      <Checkbox label="Sendiri" />
                    </div>
                  </div>

                  {/* Dapur */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Dapur</div>
                    <div className="p-1">
                      <Checkbox label="Tungku" />
                      <Checkbox label="Kompor Minyak" />
                      <Checkbox label="Kompor Gas" />
                      <Checkbox label="Kompor Listrik" />
                    </div>
                  </div>

                  {/* Kursi */}
                  <div className="grid grid-cols-[100px_1fr]">
                    <div className="p-1 border-r border-black text-[9px]">Kursi</div>
                    <div className="p-1">
                      <Checkbox label="Lesehan" />
                      <Checkbox label="Balai Bambu" />
                      <Checkbox label="Kayu" />
                      <Checkbox label="Sofa" />
                    </div>
                  </div>
                </div>

                {/* Right Column: KEPEMILIKAN HARTA */}
                <div>
                  <div className="bg-slate-100 border-b border-black px-2 py-0.5 font-bold text-[10px] uppercase">KEPEMILIKAN HARTA</div>
                  
                  {/* Kebun / Sawah */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Kebun / Sawah</div>
                    <div className="p-1">
                      <Checkbox label="Tidak Ada" />
                      <Checkbox label="< 1000 m²" />
                      <Checkbox label="1000 - 5000 m²" />
                      <Checkbox label="> 5000 m²" />
                    </div>
                  </div>

                  {/* Elektronik */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Elektronik</div>
                    <div className="p-1">
                      <Checkbox label="Radio" />
                      <Checkbox label="Tape" />
                      <Checkbox label="Televisi" />
                      <Checkbox label="CD Player" />
                      <Checkbox label="Handphone" />
                    </div>
                  </div>

                  {/* Kendaraan */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Kendaraan</div>
                    <div className="p-1">
                      <Checkbox label="Tidak Ada" />
                      <Checkbox label="Sepeda Kayuh" />
                      <Checkbox label="Sepeda Motor" />
                      <Checkbox label="Mobil" />
                    </div>
                  </div>

                  {/* Ternak */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Ternak</div>
                    <div className="p-1 text-[8px] space-y-0 text-slate-800">
                      <p>Unggas : 0 ekor</p>
                      <p>Domba : 0 ekor</p>
                      <p>Kambing : 0 ekor</p>
                      <p>Sapi : 0 ekor</p>
                      <p>Kerbau : 0 ekor</p>
                    </div>
                  </div>

                  {/* Aset */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Aset</div>
                    <div className="p-1">
                      <Checkbox label="Tidak Ada" />
                      <Checkbox label="Emas ( 0 )" />
                      <Checkbox label="Bank ( 0 )" />
                      <Checkbox label="Tabungan" />
                    </div>
                  </div>

                  {/* Kepemilikan Lainnya */}
                  <div className="grid grid-cols-[100px_1fr] border-b border-black">
                    <div className="p-1 border-r border-black text-[9px]">Kepemilikan Lainnya</div>
                    <div className="p-1 h-6"></div>
                  </div>

                  {/* Keterangan Lainnya */}
                  <div className="grid grid-cols-[100px_1fr]">
                    <div className="p-1 border-r border-black text-[9px]">Keterangan Lainnya :</div>
                    <div className="p-1 h-8"></div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-bold text-[10px] underline mb-1 uppercase">Profil Keluarga</h3>
                <table className="w-full border-collapse border border-black text-center">
                  <thead className="bg-slate-100 font-bold text-[9px] uppercase">
                    <tr>
                      <th rowSpan={2} className="border border-black p-0.5 w-6">No</th>
                      <th rowSpan={2} className="border border-black p-0.5 w-[150px]">Nama</th>
                      <th rowSpan={2} className="border border-black p-0.5 w-8">Usia</th>
                      <th rowSpan={2} className="border border-black p-0.5">Hub Keluarga</th>
                      <th rowSpan={2} className="border border-black p-0.5">Status</th>
                      <th colSpan={2} className="border border-black p-0.5">Pekerjaan</th>
                      <th rowSpan={2} className="border border-black p-0.5">Pendidikan</th>
                      <th rowSpan={2} className="border border-black p-0.5 w-8">Ket</th>
                    </tr>
                    <tr>
                      <th className="border border-black p-0.5">Utama</th>
                      <th className="border border-black p-0.5">Sampingan</th>
                    </tr>
                  </thead>
                  <tbody className="text-[9px]">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <tr key={i} className="h-5">
                        <td className="border border-black text-center font-mono">{(i+1).toString().padStart(2, '0')}</td>
                        <td className="border border-black text-left px-1"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black uppercase"></td>
                        <td className="border border-black uppercase"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                        <td className="border border-black uppercase"></td>
                        <td className="border border-black"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print:break-before-page h-[1px]"></div>

            {/* PAGE 2 */}
            <div className="min-h-[1050px] flex flex-col bg-white overflow-hidden">
              <h3 className="font-bold text-[10px] underline mb-4 uppercase">Online (Di isi dari aplikasi)</h3>
              <h3 className="font-bold text-[10px] underline mb-2 uppercase">Keuangan Keluarga</h3>
              
              <div className="grid grid-cols-2 border border-black mb-4">
                {/* Pendapatan Table */}
                <div className="border-r border-black">
                  <div className="grid grid-cols-[1fr_80px]">
                    <div className="p-1 border-b border-r border-black font-bold text-[8px] bg-slate-100 uppercase">Pendapatan Keluarga (A), bersumber dari</div>
                    <div className="p-1 border-b border-black font-bold text-[8px] text-center bg-slate-100 uppercase">Jumlah (Rp)</div>
                    
                    {[
                      { label: "Usaha Pokok Suami :", value: income.husband },
                      { label: "Usaha Pokok Istri :", value: income.wife },
                      { label: "Usaha lainnya :", value: income.others },
                      { label: "Dari orang tua :", value: income.parents },
                      { label: "Dari anak/menantu :", value: income.children },
                      { label: `Pgh. Lainnya${income.additional ? ` (${income.additional})` : ''} :`, value: income.additionalNominal }
                    ].map((item, idx) => (
                      <React.Fragment key={idx}>
                        <div className="p-0.5 border-b border-r border-black text-[9px] pl-1">{idx + 1}. {item.label}</div>
                        <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                          {item.value ? formatCurrency(Number(item.value)) : '-'}
                        </div>
                      </React.Fragment>
                    ))}
                    <div className="p-1 h-8 border-r border-black"></div>
                    <div className="p-1 h-8"></div>
                    
                    <div className="p-1 border-t border-r border-black font-bold text-[9px] bg-slate-100 uppercase">TOTAL A</div>
                    <div className="p-1 border-t border-black bg-slate-100 text-right text-[9px] font-bold pr-1 font-mono">
                      {totalA > 0 ? formatCurrency(totalA) : ''}
                    </div>
                  </div>
                </div>

                {/* Expenses Table */}
                <div>
                  <div className="grid grid-cols-[1fr_80px]">
                    <div className="p-1 border-b border-r border-black font-bold text-[8px] bg-slate-100 uppercase">Pengeluaran Rutin (B), dialokasikan untuk</div>
                    <div className="p-1 border-b border-black font-bold text-[8px] text-center bg-slate-100 uppercase">Jumlah (Rp)</div>
                    
                    {[
                      { label: "Kebutuhan Dapur :", value: expenses.kitchen },
                      { label: "Pendidikan :", value: expenses.education },
                      { label: "Kesehatan :", value: expenses.health },
                      { label: "Biaya iuran rutin :", value: '' }
                    ].map((item, idx) => (
                      <React.Fragment key={idx}>
                        <div className="p-0.5 border-b border-r border-black text-[9px] pl-1">{idx + 1}. {item.label}</div>
                        <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                          {item.value ? formatCurrency(Number(item.value)) : '-'}
                        </div>
                      </React.Fragment>
                    ))}
                    <div className="pl-4 pr-1 border-b border-r border-black text-[8px]">a. Listrik</div>
                    <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                      {expenses.electricity ? formatCurrency(Number(expenses.electricity)) : '-'}
                    </div>
                    <div className="pl-4 pr-1 border-b border-r border-black text-[8px]">b. Air Minum</div>
                    <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                      {expenses.water ? formatCurrency(Number(expenses.water)) : '-'}
                    </div>
                    <div className="pl-4 pr-1 border-b border-r border-black text-[8px]">c. Siskamling</div>
                    <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                      {expenses.security ? formatCurrency(Number(expenses.security)) : '-'}
                    </div>
                    
                    <div className="p-0.5 border-b border-r border-black text-[9px] pl-1">5. Transportasi :</div>
                    <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                      {expenses.transport ? formatCurrency(Number(expenses.transport)) : '-'}
                    </div>
                    
                    <div className="p-0.5 border-b border-r border-black text-[9px] pl-1">6. Pglr Lain: Sewa Rumah</div>
                    <div className="p-0.5 border-b border-black text-right text-[9px] pr-1 font-mono">
                      {expenses.rent ? formatCurrency(Number(expenses.rent)) : '-'}
                    </div>

                    <div className="p-1 border-r border-black h-2"></div>
                    <div className="p-1 h-2"></div>
                    
                    <div className="p-1 border-t border-r border-black font-bold text-[9px] bg-slate-100 uppercase">TOTAL B</div>
                    <div className="p-1 border-t border-black bg-slate-100 text-right text-[9px] font-bold pr-1 font-mono">
                      {totalB > 0 ? formatCurrency(totalB) : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-black mb-4 p-1.5 font-bold text-[9px] bg-slate-50 uppercase tracking-tight">
                SISA PENDAPATAN PER BULAN (A-B) = ( {formatCurrency(totalA)} ) - ( {formatCurrency(totalB)} ) = Rp {formatCurrency(balance)}
              </div>

              <div className="border border-black mb-6 p-1.5 font-bold text-[9px] bg-slate-50 uppercase tracking-tight">
                Jumlah Pendapatan (Total A) / Jumlah Anggota Keluarga = ( {formatCurrency(totalA)} ) / ( {familyCount} ) = Rp {formatCurrency(Math.round(perCapita))} 
              </div>

              <div className="flex-1 border border-black p-3 mt-2 min-h-[400px]">
                <h4 className="font-bold text-[10px] mb-2 uppercase underline underline-offset-2">Penjelasan :</h4>
                <div className="text-[10px] whitespace-pre-wrap leading-relaxed text-slate-800">
                  {explanation || (
                    <div className="space-y-4">
                      <div className="h-4 border-b border-slate-200"></div>
                      <div className="h-4 border-b border-slate-200"></div>
                      <div className="h-4 border-b border-slate-200"></div>
                      <div className="h-4 border-b border-slate-200"></div>
                      <div className="h-4 border-b border-slate-200"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="print:break-before-page h-[1px]"></div>

            {/* PAGE 3 */}
            <div className="min-h-[1050px] flex flex-col bg-white overflow-hidden">
              <h3 className="font-bold text-[10px] underline mb-4 uppercase underline-offset-2">Offline (Di isi Manua)</h3>
              
              <div className="border border-black mb-6">
                <div className="bg-black text-white px-2 py-1 font-bold text-[10px] uppercase tracking-wide">Profil Bidang Usaha Mustahik</div>
                
                <div className="grid grid-cols-[30px_120px_1fr] border-b border-black">
                  <div className="p-1 border-r border-black text-center text-[9px] font-bold">1</div>
                  <div className="p-1 border-r border-black text-[9px]">Usaha Mustahik</div>
                  <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                    <Checkbox label="a. Kuliner" />
                    <Checkbox label="b. Jasa" />
                    <Checkbox label="c. Pertanian/Peternakan" />
                    <Checkbox label="d. Ekonomi Kreatif" />
                    <Checkbox label="e. Perdagangan" />
                    <Checkbox label="f. Industri & Pdg" />
                    <Checkbox label="g. Pdg Eceran" />
                    <Checkbox label="h. Kehutanan" />
                  </div>
                </div>

                <div className="grid grid-cols-[30px_120px_1fr] border-b border-black">
                  <div className="p-1 border-r border-black text-center text-[9px] font-bold">2</div>
                  <div className="p-1 border-r border-black text-[9px]">Lama Usaha</div>
                  <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                    <Checkbox label="a. 1 < tahun" />
                    <Checkbox label="b. 1-2 tahun" />
                    <Checkbox label="c. 3-4 tahun" />
                    <Checkbox label="d. > 5 tahun" />
                  </div>
                </div>

                <div className="grid grid-cols-[30px_1fr] border-b border-black">
                  <div className="p-1 border-r border-black text-center text-[9px] font-bold">3</div>
                  <div className="p-0">
                    <div className="grid grid-cols-[120px_1fr] border-b border-black">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">3.1. Sumber Modal</div>
                      <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                        <Checkbox label="a. Sendiri" />
                        <Checkbox label="b. Sendiri & Pinjam" />
                        <Checkbox label="c. Pinjam semua" />
                        <Checkbox label="d. Lain-lain" />
                      </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] border-b border-black">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">3.2. Jml pekerja terlibat</div>
                      <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                        <Checkbox label="a. 2 Orang" />
                        <Checkbox label="b. 5-10 Orang" />
                        <Checkbox label="c. > 10 Orang" />
                      </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr]">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">3.3. Status Usaha</div>
                      <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                        <Checkbox label="a. Untung" />
                        <Checkbox label="b. Impas" />
                        <Checkbox label="c. Gulung tikar" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[30px_1fr]">
                  <div className="p-1 border-r border-black text-center text-[9px] font-bold">4</div>
                  <div className="p-0">
                    <div className="grid grid-cols-[120px_1fr] border-b border-black">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">4.1. Keberlanjutan</div>
                      <div className="p-1.5 grid grid-cols-3 gap-x-1 gap-y-0.5">
                        <Checkbox label="a. Berlanjut" />
                        <Checkbox label="b. Semi Berlanjut" />
                        <Checkbox label="c. Tdk Berlanjut" />
                      </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] border-b border-black">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">4.2. Aspek Legalitas</div>
                      <div className="p-1.5 grid grid-cols-4 gap-x-1 gap-y-0.5">
                        <Checkbox label="a. Ada" />
                        <Checkbox label="b. Tidak Ada" />
                        <Checkbox label="c. Lengkap" />
                        <Checkbox label="d. Tak Lengkap" />
                      </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr]">
                      <div className="p-1 border-r border-black text-[9px] pl-2 font-medium">4.3. Akses Teknologi</div>
                      <div className="p-1 outline-none grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <Checkbox label="a. Ada" />
                        <Checkbox label="b. Tidak Ada" />
                        <Checkbox label="c. Jarang" />
                        <Checkbox label="d. Semua Platform" />
                        <Checkbox label="e. Offline" />
                        <Checkbox label="f. Sosmed Tertentu" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <h3 className="font-bold text-[9px] underline mb-1 uppercase tracking-wider">REKAPITULASI KELAYAKAN</h3>
                <table className="w-full border-collapse border border-black text-[9px]">
                  <thead className="bg-black text-white font-bold uppercase text-[8px]">
                    <tr>
                      <th className="border border-black p-0.5 text-left pl-2">PARAMETER</th>
                      <th className="border border-black p-0.5 w-[140px]">KELAYAKAN</th>
                      <th className="border border-black p-0.5">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      "Indeks Rumah",
                      "Kepemilikan Harta",
                      "Pendapatan"
                    ].map((param) => (
                      <tr key={param}>
                        <td className="border border-black p-1 font-bold uppercase">{param}</td>
                        <td className="border border-black p-1.5">
                          <Checkbox label="a. Layak" />
                          <Checkbox label="b. Tidak Layak" />
                        </td>
                        <td className="border border-black p-1"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-[9px]">
                <p className="font-bold italic mb-1 uppercase tracking-tighter">Ket. Lain : <span className="font-normal not-italic normal-case">Hal menarik program / publikasi</span></p>
                <div className="border border-black h-16"></div>
              </div>

              <div className="mt-4 border border-black">
                <div className="grid grid-cols-[140px_1fr_1fr]">
                  <div className="bg-black text-white font-bold uppercase p-2 text-center text-[10px] flex items-center justify-center border-r border-white">REKOMENDASI</div>
                  <div className="border-r border-black">
                    <div className="p-0.5 border-b border-black text-[8px] font-bold bg-slate-50 uppercase text-center">Petugas Survey</div>
                    <div className="p-3 space-y-1.5">
                      <Checkbox label="a. Layak" />
                      <Checkbox label="b. Tidak Layak" />
                      <Checkbox label="c. Dipertimbangkan" />
                    </div>
                  </div>
                  <div>
                    <div className="p-0.5 border-b border-black text-[8px] font-bold bg-slate-50 uppercase text-center">Bagian Penyaluran</div>
                    <div className="p-3 space-y-1.5">
                      <Checkbox label="a. Layak" />
                      <Checkbox label="b. Tidak Layak" />
                      <Checkbox label="c. Dipertimbangkan" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-[140px_1fr_1fr] border-t border-black bg-slate-50 min-h-[90px]">
                  <div className="border-r border-black"></div>
                  <div className="border-r border-black grid grid-cols-3 text-[8px] font-bold text-center uppercase tracking-tight">
                    <div className="p-0.5 border-r border-black border-b">Nama</div>
                    <div className="p-0.5 border-r border-black border-b">Ttd</div>
                    <div className="p-0.5 border-b">Tgl</div>
                    <div className="p-0.5 border-r border-black"></div>
                    <div className="p-0.5 border-r border-black"></div>
                    <div className="p-0.5"></div>
                  </div>
                  <div className="grid grid-cols-3 text-[8px] font-bold text-center uppercase tracking-tight">
                    <div className="p-0.5 border-r border-black border-b">Nama</div>
                    <div className="p-0.5 border-r border-black border-b">Ttd</div>
                    <div className="p-0.5 border-b">Tgl</div>
                    <div className="p-0.5 border-r border-black"></div>
                    <div className="p-0.5 border-r border-black"></div>
                    <div className="p-0.5"></div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[8px] italic tracking-tighter">• (Coret yang tidak perlu)</p>
            </div>

            {/* DOCUMENTATION & ARCHIVE PAGES */}
            {(photos.length > 0 || archivedFiles.length > 0) && (
              <>
                {photos.length > 0 && Array.from({ length: Math.ceil(photos.length / 4) }, (_, pageIdx) => {
                  const chunk = photos.slice(pageIdx * 4, pageIdx * 4 + 4);
                  return (
                    <div key={`photo-page-${pageIdx}`} className="min-h-[1050px] flex flex-col bg-white overflow-hidden p-8 gap-6 print:break-before-page shadow-2xl print:shadow-none mt-10 print:mt-0">
                      <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
                        <div>
                          <h2 className="text-sm font-bold uppercase tracking-tight">Lampiran Dokumentasi Verifikasi Lapangan</h2>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[10px]"><span className="inline-block w-20 font-bold uppercase">Nama Mustahik</span>: <span className="font-bold">{recipient.name}</span></p>
                            <p className="text-[10px]"><span className="inline-block w-20 font-bold uppercase">Alamat</span>: {recipient.address}, {recipient.kampung}</p>
                            <p className="text-[10px]"><span className="inline-block w-20 font-bold uppercase">Tanggal Survey</span>: {surveyDate ? new Date(surveyDate).toLocaleDateString('id-ID') : '-'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase">Dokumentasi Halaman {pageIdx + 1}</p>
                          <p className="text-[8px] text-slate-500">Total Foto: {photos.length}</p>
                          {archivedFiles.length > 0 && (
                            <p className="text-[8px] text-emerald-600 font-bold mt-1 uppercase flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-2 h-2" /> Digital Archive Attached ({archivedFiles.length})
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1">
                        {chunk.map((photo, idx) => (
                          <div key={idx} className="border border-black p-1 flex flex-col items-center justify-between h-full bg-slate-50/30">
                            <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                              <img src={photo} alt={`Dokumentasi ${pageIdx * 4 + idx + 1}`} className="max-w-full max-h-full object-contain" />
                            </div>
                            <p className="text-[8px] mt-2 py-1 w-full border-t border-black/10 text-center font-bold uppercase bg-white">
                              Gbr {pageIdx * 4 + idx + 1} - Dokumentasi Lapangan
                            </p>
                          </div>
                        ))}
                        {/* Fill remaining slots to maintain grid if < 4 photos */}
                        {chunk.length < 4 && Array.from({ length: 4 - chunk.length }).map((_, emptyIdx) => (
                          <div key={`empty-${emptyIdx}`} className="border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
                            <p className="text-[10px] text-slate-300 font-bold uppercase italic">Area Foto {chunk.length + emptyIdx + 1}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto border-t border-black pt-4 flex justify-between items-center text-[8px] uppercase font-medium">
                        <span>BAZNAS Kabupaten Siak - Lembar Verifikasi Survey</span>
                        <span>Dicetak pada: {new Date().toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })}

                {/* ARCHIVE PAGES */}
                {archivedFiles.map((file, fIdx) => (
                  <div key={`archive-page-${fIdx}`} className="min-h-[1050px] flex flex-col bg-white overflow-hidden print:break-before-page shadow-2xl print:shadow-none mt-10 print:mt-0">
                    <div className="flex-1 w-full h-full relative bg-slate-100 flex items-center justify-center overflow-hidden">
                       {file.data.startsWith('data:application/pdf') ? (
                         <iframe 
                           src={file.data} 
                           className="w-full h-full border-none"
                           title={file.name}
                         />
                       ) : (
                         <img src={file.data} className="max-w-full max-h-full object-contain" alt={file.name} />
                       )}
                    </div>
                  </div>
                ))}
              </>
            )}
            </div>
          ) : (
            <div 
              className="bg-white w-full max-w-[850px] shadow-2xl rounded-sm print:shadow-none print:rounded-none origin-top transition-all duration-300 p-8 flex flex-col gap-6 mb-40 print:mb-0"
              style={{ transform: `scale(${scale})` }}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight">Preview Hasil Scan</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lembar Verifikasi Terverifikasi (Signed)</p>
                  </div>
                </div>
                {signedSurveyPdfUrl && (
                  <button 
                    onClick={() => openInNewTab(signedSurveyPdfUrl)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all border border-blue-200 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> BUKA FULL SCREEN
                  </button>
                )}
              </div>

              <div className="flex-1 w-full bg-slate-100 min-h-[1000px] rounded-lg border border-slate-200 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {signedSurveyPdfUrl ? (
                  <embed src={signedSurveyPdfUrl} width="100%" height="1000px" type="application/pdf" className="w-full h-full min-h-[1000px]" />
                ) : (
                  <div className="text-center p-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                      <ImageIcon className="w-12 h-12 text-slate-300" />
                    </div>
                    <h4 className="text-slate-600 font-black text-lg mb-2 uppercase tracking-wide">Belum Ada Scan Terunggah</h4>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">Silakan gunakan panel editor di sebelah kiri untuk mengunggah scan lembar verifikasi yang sudah ditandatangani.</p>
                    <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Menunggu Berkas
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Spacer to ensure scrolling works with scale */}
          <div style={{ height: `${Math.max(100, scale * 1200)}px` }} className="print:hidden h-20 shrink-0" />
        </div>
      </div>
    </div>
  );
}

