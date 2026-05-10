import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, User, Eye, Download, Search
} from 'lucide-react';
import { streamSectorReports, CompanionReport, auth } from '../firebase';
import { cn } from '../lib/utils';

interface SectorReportTableProps {
  sector: string;
}

export default function SectorReportTable({ sector }: SectorReportTableProps) {
  const [reports, setReports] = useState<CompanionReport[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Safety check
    if (!auth.currentUser) return;

    const unsubscribe = streamSectorReports(sector, setReports);
    return () => unsubscribe();
  }, [sector]);

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.companionName.toLowerCase().includes(search.toLowerCase()) ||
    r.month.toLowerCase().includes(search.toLowerCase())
  );

  const openInNewTab = (dataUrl: string, title: string) => {
    try {
      const [header, base64Data] = dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      
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
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error opening file:', error);
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        win.document.title = title;
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Program Bulanan - {sector}
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari laporan..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="pl-6 pr-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Judul Laporan</th>
                <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Periode</th>
                <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Pendamping</th>
                <th className="px-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Diunggah Pada</th>
                <th className="px-1 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="pl-6 pr-1 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                        <img src={report.coverUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{report.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">
                        {report.month} {report.year}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">{report.companionName}</span>
                    </div>
                  </td>
                  <td className="px-1 py-4">
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(report.uploadedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </span>
                  </td>
                  <td className="px-1 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => (report.fileUrl || report.coverUrl) && openInNewTab(report.fileUrl || report.coverUrl, report.title)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Lihat Laporan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.fileUrl && (
                        <button 
                          onClick={() => openInNewTab(report.fileUrl!, report.title)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download Laporan"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Belum ada laporan bulanan untuk sektor ini
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
