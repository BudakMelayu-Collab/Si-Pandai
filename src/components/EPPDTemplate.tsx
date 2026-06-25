import React, { useState, useEffect } from 'react';
import QRCodeModal from './QRCodeModal';
import { Recipient } from '../types';
import { 
  Printer, X, FileText, CheckSquare, Square, 
  Image as ImageIcon, Upload, Edit3, Plus, Trash2,
  FileCheck, ExternalLink, AlertCircle, ChevronRight, Download,
  ClipboardList, Loader2, Smartphone
} from 'lucide-react';
import { cn, compressImage, isBase64SizeValid } from '../lib/utils';
import { PPDRecord } from '../types';
import * as storage from '../lib/storage';

interface EPPDTemplateProps {
  recipient: Recipient;
  records: PPDRecord[];
  onSaveRecord: (record: Omit<PPDRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
  onClose: () => void;
}

export default function EPPDTemplate({ recipient, records, onSaveRecord, onDeleteRecord, onClose }: EPPDTemplateProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedPdfBlobUrl, setSignedPdfBlobUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedRecipientId, setLoadedRecipientId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Fetch scan from subcollection if it exists but isn't loaded
  useEffect(() => {
    const fetchScan = async () => {
      if (recipient.hasSignedPdf && !signedPdfUrl) {
        setIsLoadingFile(true);
        try {
          const { getRecipientFile } = await import('../firebase');
          const base64 = await getRecipientFile(recipient.id, 'eppd');
          if (base64) {
            setSignedPdfUrl(base64);
          } else {
            // Clear stale flag
            const { updateRecipientPdf } = await import('../firebase');
            await updateRecipientPdf(recipient.id, null);
          }
        } catch (error) {
          console.error("Failed to fetch scan", error);
        } finally {
          setIsLoadingFile(false);
        }
      }
    };
    fetchScan();
  }, [recipient.id, recipient.hasSignedPdf]);

  // Convert Base64 to Blob URL for better browser compatibility
  useEffect(() => {
    if (signedPdfUrl && signedPdfUrl.startsWith('data:application/pdf')) {
      const createBlobUrl = async () => {
        try {
          const response = await fetch(signedPdfUrl);
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
  }, [signedPdfUrl]);

  // Dropdown modes
  const [divisiMode, setDivisiMode] = useState<'select' | 'input'>(() => {
    const saved = localStorage.getItem(`ppd_data_${recipient.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      const options = ["Pendistribusian", "Pendayagunaan"];
      return options.includes(data.division) ? 'select' : 'input';
    }
    return 'select';
  });

  const [pemohonMode, setPemohonMode] = useState<'select' | 'input'>(() => {
    const saved = localStorage.getItem(`ppd_data_${recipient.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      const options = ["Satriyanda, SE", "Muslikun Thohari, S.IKOM", "Ikhlasul Amal, M.Ag", "Nanag Sujana, S.Hut"];
      return options.includes(data.requestedBy) ? 'select' : 'input';
    }
    return 'select';
  });

  // Budget Dictionary State
  const [budgetList, setBudgetList] = useState<{code: string, label: string}[]>(() => {
    const saved = localStorage.getItem('baznas_ppd_budget_list');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Local state for PPD data with persistence per recipient
  const [ppdData, setPpdData] = useState({
    no: `${recipient.registrationId}/PPD/${new Date().getFullYear()}`,
    requestedBy: localStorage.getItem('ppd_pdp_name') || '',
    division: localStorage.getItem('ppd_pdp_division') || '',
    function: localStorage.getItem('ppd_pdp_role') || '',
    date: new Date().toLocaleDateString('id-ID'),
    amount: 0,
    proposeFor: '',
    paidFor: '',
    refNo: '-',
    requestDisbursement: '',
    transferDetails: '',
    transactionType: 'Pembayaran',
    rows: [
      { id: Date.now(), budgetCode: '', classification: '', total: 0 }
    ],
    signers: {
      staff: { name: localStorage.getItem('ppd_pdp_name') || '', role: localStorage.getItem('ppd_pdp_role') || '' },
      kabid: { name: 'Andreas Supriadi, S.I.Kom', role: 'Kabid. PDP' },
      waka: { name: 'H.Sukijo', role: 'Waka II. PDP' },
      ketua: { name: 'H. Samparis Bin Tatan, S.Pd.I', role: 'Ketua' },
      finance1: { name: '', role: 'Pemeriksa' },
      finance2: { name: '', role: 'Disetujui' }
    },
    note: '',
    noteFinance: '',
    attachment: ''
  });

  const [showQRModal, setShowQRModal] = useState(false);

  // Sync state when recipient changes
  useEffect(() => {
    const loadSaved = async () => {
      setIsLoaded(false); // Reset loaded state while fetching
      setLogo(await storage.getItem('baznas_logo'));

      // Try local storage first
      let savedData = await storage.getItem(`ppd_data_${recipient.id}`);
      
      // If not in local storage, try cloud
      if (!savedData) {
        try {
          const { getRecipientTemplateData } = await import('../firebase');
          savedData = await getRecipientTemplateData(recipient.id, 'eppd');
          if (savedData) {
            await storage.setItem(`ppd_data_${recipient.id}`, savedData);
          }
        } catch (e) {
          console.error("Cloud fetch failed", e);
        }
      }

      if (savedData) {
        setPpdData(typeof savedData === 'string' ? JSON.parse(savedData) : savedData);
      } else {
        setPpdData({
          no: `${recipient.registrationId}/PPD/${new Date().getFullYear()}`,
          requestedBy: localStorage.getItem('ppd_pdp_name') || '',
          division: localStorage.getItem('ppd_pdp_division') || '',
          function: localStorage.getItem('ppd_pdp_role') || '',
          date: new Date().toLocaleDateString('id-ID'),
          amount: 0,
          proposeFor: '',
          paidFor: '',
          refNo: '-',
          requestDisbursement: '',
          transferDetails: '',
          transactionType: 'Pembayaran',
          rows: [
            { id: Date.now(), budgetCode: '', classification: '', total: 0 }
          ],
          signers: {
            staff: { name: localStorage.getItem('ppd_pdp_name') || '', role: localStorage.getItem('ppd_pdp_role') || '' },
            kabid: { name: 'Andreas Supriadi, S.I.Kom', role: 'Kabid. PDP' },
            waka: { name: 'H.Sukijo', role: 'Waka II. PDP' },
            ketua: { name: 'H. Samparis Bin Tatan, S.Pd.I', role: 'Ketua' },
            finance1: { name: '', role: 'Pemeriksa' },
            finance2: { name: '', role: 'Disetujui' }
          },
          note: '',
          noteFinance: '',
          attachment: ''
        });
      }

      setLoadedRecipientId(recipient.id);
      setIsLoaded(true);

      const savedPdf = await storage.getItem(`ppd_signed_pdf_${recipient.id}`);
      setSignedPdfUrl(savedPdf);
      
      // Reset modes
      const optionsDiv = ["Pendistribusian", "Pendayagunaan"];
      const optionsPem = ["Satriyanda, SE", "Muslikun Thohari, S.IKOM", "Ikhlasul Amal, M.Ag", "Nanag Sujana, S.Hut"];
      
      if (savedData) {
        const data = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        setDivisiMode(optionsDiv.includes(data.division) ? 'select' : 'input');
        setPemohonMode(optionsPem.includes(data.requestedBy) ? 'select' : 'input');
      } else {
        setDivisiMode('select');
        setPemohonMode('select');
      }
    };
    loadSaved();
  }, [recipient.id]);

  // Save changes to storage automatically
  useEffect(() => {
    if (!isLoaded || loadedRecipientId !== recipient.id) return;
    
    const saveData = async () => {
      setSaveStatus('saving');
      try {
        await storage.setItem(`ppd_data_${recipient.id}`, ppdData);
        const { saveRecipientTemplateData } = await import('../firebase');
        await saveRecipientTemplateData(recipient.id, 'eppd', ppdData);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Save failed", e);
        setSaveStatus('error');
      }
    };

    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [ppdData, recipient.id, isLoaded, loadedRecipientId]);

  // Stream scan from cloud
  useEffect(() => {
    if (!recipient.id) return;
    let isMounted = true;
    
    const startStream = async () => {
      try {
        const { streamRecipientScan } = await import('../firebase');
        return streamRecipientScan(recipient.id, 'eppd', (base64) => {
          if (!isMounted) return;
          if (base64) {
             setSignedPdfUrl(base64);
          } else {
             setSignedPdfUrl(null);
          }
        });
      } catch (e) {
        console.error("Error setting up EPPD stream", e);
      }
    };
    
    let unsubscribe: any = null;
    startStream().then(unsub => { if(unsub) unsubscribe = unsub; });
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [recipient.id]);

  const handleSavePdfToServer = async (base64: string | null) => {
    setIsUploading(true);
    try {
      const { updateRecipientPdf } = await import('../firebase');
      await updateRecipientPdf(recipient.id, base64);
      setSignedPdfUrl(base64);
    } catch (error: any) {
      console.error(error);
      alert('Gagal menyimpan ke Cloud. ' + (error.message.includes('quota') ? 'Quota storage penuh.' : 'File mungkin terlalu besar (>1MB).'));
    } finally {
      setIsUploading(false);
    }
  };

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleLoadRecord = (record: PPDRecord) => {
    // Basic implementation to load record data back into editor if needed
    // For now, we update the main fields from the record
    setPpdData(prev => ({
      ...prev,
      no: record.no,
      date: record.date,
      requestedBy: record.requestedBy,
      amount: record.amount,
      proposeFor: record.proposeFor
    }));
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        setSignedPdfUrl(base64);
        await storage.setItem(`ppd_signed_pdf_${recipient.id}`, base64);
        await handleSavePdfToServer(base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Scan upload error:', error);
      setIsUploading(false);
    }
  };

  const openPdfInNewTab = () => {
    const url = signedPdfBlobUrl || signedPdfUrl;
    if (!url) return;
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <body style="margin:0; background: #333;">
            <embed width="100%" height="100%" src="${url}" type="application/pdf">
          </body>
        </html>
      `);
    } else {
      alert('Pop-up diblokir. Silahkan izinkan pop-up untuk melihat PDF.');
    }
  };

  const saveBudgetDictionary = (newList: {code: string, label: string}[]) => {
    setBudgetList(newList);
    localStorage.setItem('baznas_ppd_budget_list', JSON.stringify(newList));
  };

  const totalAmount = ppdData.rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

  const transactionTypes = ['Uang Muka', 'Reimbursment', 'Pembayaran', 'Piutang Penyaluran', 'Bank Program', 'Lain-lain'];

  const removeBudget = (code: string) => {
    const newList = budgetList.filter(b => b.code !== code);
    saveBudgetDictionary(newList);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col print:p-0 print:bg-white print:block overflow-hidden">
      {/* Scanner Mode View */}
      {showQRModal && (
        <QRCodeModal
          url={`${window.location.origin}/?scanner=true&recipientId=${recipient.id}&docType=eppd`}
          onClose={() => setShowQRModal(false)}
          title="Scan E-PPD"
          subtitle="Scan QR Code ini menggunakan HP Anda untuk memfoto dokumen E-PPD"
        />
      )}

      {/* Toolbar */}
      <div className="bg-[#1a1c2c] border-b border-white/10 p-3 flex items-center justify-between print:hidden shrink-0">
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
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-bold text-white text-sm leading-tight">E-PPD System</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-300/60 uppercase font-bold tracking-wider">Permohonan Pengeluaran Dana</span>
                {saveStatus === 'saving' && <span className="text-white/40 animate-pulse text-[8px] uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">● Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400 text-[8px] uppercase tracking-tighter bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/10">● Tersimpan</span>}
                {saveStatus === 'error' && <span className="text-red-400 text-[8px] uppercase tracking-tighter bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/10">● Gagal</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2 max-w-xl px-4 overflow-x-auto scrollbar-hide">
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
            {isEditing ? "Tutup Editor" : "Edit Konten"}
          </button>

          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-white/10"
          >
            <Download className="w-4 h-4" /> PDF
          </button>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-white/10"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            {records.filter(r => r.recipientId === recipient.id).slice(0, 2).map(record => (
              <button
                key={record.id}
                onClick={() => handleLoadRecord(record)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 rounded-lg text-[9px] font-bold border border-white/5 uppercase transition-all whitespace-nowrap"
              >
                {record.date}
              </button>
            ))}
          </div>

          <button 
            onClick={async () => {
              try {
                setSaveStatus('saving');
                const { saveRecipientTemplateData } = await import('../firebase');
                await saveRecipientTemplateData(recipient.id, 'eppd', ppdData);
                await storage.setItem(`ppd_data_${recipient.id}`, ppdData);
                setSaveStatus('saved');
              } catch (e) {
                console.error("Save failed", e);
              }
              
              onSaveRecord({
                no: ppdData.no,
                date: ppdData.date,
                requestedBy: ppdData.requestedBy,
                amount: totalAmount,
                proposeFor: ppdData.proposeFor,
                recipientId: recipient.id
              });
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Simpan Rekap
          </button>
        </div>
      </div>

      {/* Document View */}
      <div className="flex-1 flex overflow-hidden bg-slate-900/50 print:bg-white print:block">
        {/* Form Panel (Left Side) */}
        {isEditing && (
          <div className="w-[400px] bg-slate-800 border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-6 print:hidden">
            <div className="flex items-center gap-2 text-white border-b border-white/10 pb-4">
              <Plus className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold">Form Pengisian PPD</h4>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-white/40 block mb-1">Divisi/ division :</label>
                {divisiMode === 'select' ? (
                  <select 
                    className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                    value={ppdData.division}
                    onChange={e => {
                      if (e.target.value === 'Lainnya') {
                        setDivisiMode('input');
                        setPpdData({...ppdData, division: ''});
                      } else {
                        setPpdData({...ppdData, division: e.target.value});
                        localStorage.setItem('ppd_pdp_division', e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Pilih Divisi --</option>
                    <option value="Pendistribusian">Pendistribusian</option>
                    <option value="Pendayagunaan">Pendayagunaan</option>
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                      value={ppdData.division} 
                      placeholder="Masukkan Divisi..."
                      onChange={e => {
                        setPpdData({...ppdData, division: e.target.value});
                        localStorage.setItem('ppd_pdp_division', e.target.value);
                      }}
                    />
                    <button 
                      onClick={() => setDivisiMode('select')}
                      className="px-2 bg-white/10 rounded text-xs text-white"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Pemohon/ requested by :</label>
                  {pemohonMode === 'select' ? (
                    <select 
                      className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                      value={ppdData.requestedBy}
                      onChange={e => {
                        if (e.target.value === 'Lainnya') {
                          setPemohonMode('input');
                          setPpdData({...ppdData, requestedBy: ''});
                        } else {
                          setPpdData({...ppdData, requestedBy: e.target.value});
                          localStorage.setItem('ppd_pdp_name', e.target.value);
                        }
                      }}
                    >
                      <option value="">-- Pilih Pemohon --</option>
                      <option value="Satriyanda, SE">Satriyanda, SE</option>
                      <option value="Muslikun Thohari, S.IKOM">Muslikun Thohari, S.IKOM</option>
                      <option value="Ikhlasul Amal, M.Ag">Ikhlasul Amal, M.Ag</option>
                      <option value="Nanag Sujana, S.Hut">Nanag Sujana, S.Hut</option>
                      <option value="Lainnya">Lainnya...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                        value={ppdData.requestedBy} 
                        placeholder="Nama Staff..."
                        onChange={e => {
                          setPpdData({...ppdData, requestedBy: e.target.value});
                          localStorage.setItem('ppd_pdp_name', e.target.value);
                        }}
                      />
                      <button 
                        onClick={() => setPemohonMode('select')}
                        className="px-2 bg-white/10 rounded text-xs text-white"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Jabatan/ function :</label>
                  <select 
                    className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                    value={ppdData.function}
                    onChange={e => {
                      setPpdData({...ppdData, function: e.target.value});
                      localStorage.setItem('ppd_pdp_role', e.target.value);
                    }}
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    <option value="Staff">Staff</option>
                    <option value="Kesubid">Kesubid</option>
                    <option value="Kabid">Kabid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Tujuan Pengajuan/ propose for :</label>
                <textarea 
                  className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm resize-none"
                  rows={2}
                  value={ppdData.proposeFor} 
                  onChange={e => setPpdData({...ppdData, proposeFor: e.target.value, attachment: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Dibayarkan kepada/ paid for :</label>
                <input 
                  className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                  value={ppdData.paidFor} 
                  onChange={e => setPpdData({...ppdData, paidFor: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Mohon dana dikeluarkan :</label>
                <input 
                  className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm italic font-bold"
                  value={ppdData.requestDisbursement} 
                  onChange={e => setPpdData({...ppdData, requestDisbursement: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] text-white/40 block mb-1">Transfer: No. Rek / Bank / Atas nama :</label>
                <input 
                  className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
                  value={ppdData.transferDetails} 
                  onChange={e => setPpdData({...ppdData, transferDetails: e.target.value})}
                  placeholder="e.g. 12345678 / BANK Riau / Nama"
                />
              </div>

              <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                <label className="text-[10px] text-white/40 block mb-2">Jenis Transaksi :</label>
                <div className="grid grid-cols-2 gap-2">
                  {transactionTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setPpdData({...ppdData, transactionType: type})}
                      className={cn(
                        "text-[10px] p-2 rounded border transition-all text-left flex items-center gap-2",
                        ppdData.transactionType === type 
                          ? "bg-amber-500 border-amber-400 text-white" 
                          : "bg-slate-700 border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      {ppdData.transactionType === type ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kamus / Budget Dictionary Section */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Kamus Anggaran</span>
                  </div>
                  <button 
                    onClick={() => {
                      const code = prompt('Kode Anggaran Baru:');
                      const label = prompt('Nama Anggaran Baru:');
                      if (code && label) saveBudgetDictionary([...budgetList, { code, label }]);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all rounded-md text-[9px] font-bold border border-indigo-500/20"
                  >
                    <Plus className="w-2.5 h-2.5" /> Tambah
                  </button>
                </div>

                {budgetList.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {budgetList.map(b => (
                      <div key={b.code} className="group bg-white/5 border border-white/5 rounded-lg p-1.5 hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-emerald-400 font-bold text-[9px] truncate">{b.code}</span>
                            <span className="text-white/60 text-[9px] truncate leading-tight">{b.label}</span>
                          </div>
                          <button 
                            onClick={() => removeBudget(b.code)}
                            className="p-1 text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-center border border-dashed border-white/10 rounded-lg">
                    <span className="text-[9px] text-white/20 italic">Kamus kosong</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Data Anggaran/ Budget</label>
                  <button 
                    onClick={() => {
                        const newRows = [...ppdData.rows, { id: Date.now(), budgetCode: '', classification: '', total: 0 }];
                        setPpdData({...ppdData, rows: newRows});
                    }}
                    className="p-1 hover:bg-white/10 rounded text-amber-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {ppdData.rows.map((row, idx) => (
                    <div key={row.id} className="p-3 bg-slate-900/40 rounded border border-white/5 space-y-2 relative group">
                      <button 
                        onClick={() => {
                          if (ppdData.rows.length > 1) {
                            setPpdData({...ppdData, rows: ppdData.rows.filter(r => r.id !== row.id)});
                          }
                        }}
                        className="absolute right-2 top-2 p-1 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <div>
                        <label className="text-[9px] text-white/40 block mb-1">Kode Anggaran</label>
                        <input 
                          list="budget-codes"
                          className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1 text-white text-xs"
                          value={row.budgetCode} 
                          onBlur={e => {
                            const code = e.target.value;
                            if (code && !budgetList.find(b => b.code === code)) {
                              const newBudget = { code, label: row.classification || 'Budget Baru' };
                              saveBudgetDictionary([...budgetList, newBudget]);
                            }
                          }}
                          onChange={e => {
                            const code = e.target.value;
                            const selected = budgetList.find(b => b.code === code);
                            const newRows = [...ppdData.rows];
                            newRows[idx].budgetCode = code;
                            if (selected) newRows[idx].classification = selected.label;
                            setPpdData({...ppdData, rows: newRows});
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-white/40 block mb-1">Nama Anggaran</label>
                        <textarea 
                          className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1 text-white text-xs resize-none"
                          rows={2}
                          value={row.classification} 
                          onChange={e => {
                            const newRows = [...ppdData.rows];
                            newRows[idx].classification = e.target.value;
                            setPpdData({...ppdData, rows: newRows});
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-white/40 block mb-1">Total (Rp.)</label>
                        <input 
                          type="number"
                          className="w-full bg-slate-700 border border-white/10 rounded px-2 py-1 text-white text-xs font-bold"
                          value={row.total} 
                          onChange={e => {
                            const newRows = [...ppdData.rows];
                            newRows[idx].total = Number(e.target.value);
                            setPpdData({...ppdData, rows: newRows});
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <datalist id="budget-codes">
              {budgetList.map(b => (
                <option key={b.code} value={b.code}>{b.label}</option>
              ))}
            </datalist>

            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Hasil Scan PPD (PDF)</label>
              <div className="flex flex-col gap-2">
                <label className={cn(
                  "w-full flex items-center justify-center gap-2 text-white text-xs font-bold py-2 rounded cursor-pointer transition-colors shadow-lg shadow-indigo-500/20",
                  isUploading ? "bg-slate-600 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
                )}>
                  {isUploading || isLoadingFile ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Upload className="w-3.5 h-3.5" />}
                  {signedPdfUrl ? "Ganti Scan PDF" : "Upload Scan PDF"}
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handlePdfUpload} disabled={isUploading || isLoadingFile} />
                </label>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowQRModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2 rounded-lg cursor-pointer transition-all bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Scan dari HP
                  </button>

                  {signedPdfUrl && (
                    <button 
                      disabled={isUploading}
                      onClick={() => {
                        if(confirm('Hapus file scan dari Cloud?')) handleSavePdfToServer(null);
                      }}
                      className="p-2 px-3 flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded transition-all disabled:opacity-50 text-[10px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-900 flex flex-col items-center print:p-0 print:bg-white pb-32">
          <div className={cn(
            "bg-white w-full max-w-[950px] shadow-2xl p-6 text-black font-sans relative transition-all border border-slate-300 print:shadow-none print:p-4 print:max-w-full mb-16",
            isEditing && "ring-4 ring-amber-500/30"
          )}>
          
          {/* Header */}
          <div className="grid grid-cols-[150px_1fr_150px] gap-2 mb-4">
            <div className="border border-black p-2 flex items-center justify-center relative group">
              {logo ? (
                <img src={logo} alt="Logo" className="max-h-16 object-contain" />
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="w-6 h-6 text-slate-300 mx-auto" />
                </div>
              )}
              <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black/10 flex items-center justify-center transition-all print:hidden">
                <Upload className="w-4 h-4 text-white" />
                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
              </label>
            </div>
            <div className="border border-black p-2 text-center flex flex-col justify-center">
              <h1 className="font-bold text-base leading-tight">PERMOHONAN PENGELUARAN DANA</h1>
              <h2 className="font-bold text-sm leading-tight text-slate-700">(PPD)</h2>
            </div>
            <div className="flex flex-col gap-1">
              <div className="border border-black p-1 text-[10px] font-bold text-center">NORMAL</div>
              <div className="border border-black flex-1 p-1 text-[10px] flex items-center gap-1">
                <span className="font-bold">No.</span>
                {isEditing ? (
                  <input className="flex-1 bg-amber-50 border-none outline-none font-bold" value={ppdData.no} onChange={e => setPpdData({...ppdData, no: e.target.value})} />
                ) : (
                  <span className="font-bold">{ppdData.no}</span>
                )}
              </div>
            </div>
          </div>

          {/* Form Top */}
          <div className="grid grid-cols-2 border border-black text-[10px]">
            <div className="border-r border-black divide-y divide-black">
              <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
                <span>Pemohon/ requested by :</span>
                {isEditing ? (
                  <input 
                    className="bg-amber-50 outline-none w-full" 
                    placeholder="Masukkan Nama Staff..."
                    value={ppdData.requestedBy} 
                    onChange={e => {
                      setPpdData({...ppdData, requestedBy: e.target.value});
                      localStorage.setItem('ppd_pdp_name', e.target.value);
                    }} 
                  />
                ) : (
                  <span className="font-bold">{ppdData.requestedBy || '(Nama Pemohon)'}</span>
                )}
              </div>
              <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
                <span>Jabatan/ funtion :</span>
                {isEditing ? (
                  <input 
                    className="bg-amber-50 outline-none w-full" 
                    placeholder="Masukkan Jabatan..."
                    value={ppdData.function} 
                    onChange={e => {
                      setPpdData({...ppdData, function: e.target.value});
                      localStorage.setItem('ppd_pdp_role', e.target.value);
                    }} 
                  />
                ) : (
                  <span>{ppdData.function}</span>
                )}
              </div>
              <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
                <span>Jumlah Dana/ amount :</span>
                <span className="uppercase font-bold underline italic text-[9px] truncate">
                  {terbilang(totalAmount)}
                </span>
              </div>
              <div className="grid grid-cols-[140px_1fr] h-12 px-2 py-1">
                <span>Tujuan Pengajuan/ propose for :</span>
                {isEditing ? (
                  <textarea 
                    className="bg-amber-50 outline-none resize-none" 
                    rows={2} 
                    value={ppdData.proposeFor} 
                    onChange={e => setPpdData({...ppdData, proposeFor: e.target.value, attachment: e.target.value})} 
                  />
                ) : (
                  <span>{ppdData.proposeFor}</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-black">
              <div className="grid grid-cols-[80px_1fr] h-8 items-center px-2">
                <span>Divisi/ division :</span>
                {isEditing ? (
                  <input className="bg-amber-50 outline-none" value={ppdData.division} onChange={e => setPpdData({...ppdData, division: e.target.value})} />
                ) : (
                  <span>{ppdData.division}</span>
                )}
              </div>
              <div className="grid grid-cols-[80px_1fr] h-8 items-end px-2 pb-1 bg-slate-50">
                <span className="mb-0.5">Tanggal/ date :</span>
                {isEditing ? (
                  <input className="bg-amber-50 outline-none h-6 mb-0.5" value={ppdData.date} onChange={e => setPpdData({...ppdData, date: e.target.value})} />
                ) : (
                  <span className="mb-0.5">{ppdData.date}</span>
                )}
              </div>
              <div className="flex-1"></div>
            </div>
          </div>

          <div className="border-x border-b border-black text-[10px] divide-y divide-black">
            <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
              <span>Dibayarkan kepada/ paid for :</span>
              {isEditing ? (
                <input className="bg-amber-50 outline-none" value={ppdData.paidFor} onChange={e => setPpdData({...ppdData, paidFor: e.target.value})} />
              ) : (
                <span className="font-bold">{ppdData.paidFor}</span>
              )}
            </div>
            <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
              <span>mengacu pada NO. PPD/ refers to :</span>
              {isEditing ? (
                <input className="bg-amber-50 outline-none" value={ppdData.refNo} onChange={e => setPpdData({...ppdData, refNo: e.target.value})} />
              ) : (
                <span>{ppdData.refNo}</span>
              )}
            </div>
            <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
              <span>Mohon Dana Dikeluarkan</span>
              {isEditing ? (
                <input 
                  className="bg-amber-50 outline-none w-full px-2 italic font-bold" 
                  value={ppdData.requestDisbursement} 
                  onChange={e => setPpdData({...ppdData, requestDisbursement: e.target.value})} 
                />
              ) : (
                <span className="font-bold italic px-2">{ppdData.requestDisbursement}</span>
              )}
            </div>
            <div className="grid grid-cols-[140px_1fr] h-8 items-center px-2">
              <span>Transfer : No. Rek / Bank / Atas nama :</span>
              {isEditing ? (
                <input className="bg-amber-50 outline-none" value={ppdData.transferDetails} onChange={e => setPpdData({...ppdData, transferDetails: e.target.value})} />
              ) : (
                <span>{ppdData.transferDetails}</span>
              )}
            </div>
          </div>

          {/* Checkboxes Area */}
          <div className="border-x border-b border-black p-2 flex flex-wrap gap-4 text-[9px] font-bold">
            {transactionTypes.map(type => (
              <div 
                key={type} 
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => isEditing && setPpdData({...ppdData, transactionType: type})}
              >
                {ppdData.transactionType === type ? <CheckSquare className="w-3 h-3 text-indigo-600" /> : <Square className="w-3 h-3 text-slate-300" />}
                <span>{type}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-l border-r border-b border-black text-[9px]">
            <thead>
              <tr className="bg-slate-50">
                <th rowSpan={2} className="border border-black p-1 w-10">No</th>
                <th colSpan={2} className="border border-black p-1">URAIAN/ description</th>
                <th rowSpan={2} className="border border-black p-1 w-24">Total (Rp.)</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-black p-1">Kode Anggaran/ budget code</th>
                <th className="border border-black p-1">Nama Anggaran/ budget classification</th>
              </tr>
            </thead>
            <tbody>
              {ppdData.rows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <select 
                          className="w-full bg-amber-50 outline-none text-[8px]"
                          value={row.budgetCode}
                          onChange={e => {
                            const selected = budgetList.find(b => b.code === e.target.value);
                            const newRows = [...ppdData.rows];
                            newRows[idx].budgetCode = e.target.value;
                            if (selected) newRows[idx].classification = selected.label;
                            setPpdData({...ppdData, rows: newRows});
                          }}
                        >
                          <option value="">-- Pilih Kode --</option>
                          {budgetList.map(b => (
                            <option key={b.code} value={b.code}>{b.code} - {b.label}</option>
                          ))}
                        </select>
                        <input className="w-full bg-amber-50 outline-none border-t border-amber-200" value={row.budgetCode} onChange={e => {
                          const newRows = [...ppdData.rows];
                          newRows[idx].budgetCode = e.target.value;
                          setPpdData({...ppdData, rows: newRows});
                        }} />
                      </div>
                    ) : (
                      <span>{row.budgetCode}</span>
                    )}
                  </td>
                  <td className="border border-black p-1 min-h-[40px] group relative">
                    {isEditing ? (
                      <textarea className="w-full bg-amber-50 outline-none resize-none" rows={2} value={row.classification} onChange={e => {
                        const newRows = [...ppdData.rows];
                        newRows[idx].classification = e.target.value;
                        setPpdData({...ppdData, rows: newRows});
                      }} />
                    ) : (
                      <span>{row.classification}</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-right font-bold">
                    {isEditing ? (
                      <input type="number" className="w-full bg-amber-50 outline-none text-right font-bold" value={row.total} onChange={e => {
                        const newRows = [...ppdData.rows];
                        newRows[idx].total = Number(e.target.value);
                        setPpdData({...ppdData, rows: newRows});
                      }} />
                    ) : (
                      <span>{row.total.toLocaleString('id-ID')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Padding rows */}
              <tr>
                <td className="border border-black p-1 h-32"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr className="font-bold">
                <td colSpan={3} className="border-t border-black text-right pr-2 py-1">Rp</td>
                <td className="border border-black p-1 text-right">{totalAmount.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer Grid */}
          <div className="grid grid-cols-[120px_1fr_200px_100px] border-x border-b border-black text-[9px]">
            <div className="border-r border-black divide-y divide-black">
              <div className="h-10 p-1 flex items-end font-bold text-black text-[10px]">Tanggal/ date</div>
              <div className="h-20 p-1">Tanda Tangan/ sign</div>
              <div className="h-6 p-1">Nama/ name</div>
              <div className="h-6 p-1">Jabatan/ funtion</div>
            </div>
            <div className="divide-y divide-black">
              <div className="grid grid-cols-4 divide-x divide-black h-full">
                <div className="flex flex-col">
                  <div className="h-10 border-b border-black p-1 text-center font-bold relative">
                    Pemohon/ requested by
                    <div className="absolute bottom-0 left-0 right-0 h-4 border-t border-black/10 text-[9px] font-medium text-black leading-none flex items-center justify-center">Tgl: {ppdData.date}</div>
                  </div>
                  <div className="h-20 border-b border-black"></div>
                  <div className="h-6 border-b border-black p-1 font-bold text-center">
                    {isEditing ? (
                      <input 
                        className="w-full bg-amber-50 text-center outline-none" 
                        value={ppdData.requestedBy} 
                        onChange={e => {
                          const val = e.target.value;
                          setPpdData({...ppdData, requestedBy: val, signers: {...ppdData.signers, staff: {...ppdData.signers.staff, name: val}}});
                          localStorage.setItem('ppd_pdp_name', val);
                        }} 
                      />
                    ) : (
                      <span>{ppdData.requestedBy}</span>
                    )}
                  </div>
                  <div className="h-6 p-1 text-center">
                    {isEditing ? (
                      <input 
                        className="w-full bg-amber-50 text-center outline-none" 
                        value={ppdData.function} 
                        onChange={e => {
                          const val = e.target.value;
                          setPpdData({...ppdData, function: val, signers: {...ppdData.signers, staff: {...ppdData.signers.staff, role: val}}});
                          localStorage.setItem('ppd_pdp_role', val);
                        }} 
                      />
                    ) : (
                      <span>{ppdData.function}</span>
                    )}
                  </div>
                </div>
                <div className="col-span-3 flex flex-col">
                  <div className="h-10 border-b border-black p-1 text-center font-bold">
                    Disetujui Oleh/ approved by
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-black flex-1">
                    <div className="flex flex-col divide-y divide-black">
                      <div className="h-20 flex flex-col justify-end p-1 text-center"></div>
                      <div className="h-6 p-1 font-bold text-center">
                        {isEditing ? (
                          <input className="w-full bg-amber-50 text-center outline-none" value={ppdData.signers.kabid.name} onChange={e => setPpdData({...ppdData, signers: {...ppdData.signers, kabid: {...ppdData.signers.kabid, name: e.target.value}}})} />
                        ) : (
                          <span className="text-[8px]">{ppdData.signers.kabid.name}</span>
                        )}
                      </div>
                      <div className="h-6 p-1 text-center">{ppdData.signers.kabid.role}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-black">
                      <div className="h-20 flex flex-col justify-end p-1 text-center"></div>
                      <div className="h-6 p-1 font-bold text-center">
                         {isEditing ? (
                          <input className="w-full bg-amber-50 text-center outline-none" value={ppdData.signers.waka.name} onChange={e => setPpdData({...ppdData, signers: {...ppdData.signers, waka: {...ppdData.signers.waka, name: e.target.value}}})} />
                        ) : (
                          <span className="text-[8px]">{ppdData.signers.waka.name}</span>
                        )}
                      </div>
                      <div className="h-6 p-1 text-center">{ppdData.signers.waka.role}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-black">
                      <div className="h-20 flex flex-col justify-end p-1 text-center"></div>
                      <div className="h-6 p-1 font-bold text-center">
                         {isEditing ? (
                          <input className="w-full bg-amber-50 text-center outline-none" value={ppdData.signers.ketua.name} onChange={e => setPpdData({...ppdData, signers: {...ppdData.signers, ketua: {...ppdData.signers.ketua, name: e.target.value}}})} />
                        ) : (
                          <span className="text-[8px] text-center">{ppdData.signers.ketua.name}</span>
                        )}
                      </div>
                      <div className="h-6 p-1 text-center">{ppdData.signers.ketua.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-l border-black divide-y divide-black flex flex-col">
              <div className="h-10 p-1 text-center font-bold">
                Divisi Keuangan
              </div>
              <div className="grid grid-cols-2 divide-x divide-black h-[106px] border-b border-black">
                <div className="flex flex-col">
                  <div className="p-1 h-10 border-b border-black text-center text-[8px]">Pemeriksa/ checked by</div>
                  <div className="flex-1 border-b border-black"></div>
                  <div className="h-6 p-1 text-center flex items-center justify-center">
                    {isEditing && (
                      <input className="w-full bg-amber-50 text-center outline-none" value={ppdData.signers.finance1.name} onChange={e => setPpdData({...ppdData, signers: {...ppdData.signers, finance1: {...ppdData.signers.finance1, name: e.target.value}}})} />
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="p-1 h-10 border-b border-black text-center text-[8px]">Disetujui Oleh/ approved by</div>
                  <div className="flex-1 border-b border-black"></div>
                  <div className="h-6 p-1 text-center flex items-center justify-center">
                    {isEditing && (
                      <input className="w-full bg-amber-50 text-center outline-none" value={ppdData.signers.finance2.name} onChange={e => setPpdData({...ppdData, signers: {...ppdData.signers, finance2: {...ppdData.signers.finance2, name: e.target.value}}})} />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1"></div>
            </div>
            <div className="border-l border-black flex flex-col items-center">
              <div className="p-1 text-center font-bold h-10 border-b border-black w-full">Lampiran/ attachment</div>
              <div className="flex-1 flex items-center justify-center text-center p-1 leading-tight overflow-hidden">
                {isEditing ? (
                  <textarea 
                    className="w-full h-full bg-amber-50 outline-none text-[8px] resize-none" 
                    value={ppdData.attachment} 
                    onChange={e => setPpdData({...ppdData, attachment: e.target.value})} 
                  />
                ) : (
                  <span className="text-[10px] italic">{ppdData.attachment}</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 border-x border-b border-black text-[9px] min-h-[40px]">
            <div className="border-r border-black p-1">
              <span className="font-bold">Note :</span>
              {isEditing ? (
                <textarea className="w-full bg-amber-50 outline-none resize-none" rows={2} value={ppdData.note} onChange={e => setPpdData({...ppdData, note: e.target.value})} />
              ) : (
                <div className="mt-1">{ppdData.note}</div>
              )}
            </div>
            <div className="p-1">
              <span className="font-bold italic">Note (finane only)</span>
              {isEditing ? (
                <textarea className="w-full bg-amber-50 outline-none resize-none" rows={2} value={ppdData.noteFinance} onChange={e => setPpdData({...ppdData, noteFinance: e.target.value})} />
              ) : (
                <div className="mt-1">{ppdData.noteFinance}</div>
              )}
            </div>
          </div>

        </div>

        {/* PDF Upload Section */}
        <div className="w-full max-w-[950px] flex flex-col gap-8 mt-4 print:hidden">
          {!signedPdfUrl ? (
            <div className="p-12 border-4 border-dashed border-white/10 rounded-3xl flex flex-col items-center gap-6 bg-white/5 hover:bg-white/[0.07] transition-all group">
              <div className="p-6 bg-indigo-500/20 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Upload Hasil Scan PPD</h3>
                <p className="text-white/40 text-sm max-w-sm mx-auto">
                  Silahkan upload file PPD yang sudah dicetak dan ditandatangani basah dalam format PDF.
                </p>
              </div>
              <label className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Pilih File PDF
                <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-6 py-3 bg-slate-800 rounded-xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <FileCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">HASIL SCAN PPD (SIGNED PDF)</p>
                    <p className="text-white/40 text-[10px]">File tersimpan secara lokal di browser ini</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={openPdfInNewTab}
                    className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Tab Baru
                  </button>
                  <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                    Ganti File
                    <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                  </label>
                  <button 
                    onClick={() => {
                      if(confirm('Hapus hasil scan ini?')) setSignedPdfUrl(null);
                    }}
                    className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="w-full h-[800px] border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-white/5 p-1 relative">
                <object 
                  data={signedPdfBlobUrl || signedPdfUrl || ''} 
                  type="application/pdf"
                  className="w-full h-full rounded-xl bg-slate-100"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-slate-800 rounded-xl">
                    <FileText className="w-12 h-12 text-white/20 mb-4" />
                    <p className="text-white font-bold mb-2">Pratinjau Tidak Tersedia</p>
                    <p className="text-white/40 text-sm mb-6">Browser Anda memblokir pratinjau PDF otomatis atau file terlalu besar.</p>
                    <a 
                      href={signedPdfUrl || ''} 
                      download={`PPD_Signed_${recipient.registrationId}.pdf`}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg"
                    >
                      Unduh & Lihat PDF
                    </a>
                  </div>
                </object>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!isEditing && (
          <p className="text-white/40 text-[10px] mt-6 italic print:hidden border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
            Gunakan tombol "Edit PPD" untuk menyesuaikan detail Permohonan Pengeluaran Dana
          </p>
        )}
      </div>
    </div>
  </div>
  );
}
