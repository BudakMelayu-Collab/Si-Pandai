import React, { useState } from 'react';
import { PPDRecord } from '../types';
import { Search, Download, Trash2, Calendar, User, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PPDRecapProps {
  records: PPDRecord[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function PPDRecap({ records, onDelete, onClose }: PPDRecapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredRecords = records.filter(record => 
    (record.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) || 
     record.no.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (dateFilter === '' || record.date.includes(dateFilter))
  );

  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  const handleExport = () => {
    // Simple CSV Export
    const headers = ['No. PPD', 'Tanggal', 'Pemohon', 'Keperluan', 'Jumlah'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [
        `"${r.no}"`,
        `"${r.date}"`,
        `"${r.requestedBy}"`,
        `"${r.proposeFor}"`,
        r.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_PPD_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Rekapitulasi PPD
          </h2>
          <p className="text-sm text-slate-500">Daftar permohonan pengeluaran dana yang telah disimpan</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Form */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Cari Pemohon atau No. PPD..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Filter Tanggal (DD/MM/YYYY)..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto p-6">
        {filteredRecords.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <th className="pb-3 px-2">No. PPD</th>
                <th className="pb-3 px-2">Tanggal</th>
                <th className="pb-3 px-2">Pemohon</th>
                <th className="pb-3 px-2">Keperluan</th>
                <th className="pb-3 px-2 text-right">Jumlah</th>
                <th className="pb-3 px-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-2 text-sm font-bold text-slate-700">{record.no}</td>
                  <td className="py-4 px-2 text-sm text-slate-500">{record.date}</td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                        {record.requestedBy.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-600">{record.requestedBy}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-sm text-slate-500 max-w-[200px] truncate">{record.proposeFor}</td>
                  <td className="py-4 px-2 text-sm font-bold text-indigo-600 text-right">
                    Rp. {record.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <button 
                      onClick={() => onDelete(record.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm italic">Tidak ada data rekapan yang ditemukan</p>
          </div>
        )}
      </div>

      {/* Footer / Summary */}
      <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-500 font-medium">
          Menampilkan <span className="text-slate-800 font-bold">{filteredRecords.length}</span> dari {records.length} data
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Seluruh</span>
          <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20">
            Rp. {totalAmount.toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
}
