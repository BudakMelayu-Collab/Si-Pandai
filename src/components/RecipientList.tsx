import React, { useState } from 'react';
import { 
  Search, Filter, 
  ExternalLink, Download, FileText, ChevronRight,
  Edit3, Trash2, FileCheck, ClipboardList, FileStack, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { AID_TYPES, AID_STATUSES, STATUS_COLORS } from '../constants';
import { Recipient } from '../types';
import { cn, isRecipientFileTracked } from '../lib/utils';
import { mergeRecipientScans } from '../lib/pdfMerger';

interface RecipientListProps {
  data: Recipient[];
  onReceipt: (recipient: Recipient) => void;
  onMPZIS: (recipient: Recipient) => void;
  onEPPD: (recipient: Recipient) => void;
  onSurvey: (recipient: Recipient) => void;
}

export default function RecipientList({ data, onReceipt, onMPZIS, onEPPD, onSurvey }: RecipientListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [mergingId, setMergingId] = useState<string | null>(null);

  const handleMergeScans = async (recipient: Recipient) => {
    setMergingId(recipient.id);
    try {
      await mergeRecipientScans(recipient.id, recipient.name);
    } catch (error: any) {
      alert(error.message || 'Gagal menggabungkan berkas scan.');
    } finally {
      setMergingId(null);
    }
  };

  const filteredData = data
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.nik.includes(search);
      const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
      const matchesType = filterType === 'All' || item.aidType === filterType;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari Nama atau NIK..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">Status:</span>
            <select 
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">Semua</option>
              {AID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">Jenis:</span>
            <select 
              className="bg-slate-100 border-none rounded-lg py-1.5 px-3 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">Semua</option>
              {AID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse min-w-[2800px]">
          <thead className="bg-slate-50">
              <tr>
                <th className="pl-6 pr-2 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Tgl Masuk</th>
                <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">ID Registrasi</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Program / Permohonan</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Nama Lengkap</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">NIK</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">No. HP</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Alamat (Jalan/RT/RW)</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Kampung</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-1 py-4 text-xs font-bold text-black border-b border-slate-100 text-right uppercase tracking-wider whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="pl-6 pr-2 py-4 text-black text-sm whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {new Date(item.submissionDate).toLocaleDateString('id-ID', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className="text-[10px] text-slate-500 italic">
                      {formatDistanceToNow(new Date(item.submissionDate), { addSuffix: true, locale: id })}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-4 text-black text-sm font-medium whitespace-nowrap">
                  {item.registrationId || item.id.substring(0, 8)}
                </td>
                <td className="px-1 py-4 text-black text-sm whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                      <span>{item.sector}</span>
                      <span className="text-slate-300">•</span>
                      <span>{item.aidType}</span>
                    </div>
                    <div className="font-medium italic text-slate-600 text-xs truncate max-w-[250px]" title={item.programName}>
                      {item.programName}
                    </div>
                    <div className="text-[11px] font-black text-slate-800 mt-0.5">
                      Rp {Number(item.amountProposed).toLocaleString('id-ID')}
                    </div>
                  </div>
                </td>
                <td className="px-1 py-4 text-black text-sm font-bold whitespace-nowrap">
                  {item.name}
                </td>
                <td className="px-1 py-4 text-black text-sm whitespace-nowrap">
                  {item.nik}
                </td>
                <td className="px-1 py-4 text-black text-sm whitespace-nowrap">
                  {item.contact}
                </td>
                <td className="px-1 py-4 text-black text-sm whitespace-nowrap" title={`${item.address} RT ${item.rt} / RW ${item.rw}`}>
                  {item.address} RT {item.rt}/{item.rw}
                </td>
                <td className="px-1 py-4 text-black text-sm whitespace-nowrap">
                  {item.kampung}
                </td>
                <td className="px-1 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-center">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold text-center inline-block w-full uppercase tracking-tighter",
                      STATUS_COLORS[item.status]
                    )}>
                      {item.status}
                    </span>
                    <div className="flex gap-1.5 mt-1.5 justify-center">
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full ring-1 ring-slate-200 transition-all", 
                          isRecipientFileTracked(item, 'receipt')
                            ? "bg-emerald-500 ring-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                            : "bg-slate-100"
                        )} 
                        title="Tanda Terima" 
                      />
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full ring-1 ring-slate-200 transition-all", 
                          isRecipientFileTracked(item, 'mpzis')
                            ? "bg-sky-500 ring-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.4)]" 
                            : "bg-slate-100"
                        )} 
                        title="MPZIS (Memorandum)" 
                      />
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full ring-1 ring-slate-200 transition-all", 
                          isRecipientFileTracked(item, 'eppd')
                            ? "bg-indigo-500 ring-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                            : "bg-slate-100"
                        )} 
                        title="E-PPD" 
                      />
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full ring-1 ring-slate-200 transition-all", 
                          isRecipientFileTracked(item, 'survey')
                            ? "bg-fuchsia-500 ring-fuchsia-500/50 shadow-[0_0_8px_rgba(192,38,211,0.4)]" 
                            : "bg-slate-100"
                        )} 
                        title="Verifikasi (Survey)" 
                      />
                    </div>
                  </div>
                </td>
                <td className="px-1 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onReceipt(item)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                      title="Tanda Terima Dokumen"
                    >
                      <FileCheck className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onMPZIS(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                      title="MPZIS (Memorandum)"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEPPD(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                      title="E-PPD"
                    >
                      <FileCheck className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onSurvey(item)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                      title="Lembar Verifikasi"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleMergeScans(item)}
                      disabled={mergingId === item.id}
                      className={cn(
                        "p-1.5 rounded transition-all",
                        mergingId === item.id 
                          ? "text-indigo-400 bg-indigo-50 animate-pulse" 
                          : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                      title="Gabungkan Semua Scan (Rekap PDF)"
                    >
                      {mergingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileStack className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-500 font-medium">Tidak ada data yang ditemukan</p>
                    <p className="text-xs text-slate-400">Gunakan filter atau pencarian lain untuk menemukan data.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">Menampilkan {filteredData.length} dari {data.length} data</p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 text-sm font-bold text-slate-400 cursor-not-allowed">Sebelumnya</button>
          <button className="px-3 py-1 text-sm font-bold bg-white border border-slate-200 text-indigo-600 rounded shadow-sm">1</button>
          <button className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">2</button>
          <button className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Selanjutnya</button>
        </div>
      </div>
    </div>
  );
}
