import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, Trash2, CheckCircle2, Circle, Save, X, Edit2,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { 
  streamMonthlyPayments, 
  saveMonthlyPayment, 
  updateMonthlyPayment, 
  deleteMonthlyPayment,
  auth
} from '../firebase';
import { MonthlyPayment } from '../types';
import { cn } from '../lib/utils';

interface MonthlyPaymentTableProps {
  sector: string;
}

export default function MonthlyPaymentTable({ sector }: MonthlyPaymentTableProps) {
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Form State
  const [formData, setFormData] = useState<Partial<MonthlyPayment>>({
    sector: sector,
    programName: '',
    registrationId: '',
    asnaf: 'Fisabilillah',
    name: '',
    nik: '',
    contact: '',
    level: 'Lainnya',
    schoolName: '',
    disbursementDate: new Date().toISOString().split('T')[0],
    budget: 0,
    fundingSource: 'Baznas Siak',
    bankAccountNo: '',
    bankAccountName: '',
    bankName: '',
    monthControl: new Date().getFullYear().toString(),
    january: false,
    februari: false,
    maret: false,
    april: false,
    mei: false,
    juni: false,
    juli: false,
    agustus: false,
    september: false,
    oktober: false,
    november: false,
    desember: false
  });

  const [displayBudget, setDisplayBudget] = useState('0');

  useEffect(() => {
    // Safety check: only start listeners if we have an active session
    if (!auth.currentUser) return;

    const unsubscribe = streamMonthlyPayments(sector, setPayments);
    return () => unsubscribe();
  }, [sector]);

  // Extract unique values for suggestions from current sector payments
  const programSuggestions = Array.from(new Set(payments.map(p => p.programName))).filter(Boolean) as string[];
  const bankSuggestions = Array.from(new Set(payments.map(p => p.bankName))).filter(Boolean) as string[];
  const asnafSuggestions = Array.from(new Set(payments.map(p => p.asnaf))).filter(Boolean) as string[];
  const levelSuggestions = Array.from(new Set(payments.map(p => p.level))).filter(Boolean) as string[];
  const fundingSuggestions = Array.from(new Set(payments.map(p => p.fundingSource))).filter(Boolean) as string[];

  const filteredPayments = payments.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.programName.toLowerCase().includes(search.toLowerCase()) ||
    p.registrationId.toLowerCase().includes(search.toLowerCase())
  );

  const generateAutoId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    // Use sector initials for ID
    const prefix = sector.split(' ').map(w => w[0]).join('').toUpperCase();
    return `${prefix}M-${year}${month}${day}-${random}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMonthlyPayment(editingId, formData);
        setEditingId(null);
      } else {
        await saveMonthlyPayment({
          ...formData,
          sector, // Ensure sector is set
          registrationId: formData.registrationId || generateAutoId()
        } as any);
      }
      setIsAdding(false);
      resetForm();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Gagal menyimpan data');
    }
  };

  const resetForm = () => {
    setFormData({
      sector: sector,
      programName: '',
      registrationId: generateAutoId(),
      asnaf: 'Fisabilillah',
      name: '',
      nik: '',
      contact: '',
      level: sector === 'Siak Cerdas' ? 'Mahasiswa' : 'Lainnya',
      schoolName: '',
      disbursementDate: new Date().toISOString().split('T')[0],
      budget: 0,
      fundingSource: 'Baznas Siak',
      bankAccountNo: '',
      bankAccountName: '',
      bankName: '',
      monthControl: new Date().getFullYear().toString(),
      january: false,
      februari: false,
      maret: false,
      april: false,
      mei: false,
      juni: false,
      juli: false,
      agustus: false,
      september: false,
      oktober: false,
      november: false,
      desember: false
    });
    setDisplayBudget('0');
  };

  const handleBudgetChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    const num = Number(numeric);
    setFormData({ ...formData, budget: num });
    setDisplayBudget(num.toLocaleString('id-ID'));
  };

  const handleToggleMonth = async (paymentId: string, month: keyof MonthlyPayment, currentVal: any) => {
    try {
      await updateMonthlyPayment(paymentId, { [month]: !currentVal });
    } catch (error) {
      console.error('Error updating month:', error);
    }
  };

  const handleEdit = (payment: MonthlyPayment) => {
    setFormData(payment);
    setEditingId(payment.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus data ini?')) {
      await deleteMonthlyPayment(id);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const months: (keyof MonthlyPayment)[] = [
    'january', 'februari', 'maret', 'april', 'mei', 'juni', 
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Program Bulanan - {sector}
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari data..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setIsAdding(true); resetForm(); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">{editingId ? 'Edit Data Pembayaran' : `Tambah Penerima Bantuan Bulanan ${sector}`}</h3>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Program</label>
                <input 
                  required
                  list="program-list"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                  value={formData.programName}
                  onChange={e => setFormData({...formData, programName: e.target.value})}
                  placeholder="Contoh: Beasiswa Mahasiswa"
                />
                <datalist id="program-list">
                  {programSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Registrasi (Otomatis)</label>
                <input 
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-500 cursor-not-allowed shadow-none"
                  value={formData.registrationId || (editingId ? '' : generateAutoId())}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asnaf</label>
                <input 
                  list="asnaf-list"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                  value={formData.asnaf}
                  onChange={e => setFormData({...formData, asnaf: e.target.value})}
                />
                <datalist id="asnaf-list">
                  {['Fisabilillah', 'Fakir', 'Miskin', 'Ghorimin', 'Mualaf'].map(s => <option key={s} value={s} />)}
                  {asnafSuggestions.filter(s => !['Fisabilillah', 'Fakir', 'Miskin', 'Ghorimin', 'Mualaf'].includes(s)).map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
              <input 
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIK</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono shadow-sm"
                value={formData.nik}
                onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g, '')})}
                maxLength={16}
                placeholder="16 digit NIK"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. HP</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono shadow-sm"
                value={formData.contact}
                onChange={e => setFormData({...formData, contact: e.target.value})}
                placeholder="08..."
              />
            </div>
            
            {sector === 'Siak Cerdas' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tingkatan</label>
                  <input 
                    list="level-list"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                  />
                  <datalist id="level-list">
                    {['Mahasiswa', 'SMA', 'SMP', 'SD'].map(s => <option key={s} value={s} />)}
                    {levelSuggestions.filter(s => !['Mahasiswa', 'SMA', 'SMP', 'SD'].includes(s)).map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Sekolah/Universitas</label>
                  <input 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                    value={formData.schoolName}
                    onChange={e => setFormData({...formData, schoolName: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Penyaluran</label>
              <input 
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                value={formData.disbursementDate}
                onChange={e => setFormData({...formData, disbursementDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Anggaran (Rp)</label>
              <input 
                type="text"
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-bold text-indigo-600 shadow-sm"
                value={displayBudget === '0' && editingId ? formData.budget?.toLocaleString('id-ID') : displayBudget}
                onChange={e => handleBudgetChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sumber Dana</label>
              <input 
                list="funding-list"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                value={formData.fundingSource}
                onChange={e => setFormData({...formData, fundingSource: e.target.value})}
              />
              <datalist id="funding-list">
                {['Baznas Siak', 'UPZ', 'Hibah'].map(s => <option key={s} value={s} />)}
                {fundingSuggestions.filter(s => !['Baznas Siak', 'UPZ', 'Hibah'].includes(s)).map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Rekening (Maks 16 Digit)</label>
              <input 
                maxLength={16}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono shadow-sm"
                value={formData.bankAccountNo}
                onChange={e => setFormData({...formData, bankAccountNo: e.target.value.replace(/\D/g, '')})}
                placeholder="Contoh: 1234567890"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pemilik Rekening</label>
              <input 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                value={formData.bankAccountName}
                onChange={e => setFormData({...formData, bankAccountName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Bank</label>
              <input 
                list="bank-list"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                value={formData.bankName}
                onChange={e => setFormData({...formData, bankName: e.target.value})}
                placeholder="Contoh: Bank Riau Kepri Syariah"
              />
              <datalist id="bank-list">
                {['Bank Riau Kepri Syariah', 'BSI', 'Bank Jateng Syariah', 'Bank Muamalat'].map(s => <option key={s} value={s} />)}
                {bankSuggestions.filter(s => !['Bank Riau Kepri Syariah', 'BSI', 'Bank Jateng Syariah', 'Bank Muamalat'].includes(s)).map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="col-span-full flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Simpan Data
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-10 pl-6 pr-2 py-4 border-b border-slate-100"></th>
                <th className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">No. Registrasi</th>
                <th className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Nama Program</th>
                <th className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Asnaf</th>
                <th className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Kontrol</th>
                {months.map(m => (
                  <th key={m} className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-center whitespace-nowrap">
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </th>
                ))}
                <th className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[px-0_0_0_1px_rgba(0,0,0,0.05)]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length > 0 ? filteredPayments.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className={cn(
                    "hover:bg-slate-50/50 transition-colors group",
                    expandedRows[p.id] && "bg-slate-50/80"
                  )}>
                    <td className="pl-6 pr-2 py-4 text-center">
                      <button 
                        onClick={() => toggleRow(p.id)}
                        className={cn(
                          "p-1 rounded-md transition-all hover:bg-slate-200",
                          expandedRows[p.id] ? "text-indigo-600 bg-indigo-50" : "text-slate-400"
                        )}
                      >
                        {expandedRows[p.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600 whitespace-nowrap">{p.registrationId}</td>
                    <td className="px-2 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {p.programName}
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600 whitespace-nowrap">{p.asnaf}</td>
                    <td className="px-2 py-4 text-sm text-slate-600 whitespace-nowrap">{p.monthControl}</td>
                    {months.map(m => (
                      <td key={m} className="px-2 py-4 text-center">
                        <button 
                          onClick={() => handleToggleMonth(p.id, m, p[m])}
                          className={cn(
                            "p-1 rounded-md transition-all",
                            p[m] ? "text-green-600 bg-green-50 scale-110" : "text-slate-200 hover:text-slate-300"
                          )}
                        >
                          {p[m] ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 fill-current" />}
                        </button>
                      </td>
                    ))}
                    <td className="px-2 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[p.id] && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={18} className="px-4 py-3">
                        <div className="flex items-center gap-8 p-4 bg-white rounded-xl border border-slate-200 shadow-inner animate-in fade-in slide-in-from-top-1 duration-200 overflow-x-auto whitespace-nowrap">
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nama Penerima</label>
                            <p className="text-sm text-slate-800">{p.name}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">NIK</label>
                            <p className="text-sm font-mono text-slate-600">{p.nik || '-'}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">No. HP</label>
                            <p className="text-sm text-slate-600">{p.contact || '-'}</p>
                          </div>
                          {sector === 'Siak Cerdas' && (
                            <>
                              <div className="flex-shrink-0 min-w-fit">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tingkatan</label>
                                <p className="text-sm text-slate-600">{p.level}</p>
                              </div>
                              <div className="flex-shrink-0 min-w-fit">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Sekolah / Univ</label>
                                <p className="text-sm text-slate-600">{p.schoolName || '-'}</p>
                              </div>
                            </>
                          )}
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Anggaran</label>
                            <p className="text-sm text-green-600">Rp {p.budget?.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Sumber Dana</label>
                            <p className="text-sm text-slate-600">{p.fundingSource}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">No. Rekening</label>
                            <p className="text-sm font-mono text-slate-600">{p.bankAccountNo || '-'}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nama Rekening</label>
                            <p className="text-sm text-slate-600">{p.bankAccountName || '-'}</p>
                          </div>
                          <div className="flex-shrink-0 min-w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Bank</label>
                            <p className="text-sm text-slate-600">{p.bankName || '-'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={18} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Belum ada data pembayaran bulanan {sector}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
