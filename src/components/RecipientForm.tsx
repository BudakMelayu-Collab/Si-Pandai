import React, { useState, useEffect } from 'react';
import { 
  Save, X, Upload, FileText, Image as ImageIcon, 
  MapPin, User, Hash, Phone, Calendar, DollarSign, CheckCircle2,
  Plus, Trash2, Layers, AlertCircle
} from 'lucide-react';
import { SIAK_REGIONAL_DATA, SIAK_SECTORS, SIAK_AID_TYPES, SIAK_PROGRAM_NAMES, SIAK_COMPANIONS, AID_TYPES } from '../constants';
import { cn } from '../lib/utils';

interface RecipientFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const INITIAL_FORM_STATE = {
  // Identity
  name: '',
  nik: '',
  kk: '',
  pob: '',
  dob: '',
  gender: 'Laki-laki',
  familyStatus: '',
  headOfFamilyName: '',
  headOfFamilyDob: '',
  
  // Domicile
  address: '',
  rt: '',
  rw: '',
  kampung: '',
  district: '',
  
  // Aid Details
  registrationId: '', // Will be generated
  source: '',
  sector: '',
  subSector: '',
  aidType: '',
  programName: '',
  purpose: '',
  amountProposed: '',
  contact: '',
  companion: '',
  
  // Timeline
  submissionDate: new Date().toISOString().split('T')[0],
  surveyDate: '',
  disbursementDate: '',
  amountDisbursed: '',
  
  // School
  schoolName: '',
  schoolLevel: '',
  schoolClass: '',
  schoolAddress: '',
  schoolPhone: '',
  
  // Banking
  bankAccountNo: '',
  bankName: '',
  bankAccountHolder: '',
  
  notes: '',
  isTermsAccepted: false,
};

export default function RecipientForm({ onSubmit, onCancel }: RecipientFormProps) {
  const generateRegId = () => `REG-${Math.floor(100000 + Math.random() * 900000)}`;

  const [formData, setFormData] = useState({
    ...INITIAL_FORM_STATE,
    registrationId: generateRegId()
  });

  const [files, setFiles] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'excel',
      }));
      setFiles([...files, ...newFiles]);
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.nik || !formData.kk || !formData.address || !formData.district || !formData.aidType || !formData.amountProposed) {
      alert('Mohon lengkapi semua field yang diberi tanda bintang (*)');
      return false;
    }
    if (formData.nik.length !== 16 || formData.kk.length !== 16) {
      alert('NIK dan No KK harus 16 digit.');
      return false;
    }
    return true;
  };

  const handleAddToQueue = () => {
    if (!validateForm()) return;

    const entry = {
      ...formData,
      amountProposed: Number(formData.amountProposed),
      amountDisbursed: formData.amountDisbursed ? Number(formData.amountDisbursed) : 0,
      documents: files,
      queuedAt: new Date().toLocaleTimeString()
    };

    setQueue([...queue, entry]);
    
    // Reset form for next entry but keep some contextual data
    setFormData({
      ...INITIAL_FORM_STATE,
      registrationId: generateRegId(),
      submissionDate: formData.submissionDate, // Keep date
      district: formData.district, // Keep district if same area
      source: formData.source,
      aidType: formData.aidType,
      programName: formData.programName
    });
    setFiles([]);
  };

  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (queue.length === 0) {
      // If queue is empty, try to submit the current form
      if (!validateForm()) return;
      if (!formData.isTermsAccepted) {
        alert('Anda harus menyetujui syarat dan ketentuan.');
        return;
      }
      const submissionData = {
        ...formData,
        amountProposed: Number(formData.amountProposed),
        amountDisbursed: formData.amountDisbursed ? Number(formData.amountDisbursed) : 0,
        documents: files 
      };
      onSubmit(submissionData);
    } else {
      // Submit everything in queue
      onSubmit(queue);
    }
  };

  const removeFromQueue = (index: number) => {
    setQueue(queue.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-10 pb-32">
      {/* QUEUE STATUS BAR */}
      {queue.length > 0 && (
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between sticky top-24 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-lg">Antrian Input: {queue.length} Data</p>
              <p className="text-xs text-indigo-100 font-medium tracking-wide">Data siap untuk disimpan sekaligus ke server.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSubmitAll}
            className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Semua ({queue.length})
          </button>
        </div>
      )}

      <form onSubmit={e => e.preventDefault()} className="space-y-8">
        {/* SECTION 1: IDENTITAS */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Data Identitas Penerima</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Nama Lengkap *</label>
              <input required type="text" className="form-input-custom" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama sesuai KTP" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">NIK *</label>
              <input required type="text" maxLength={16} className="form-input-custom" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} placeholder="16 Digit NIK" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nomor KK *</label>
              <input required type="text" maxLength={16} className="form-input-custom" value={formData.kk} onChange={e => setFormData({...formData, kk: e.target.value})} placeholder="16 Digit No KK" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tempat Lahir</label>
              <input type="text" className="form-input-custom" value={formData.pob} onChange={e => setFormData({...formData, pob: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tanggal Lahir (dd/mm/yyyy)</label>
              <input type="date" className="form-input-custom" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Jenis Kelamin</label>
              <select className="form-input-custom" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status Hubungan Keluarga</label>
              <select className="form-input-custom" value={formData.familyStatus} onChange={e => setFormData({...formData, familyStatus: e.target.value})}>
                <option value="">Pilih Status</option>
                <option value="Kepala Keluarga">Kepala Keluarga</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Famili Lain">Famili Lain</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Kepala Keluarga</label>
              <input type="text" className="form-input-custom" value={formData.headOfFamilyName} onChange={e => setFormData({...formData, headOfFamilyName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tgl Lahir Kepala Keluarga (dd/mm/yyyy)</label>
              <input type="date" className="form-input-custom" value={formData.headOfFamilyDob} onChange={e => setFormData({...formData, headOfFamilyDob: e.target.value})} />
            </div>
          </div>
        </div>

        {/* SECTION 2: DOMISILI */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Wilayah Domisili</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2 lg:col-span-4">
              <label className="text-sm font-semibold text-slate-700">Alamat Lengkap *</label>
              <textarea required className="form-input-custom min-h-[80px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Jl. Raya / Dusun / Gang" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">RT</label>
              <input 
                type="text" 
                maxLength={3}
                className="form-input-custom" 
                value={formData.rt} 
                onChange={e => setFormData({...formData, rt: e.target.value.replace(/\D/g, '')})} 
                placeholder="000" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">RW</label>
              <input 
                type="text" 
                maxLength={3}
                className="form-input-custom" 
                value={formData.rw} 
                onChange={e => setFormData({...formData, rw: e.target.value.replace(/\D/g, '')})} 
                placeholder="000" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Kampung / Kelurahan</label>
              <select 
                className="form-input-custom" 
                value={formData.kampung} 
                onChange={e => {
                  const selectedKampung = e.target.value;
                  let detectedDistrict = formData.district;
                  
                  // Auto-fill district based on kampung
                  for (const [district, villages] of Object.entries(SIAK_REGIONAL_DATA)) {
                    if (villages.includes(selectedKampung)) {
                      detectedDistrict = district;
                      break;
                    }
                  }
                  
                  setFormData({...formData, kampung: selectedKampung, district: detectedDistrict});
                }}
              >
                <option value="">Pilih Kampung/Kelurahan</option>
                {Object.entries(SIAK_REGIONAL_DATA).map(([district, villages]) => (
                  <optgroup key={district} label={district}>
                    {villages.map(v => <option key={v} value={v}>{v}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Kecamatan *</label>
              <select 
                required 
                className="form-input-custom" 
                value={formData.district} 
                onChange={e => setFormData({...formData, district: e.target.value, kampung: ''})}
              >
                <option value="">Pilih Kecamatan</option>
                {Object.keys(SIAK_REGIONAL_DATA).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: RENCANA BANTUAN */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Administrasi Rencana Bantuan</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">ID Registrasi</label>
              <input type="text" className="form-input-custom bg-slate-100 !cursor-not-allowed" value={formData.registrationId} readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Sumber Berkas</label>
              <select className="form-input-custom" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="">Pilih Sumber</option>
                <option value="KLM">KLM</option>
                <option value="UPZ">UPZ</option>
                <option value="Online">Online</option>
                <option value="Instansi">Instansi</option>
                <option value="Lembaga">Lembaga</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Bidang</label>
              <select 
                className="form-input-custom" 
                value={formData.sector} 
                onChange={e => setFormData({...formData, sector: e.target.value, subSector: ''})}
              >
                <option value="">Pilih Bidang</option>
                {Object.keys(SIAK_SECTORS).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Sub Bidang</label>
              <select 
                className="form-input-custom" 
                value={formData.subSector} 
                onChange={e => setFormData({...formData, subSector: e.target.value})}
                disabled={!formData.sector}
              >
                <option value="">Pilih Sub Bidang</option>
                {formData.sector && SIAK_SECTORS[formData.sector]?.map(ss => (
                  <option key={ss} value={ss}>{ss}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Jenis Bantuan *</label>
              <select 
                required 
                className="form-input-custom" 
                value={formData.aidType} 
                onChange={e => setFormData({...formData, aidType: e.target.value as any})}
                disabled={!formData.sector}
              >
                <option value="">Pilih Jenis</option>
                {formData.sector && SIAK_AID_TYPES[formData.sector]?.map(ss => (
                  <option key={ss} value={ss}>{ss}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Program</label>
              <select 
                className="form-input-custom" 
                value={formData.programName} 
                onChange={e => setFormData({...formData, programName: e.target.value})}
                disabled={!formData.sector}
              >
                <option value="">Pilih Program</option>
                {formData.sector && SIAK_PROGRAM_NAMES[formData.sector]?.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-semibold text-slate-700">Mengajukan Bantuan Untuk</label>
              <input type="text" className="form-input-custom" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="Tujuan pengajuan bantuan" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nominal diajukan (IDR) *</label>
              <input 
                required 
                type="text" 
                className="form-input-custom" 
                value={formData.amountProposed ? new Intl.NumberFormat('id-ID').format(Number(formData.amountProposed)) : ''} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, amountProposed: val});
                }} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">No Handphone</label>
              <input 
                type="tel" 
                maxLength={13}
                className="form-input-custom" 
                value={formData.contact} 
                onChange={e => setFormData({...formData, contact: e.target.value.replace(/\D/g, '')})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Pendamping Program</label>
              <select className="form-input-custom" value={formData.companion} onChange={e => setFormData({...formData, companion: e.target.value})}>
                <option value="">Pilih Pendamping</option>
                {SIAK_COMPANIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tgl Masuk Berkas (dd/mm/yyyy)</label>
              <input type="date" className="form-input-custom" value={formData.submissionDate} onChange={e => setFormData({...formData, submissionDate: e.target.value})} />
            </div>
          </div>
        </div>

        {/* SECTION 4: SEKOLAH & BANKING (CONDITIONAL) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
               Data Pendidikan
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Sekolah</label>
                <input type="text" className="form-input-custom" value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tingkatan</label>
                  <input type="text" className="form-input-custom" placeholder="SD/SMP/SMA" value={formData.schoolLevel} onChange={e => setFormData({...formData, schoolLevel: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Kelas</label>
                  <input type="text" className="form-input-custom" value={formData.schoolClass} onChange={e => setFormData({...formData, schoolClass: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Alamat Sekolah</label>
                <input type="text" className="form-input-custom" value={formData.schoolAddress} onChange={e => setFormData({...formData, schoolAddress: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">No Hp Sekolah</label>
                <input 
                  type="tel" 
                  maxLength={13}
                  className="form-input-custom" 
                  value={formData.schoolPhone} 
                  onChange={e => setFormData({...formData, schoolPhone: e.target.value.replace(/\D/g, '')})} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
               Data Perbankan
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nomor Rekening</label>
                <input 
                  type="text" 
                  maxLength={16}
                  className="form-input-custom" 
                  value={formData.bankAccountNo} 
                  onChange={e => setFormData({...formData, bankAccountNo: e.target.value.replace(/\D/g, '')})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Bank Rekening</label>
                <input type="text" className="form-input-custom" placeholder="BCA / Mandiri / BNI" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Rekening</label>
                <input type="text" className="form-input-custom" value={formData.bankAccountHolder} onChange={e => setFormData({...formData, bankAccountHolder: e.target.value})} />
              </div>
              <div className="pt-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Catatan</label>
                  <textarea className="form-input-custom min-h-[60px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIST OF QUEUED ITEMS IF ANY */}
        {queue.length > 0 && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <Layers className="w-5 h-5 text-indigo-600" />
               Daftar Antrian Input Baru
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queue.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-black text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.registrationId}</p>
                  </div>
                  <button onClick={() => removeFromQueue(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPACT FOOTER ACTION */}
        <div className="fixed bottom-0 right-0 left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="terms" 
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={formData.isTermsAccepted}
              onChange={e => setFormData({...formData, isTermsAccepted: e.target.checked})}
            />
            <label htmlFor="terms" className="text-sm text-slate-600 font-bold cursor-pointer">
              Fakta Integritas Data Benar
            </label>
          </div>
          
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Batalkan
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button 
              type="button" 
              onClick={handleAddToQueue}
              className="px-6 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Input Lagi
            </button>
            <button 
              onClick={handleSubmitAll}
              type="button" 
              className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Save className="w-4 h-4" />
              {queue.length > 0 ? `Simpan Semua (${queue.length})` : 'Simpan Langsung'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
