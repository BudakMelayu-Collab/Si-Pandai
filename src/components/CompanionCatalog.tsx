import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Trash2, Calendar, User, 
  Image as ImageIcon, Download, X, AlertCircle,
  CloudUpload, LayoutGrid, List, Eye, ClipboardList, Search
} from 'lucide-react';
import { 
  streamCompanionReports, 
  saveCompanionReport, 
  deleteCompanionReport, 
  saveRecipient,
  CompanionReport,
  auth
} from '../firebase';
import { Recipient } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CompanionCatalogProps {
  companionId: string;
  companionName: string;
  recipients: Recipient[];
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function CompanionCatalog({ companionId, companionName, recipients }: CompanionCatalogProps) {
  const [reports, setReports] = useState<CompanionReport[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSubTab, setActiveSubTab] = useState<'monthly' | 'program' | 'recipients'>('monthly');
  const [searchTerm, setSearchTerm] = useState('');

  // New Recipient Form State
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    nik: '',
    kk: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    address: '',
    sector: 'Siak Peduli',
    programName: '',
    amountProposed: 0,
    contact: '',
    submissionDate: new Date().toISOString().split('T')[0]
  });

  const [isSubmittingRecipient, setIsSubmittingRecipient] = useState(false);

  const handleCreateRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRecipient(true);
    try {
      await saveRecipient({
        ...recipientForm,
        companion: companionName,
        status: 'Proses Berkas',
        registrationId: `REG-${Date.now()}`,
        source: 'Pendamping Program',
        notes: '',
        documents: [],
        isTermsAccepted: true
      });
      setIsAddingRecipient(false);
      setRecipientForm({
        name: '',
        nik: '',
        kk: '',
        gender: 'Laki-laki',
        address: '',
        sector: 'Siak Peduli',
        programName: '',
        amountProposed: 0,
        contact: '',
        submissionDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert('Gagal menambah penerima: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmittingRecipient(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.reportType === (activeSubTab === 'program' ? 'Program' : 'Bulanan')
  );

  const filteredRecipients = recipients.filter(r => 
    r.companion === companionName && 
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.nik.includes(searchTerm) || 
     r.programName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    sector: 'Siak Peduli',
    coverUrl: '',
    fileUrl: ''
  });

  useEffect(() => {
    // Safety check: only start listeners if we have an active session
    if (!auth.currentUser) return;

    const unsubscribe = streamCompanionReports(companionId, setReports);
    return () => unsubscribe();
  }, [companionId]);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'coverUrl' | 'fileUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit check (Firestore doc limit is 1MB, so we keep files small)
    if (file.size > 800 * 1024) {
      alert(`File "${file.name}" terlalu besar. Maksimal ukuran file adalah 800KB untuk memastikan penyimpanan stabil.`);
      e.target.value = '';
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFormData(prev => ({ ...prev, [field]: base64 }));
    } catch (error) {
      console.error('Error converting file:', error);
      alert('Gagal memproses file.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.coverUrl) {
      alert('Silakan upload cover gambar terlebih dahulu.');
      return;
    }
    try {
      const reportType = activeSubTab === 'program' ? 'Program' : 'Bulanan';
      await saveCompanionReport({
        companionId,
        companionName,
        reportType,
        ...formData,
        // Ensure month is empty if it's a Program report
        month: reportType === 'Program' ? '' : formData.month
      });
      setIsUploading(false);
      setFormData(prev => ({
        ...prev,
        title: '',
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear(),
        coverUrl: '',
        fileUrl: ''
      }));
    } catch (error) {
      alert('Gagal mengunggah laporan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      try {
        await deleteCompanionReport(id);
      } catch (error) {
        alert('Gagal menghapus: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const openInNewTab = (dataUrl: string, title: string) => {
    try {
      // Split header from content
      const [header, base64Data] = dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      
      // Convert base64 to binary
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Create a temporary link and click it to open in new tab
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // link.download = `${title}.pdf`; // Optional: uncomment if you want to force download instead of view
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke after a delay to clean up memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error opening file:', error);
      // Fallback: try opening directly if blob conversion fails
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        win.document.title = title;
      } else {
        alert('Pop-up diblokir. Silakan izinkan pop-up untuk aplikasi ini.');
      }
    }
  };

  const handlePreview = (report: CompanionReport) => {
    const url = report.fileUrl || report.coverUrl;
    if (url) {
      openInNewTab(url, report.title);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Katalog Laporan</h1>
            <p className="text-slate-500 font-medium">Data Pendamping: <span className="text-indigo-600">{companionName}</span></p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start overflow-x-auto max-w-full">
            <button 
              onClick={() => { setActiveSubTab('monthly'); setIsUploading(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeSubTab === 'monthly' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <FileText className="w-4 h-4" />
              Laporan Bulanan
            </button>
            <button 
              onClick={() => { setActiveSubTab('program'); setIsUploading(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeSubTab === 'program' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              Laporan Program
            </button>
            <button 
              onClick={() => { setActiveSubTab('recipients'); setIsUploading(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                activeSubTab === 'recipients' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <User className="w-4 h-4" />
              Penerima Didampingi
            </button>
          </div>
        </div>

        {activeSubTab !== 'recipients' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-slate-100 text-indigo-600 shadow-inner" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-slate-100 text-indigo-600 shadow-inner" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm whitespace-nowrap">
                {filteredReports.length} Laporan {activeSubTab === 'monthly' ? 'Bulanan' : 'Program'}
              </div>
              
              <button 
                onClick={() => setIsUploading(!isUploading)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg scale-100 hover:scale-105 active:scale-95 whitespace-nowrap",
                  isUploading 
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-slate-100" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                )}
              >
                {isUploading ? <X className="w-5 h-5" /> : <CloudUpload className="w-5 h-5" />}
                <span>{isUploading ? 'Batal' : `Upload ${activeSubTab === 'program' ? 'Laporan Program' : 'Laporan Bulanan'}`}</span>
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'recipients' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari nama, NIK, atau nama program..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="hidden sm:block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm whitespace-nowrap">
                  Total: {filteredRecipients.length} Penerima
                </div>
                <button 
                  onClick={() => setIsAddingRecipient(!isAddingRecipient)}
                  className={cn(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg scale-100 hover:scale-105 active:scale-95 whitespace-nowrap",
                    isAddingRecipient 
                      ? "bg-slate-100 text-slate-600 shadow-slate-100" 
                      : "bg-indigo-600 text-white shadow-indigo-100"
                  )}
                >
                  {isAddingRecipient ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{isAddingRecipient ? 'Batal' : 'Tambah Penerima'}</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isAddingRecipient && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleCreateRecipient} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-50">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Form Data Penerima Baru</h3>
                        <p className="text-xs text-slate-400 font-medium">Data akan langsung terhubung ke {companionName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="Nama lengkap..."
                          value={recipientForm.name}
                          onChange={e => setRecipientForm({...recipientForm, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">NIK (16 Digit)</label>
                        <input 
                          required
                          maxLength={16}
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="Nomor Induk Kependudukan..."
                          value={recipientForm.nik}
                          onChange={e => setRecipientForm({...recipientForm, nik: e.target.value.replace(/\D/g, '')})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nomor KK</label>
                        <input 
                          required
                          maxLength={16}
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="Nomor Kartu Keluarga..."
                          value={recipientForm.kk}
                          onChange={e => setRecipientForm({...recipientForm, kk: e.target.value.replace(/\D/g, '')})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Jenis Kelamin</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          value={recipientForm.gender}
                          onChange={e => setRecipientForm({...recipientForm, gender: e.target.value as any})}
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Alamat Lengkap</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="Alamat domisili..."
                          value={recipientForm.address}
                          onChange={e => setRecipientForm({...recipientForm, address: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Bidang Bantuan</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          value={recipientForm.sector}
                          onChange={e => setRecipientForm({...recipientForm, sector: e.target.value})}
                        >
                          <option value="Siak Cerdas">Siak Cerdas</option>
                          <option value="Siak Dakwah">Siak Dakwah</option>
                          <option value="Siak Peduli">Siak Peduli</option>
                          <option value="Siak Sehat">Siak Sehat</option>
                          <option value="Siak Sejahtera">Siak Sejahtera</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nama Program</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="Nama program..."
                          value={recipientForm.programName}
                          onChange={e => setRecipientForm({...recipientForm, programName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nominal Diajukan (Rp)</label>
                        <input 
                          required
                          type="number" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="0"
                          value={recipientForm.amountProposed || ''}
                          onChange={e => setRecipientForm({...recipientForm, amountProposed: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">No. HP / WhatsApp</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                          placeholder="0812..."
                          value={recipientForm.contact}
                          onChange={e => setRecipientForm({...recipientForm, contact: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                      <button 
                        type="button"
                        onClick={() => setIsAddingRecipient(false)}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingRecipient}
                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSubmittingRecipient ? 'Menyimpan...' : 'Simpan Data Penerima'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {activeSubTab !== 'recipients' ? (
        <>
          <AnimatePresence>
            {isUploading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-50 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Form Upload {activeSubTab === 'program' ? 'Laporan Program' : 'Laporan Bulanan'}</h2>
              </div>
              <button 
                onClick={() => setIsUploading(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  Judul Laporan
                </label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  placeholder={activeSubTab === 'program' ? "Judul Laporan Program..." : "Contoh: Laporan Kinerja Januari"}
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {activeSubTab === 'monthly' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Bulan</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                    value={formData.month}
                    onChange={e => setFormData({...formData, month: e.target.value})}
                  >
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tahun</label>
                <input 
                  required
                  type="number" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  value={formData.year}
                  onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Bidang (Sektor)</label>
                <select 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  value={formData.sector}
                  onChange={e => setFormData({...formData, sector: e.target.value})}
                >
                  <option value="Siak Cerdas">Siak Cerdas</option>
                  <option value="Siak Dakwah">Siak Dakwah</option>
                  <option value="Siak Peduli">Siak Peduli</option>
                  <option value="Siak Sehat">Siak Sehat</option>
                  <option value="Siak Sejahtera">Siak Sejahtera</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  Cover Gambar (Upload)
                </label>
                <div className="relative group/file">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => handleFileChange(e, 'coverUrl')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "w-full px-4 py-2.5 bg-slate-50 border-2 border-dashed rounded-xl flex items-center gap-3 transition-all",
                    formData.coverUrl ? "border-green-200 bg-green-50/30" : "border-slate-200 group-hover/file:border-indigo-300"
                  )}>
                    {formData.coverUrl ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-green-200">
                        <img src={formData.coverUrl} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-500 truncate">
                      {formData.coverUrl ? "Gambar terpilih" : "Pilih gambar cover..."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 lg:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase">File Laporan (Upload)</label>
                <div className="relative group/file">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={e => handleFileChange(e, 'fileUrl')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "w-full px-4 py-2.5 bg-slate-50 border-2 border-dashed rounded-xl flex items-center gap-3 transition-all",
                    formData.fileUrl ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 group-hover/file:border-indigo-300"
                  )}>
                    <CloudUpload className={cn("w-5 h-5", formData.fileUrl ? "text-indigo-600" : "text-slate-400")} />
                    <span className="text-xs font-bold text-slate-500 truncate">
                      {formData.fileUrl ? "File laporan siap diunggah" : "Pilih file laporan (PDF/DOC)..."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 flex items-end">
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Simpan Laporan
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Belum Ada Laporan</h3>
          <p className="text-slate-500 max-w-sm mb-8 font-medium">Klik tombol "Upload Laporan" untuk menambahkan laporan pertama Anda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredReports.map((report) => (
            <motion.div 
              layout
              key={report.id}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                <img 
                  src={report.coverUrl} 
                  alt={report.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                  onError={(e) => {
                    e.currentTarget.src = `https://via.placeholder.com/300x400?text=${report.month}+${report.year}`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <div className="flex flex-col gap-2 w-full max-w-[140px]">
                    <button 
                      onClick={() => handlePreview(report)}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all scale-100 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Pratinjau
                    </button>
                    <div className="flex gap-2">
                      {report.fileUrl && (
                        <button 
                          onClick={() => handlePreview(report)}
                          className="flex-1 bg-white text-slate-800 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => report.id && handleDelete(report.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  {report.year}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {report.reportType === 'Program' ? 'Program' : report.month}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{report.title}</h3>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold truncate">{report.companionName}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="pl-6 pr-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Judul Laporan</th>
                  <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Periode</th>
                <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Diunggah Pada</th>
                <th className="px-1 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="pl-6 pr-1 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                        <img src={report.coverUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{report.title}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{report.companionName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">
                        {report.reportType === 'Program' ? `Laporan Program ${report.year}` : `${report.month} ${report.year}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-4">
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(report.uploadedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </span>
                  </td>
                  <td className="px-1 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">{report.sector}</span>
                    </div>
                  </td>
                  <td className="px-1 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handlePreview(report)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Pratinjau Laporan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.fileUrl && (
                        <button 
                          onClick={() => handlePreview(report)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Buka Laporan"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => report.id && handleDelete(report.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Report"
                      >
                       <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  ) : (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="pl-6 pr-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Penerima Bantuan</th>
                  <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Bidang / Program</th>
                  <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Status</th>
                  <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Kontak</th>
                  <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Tanggal Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Data tidak ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="pl-6 pr-1 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                            {recipient.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{recipient.name}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{recipient.nik}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{recipient.programName}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">{recipient.sector}</p>
                        </div>
                      </td>
                      <td className="px-1 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          recipient.status === 'Disetujui' ? "bg-green-100 text-green-700" :
                          recipient.status === 'Ditolak' ? "bg-red-100 text-red-700" :
                          recipient.status === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {recipient.status}
                        </span>
                      </td>
                      <td className="px-1 py-4">
                        <p className="text-xs font-bold text-slate-600">{recipient.contact}</p>
                      </td>
                      <td className="px-1 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(recipient.submissionDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
