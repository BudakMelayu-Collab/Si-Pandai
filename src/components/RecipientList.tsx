import React, { useState } from 'react';
import { 
  Search, Filter, 
  ExternalLink, Download, FileText, ChevronRight,
  Edit3, Trash2, FileCheck, ClipboardList, FileStack, Loader2,
  Calendar, MapPin
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

      <div className="p-6">
        {filteredData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredData.map((item) => {
              // Get custom date label
              const getDayLabel = (dateString: string) => {
                if (!dateString) return '-';
                const d = new Date(dateString);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                
                const diffTime = today.getTime() - target.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 0) {
                  return 'Hari ini';
                } else if (diffDays === 1) {
                  return '1 Hari yang lalu';
                } else if (diffDays === 2) {
                  return '2 Hari yang lalu';
                } else {
                  return d.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
                }
              };

              const submissionLabel = getDayLabel(item.submissionDate);
              const isToday = submissionLabel === 'Hari ini';
              const isOneDayAgo = submissionLabel === '1 Hari yang lalu';
              const isTwoDaysAgo = submissionLabel === '2 Hari yang lalu';
              const isRecent = isToday || isOneDayAgo || isTwoDaysAgo;

              return (
                <div 
                  key={item.id} 
                  className="relative flex flex-col md:flex-row md:items-center gap-4 p-5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all duration-200 group"
                >
                  {/* Status-colored notification side strip */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all",
                    item.status === 'Selesai' || item.status === 'Disetujui' ? "bg-emerald-500" :
                    item.status === 'Disalurkan' ? "bg-indigo-500" :
                    item.status === 'Proses Berkas' || item.status === 'Pending' ? "bg-amber-500" : 
                    item.status === 'Ditolak' ? "bg-rose-500" : "bg-slate-400"
                  )} />

                  {/* Left part: Stream node style badge */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-slate-100",
                      isToday ? "bg-emerald-100 text-emerald-800" :
                      isOneDayAgo ? "bg-amber-100 text-amber-800" :
                      isTwoDaysAgo ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-700"
                    )}>
                      {isToday ? "NEW" : 
                       isOneDayAgo ? "1d" : 
                       isTwoDaysAgo ? "2d" : 
                       new Date(item.submissionDate).getDate()}
                    </div>
                  </div>

                  {/* Right part: Main details designed like a notification */}
                  <div className="flex-1 min-w-0 space-y-1.5 pl-1.5">
                    {/* Header bar within the notification style box */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                          #{item.registrationId || item.id.substring(0, 8)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-extrabold text-slate-700">{item.sector}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-medium italic">{item.aidType}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tight",
                          STATUS_COLORS[item.status]
                        )}>
                          {item.status}
                        </span>
                        <span className={cn(
                          "text-xs font-bold flex items-center gap-1",
                          isToday ? "text-emerald-600" :
                          isOneDayAgo ? "text-amber-600" :
                          isTwoDaysAgo ? "text-orange-600" : "text-slate-400"
                        )}>
                          <Calendar className="w-3.5 h-3.5" />
                          {submissionLabel}
                        </span>
                      </div>
                    </div>

                    {/* Notification content */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span className="group-hover:text-indigo-600 transition-colors">{item.name}</span>
                        <span className="text-[11px] font-normal text-slate-400">({item.nik})</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-normal mt-1">
                        Mengajukan permohonan bantuan <span className="font-bold text-indigo-650 italic">“{item.programName}”</span> senilai <span className="font-extrabold text-indigo-700">Rp {Number(item.amountProposed).toLocaleString('id-ID')}</span> untuk berdomisili di RT {item.rt}/RW {item.rw}, Kampung {item.kampung}, Kecamatan {item.district || '-'}.
                      </p>
                    </div>

                    {/* Footer checklist and action panel */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2.5 border-t border-slate-200/50 mt-1">
                      {/* Document Verification Checklist */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Berkas:</span>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all",
                          isRecipientFileTracked(item, 'receipt') ? "bg-emerald-55 text-emerald-800 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isRecipientFileTracked(item, 'receipt') ? "bg-emerald-500 shadow-xs" : "bg-slate-300")} />
                          Tanda Terima
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all",
                          isRecipientFileTracked(item, 'mpzis') ? "bg-sky-55 text-sky-800 border-sky-300" : "bg-white text-slate-400 border-slate-200"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isRecipientFileTracked(item, 'mpzis') ? "bg-sky-500 shadow-xs" : "bg-slate-300")} />
                          MPZIS
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all",
                          isRecipientFileTracked(item, 'eppd') ? "bg-indigo-55 text-indigo-800 border-indigo-200" : "bg-white text-slate-400 border-slate-200"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isRecipientFileTracked(item, 'eppd') ? "bg-indigo-500 shadow-xs" : "bg-slate-300")} />
                          E-PPD
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all",
                          isRecipientFileTracked(item, 'survey') ? "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" : "bg-white text-slate-400 border-slate-200"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isRecipientFileTracked(item, 'survey') ? "bg-fuchsia-500 shadow-xs" : "bg-slate-300")} />
                          Verifikasi
                        </div>
                      </div>

                      {/* Notification Actions Row */}
                      <div className="flex items-center gap-1.5">
                        {item.contact && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md mr-1.5">
                            📞 {item.contact}
                          </span>
                        )}
                        <button 
                          onClick={() => onReceipt(item)}
                          className="p-1 px-1.5 text-slate-550 hover:text-amber-600 hover:bg-amber-50 rounded border border-slate-200 transition-all hover:border-amber-200 shadow-3xs"
                          title="Tanda Terima Dokumen"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onMPZIS(item)}
                          className="p-1 px-1.5 text-slate-550 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 transition-all hover:border-blue-200 shadow-3xs"
                          title="MPZIS (Memorandum)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onEPPD(item)}
                          className="p-1 px-1.5 text-slate-550 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-slate-200 transition-all hover:border-indigo-200 shadow-3xs"
                          title="E-PPD"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onSurvey(item)}
                          className="p-1 px-1.5 text-slate-550 hover:text-emerald-600 hover:bg-emerald-50 rounded border border-slate-200 transition-all hover:border-emerald-200 shadow-3xs"
                          title="Lembar Verifikasi"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleMergeScans(item)}
                          disabled={mergingId === item.id}
                          className={cn(
                            "p-1 px-1.5 rounded border transition-all shadow-3xs",
                            mergingId === item.id 
                              ? "text-indigo-400 bg-indigo-50 border-indigo-200 animate-pulse" 
                              : "text-slate-550 hover:text-indigo-600 hover:bg-indigo-50"
                          )}
                          title="Gabungkan Semua Scan"
                        >
                          {mergingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileStack className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-slate-200" />
              <p className="text-slate-500 font-semibold text-sm">Tidak ada data yang ditemukan</p>
              <p className="text-xs text-slate-400">Gunakan filter atau pencarian lain untuk menemukan data.</p>
            </div>
          </div>
        )}
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
