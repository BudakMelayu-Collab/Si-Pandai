import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, FileCheck, Clock, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { AID_STATUSES, AID_TYPES, STATUS_COLORS } from '../constants';
import { Recipient } from '../types';

interface DashboardProps {
  recipients: Recipient[];
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-start justify-between shadow-sm">
    <div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-green-600">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-bold">{trend}</span>
          <span className="text-xs text-slate-400 font-normal ml-1">dari bulan lalu</span>
        </div>
      )}
    </div>
    <div className={`p-3 rounded-2xl ${color} shadow-inner`}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

export default function Dashboard({ recipients }: DashboardProps) {
  // Aggregate data for Bar Chart (Aid Types)
  const aidTypeData = useMemo(() => {
    return AID_TYPES.map(type => ({
      name: type,
      total: recipients.filter(r => r.aidType === type).length
    }));
  }, [recipients]);

  // Aggregate data for Pie Chart (Statuses)
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    recipients.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });

    return AID_STATUSES.map(status => ({
      name: status,
      value: counts[status] || 0,
      color: status === 'Proses Berkas' ? '#f59e0b' : 
             status === 'Selesai' ? '#10b981' :
             status === 'Disetujui' ? '#22c55e' :
             status === 'Ditolak' ? '#ef4444' :
             status === 'Disalurkan' ? '#8b5cf6' :
             status === 'Calon' ? '#6366f1' : '#94a3b8'
    })).filter(s => s.value > 0);
  }, [recipients]);

  // Calculated Stats
  const stats = useMemo(() => {
    const total = recipients.length;
    const completed = recipients.filter(r => r.status === 'Selesai').length;
    const processing = recipients.filter(r => r.status === 'Proses Berkas').length;
    const itemsWithIssues = recipients.filter(r => r.status === 'Ditolak').length;

    return { total, completed, processing, itemsWithIssues };
  }, [recipients]);

  // Recent activity (last 5)
  const recentRecipients = useMemo(() => {
    return recipients.slice(0, 5);
  }, [recipients]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Pendaftar" 
          value={stats.total}
          icon={Users} 
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          title="Berkas Selesai" 
          value={stats.completed}
          icon={FileCheck} 
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Proses Berkas" 
          value={stats.processing}
          icon={Clock} 
          color="bg-amber-50 text-amber-600"
        />
        <StatCard 
          title="Ditolak" 
          value={stats.itemsWithIssues}
          icon={AlertCircle} 
          color="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Sebaran Jenis Bantuan</h3>
            <div className="p-2 bg-slate-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aidTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs mb-8">Status Berkas</h3>
          <div className="h-[260px] relative">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-[10px] font-bold text-slate-500 uppercase">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada data status</p>
              </div>
            )}
            {statusChartData.length > 0 && (
              <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-2xl font-black text-slate-800 leading-none">{stats.total}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Pendaftar Terakhir</h3>
          <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:text-indigo-700 transition-all flex items-center gap-1">
            Lihat Semua
            <TrendingUp className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerima</th>
                <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program</th>
                <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentRecipients.length > 0 ? recentRecipients.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                        {item.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.registrationId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <p className="text-xs text-slate-600 font-medium">{item.programName}</p>
                    <p className="text-[10px] text-slate-400">{item.aidType}</p>
                  </td>
                  <td className="py-4 text-right">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada aktivitas baru</p>
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
