import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Trash2, 
  Plus, 
  Megaphone, 
  Save, 
  Bell, 
  Info, 
  AlertTriangle, 
  AlertCircle 
} from 'lucide-react';
import { 
  updateAppSettings, 
  streamAppSettings, 
  saveAnnouncement, 
  streamAnnouncements, 
  updateAnnouncement, 
  deleteAnnouncement,
  auth
} from '../firebase';
import { AppSettings, Announcement } from '../types';
import { cn } from '../lib/utils';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [appName, setAppName] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'announcements'>('general');
  
  // Announcement Form
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<Omit<Announcement, 'id' | 'createdAt'>>({
    title: '',
    content: '',
    type: 'info',
    isActive: true
  });

  useEffect(() => {
    // Safety check: only start listeners if we have an active session
    if (!auth.currentUser) return;

    const unsubSettings = streamAppSettings((data) => {
      setSettings(data);
      if (data?.appName) {
        setAppName(data.appName);
      }
    });
    const unsubAnnouncements = streamAnnouncements(setAnnouncements);
    return () => {
      unsubSettings();
      unsubAnnouncements();
    };
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 500) { // 500KB limit
      alert('File terlalu besar. Maksimal 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await updateAppSettings({ logoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAppSettings({ 
        appName: appName || 'Si-PANDAI',
        logoUrl: settings?.logoUrl || '' 
      });
      alert('Pengaturan umum berhasil disimpan');
    } catch (error) {
      alert('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveAnnouncement(announcementForm);
      setIsAddingAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'info',
        isActive: true
      });
    } catch (error) {
      alert('Gagal menyimpan pengumuman');
    }
  };

  const toggleAnnouncement = async (id: string, current: boolean) => {
    await updateAnnouncement(id, { isActive: !current });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (confirm('Hapus pengumuman ini?')) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-4 py-2 text-sm font-bold transition-all border-b-2 rounded-t-lg",
            activeTab === 'general' ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Pengaturan Umum
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={cn(
            "px-4 py-2 text-sm font-bold transition-all border-b-2 rounded-t-lg",
            activeTab === 'announcements' ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Notifikasi & Pengumuman
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              Logo Aplikasi
            </h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group relative">
                {settings?.logoUrl ? (
                  <>
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                    <button 
                      onClick={() => updateAppSettings({ logoUrl: '' })}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <SettingsIcon className="w-12 h-12 text-slate-200" />
                )}
              </div>
              <label className="w-full">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <div className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-center text-sm font-bold cursor-pointer hover:bg-indigo-100 transition-all">
                  Pilih Logo
                </div>
              </label>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Gunakan file PNG atau JPG transparan berukuran maksimal 500KB.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <h3 className="font-bold text-slate-800">Nama Aplikasi</h3>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Display Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-800"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Si-PANDAI"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-600" />
              Kelola Pengumuman
            </h3>
            <button 
              onClick={() => setIsAddingAnnouncement(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Pengumuman
            </button>
          </div>

          {isAddingAnnouncement && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg animate-in fade-in slide-in-from-top-4">
              <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Judul</label>
                    <input 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      placeholder="Maintenance Sistem"
                      value={announcementForm.title}
                      onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipe</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      value={announcementForm.type}
                      onChange={e => setAnnouncementForm({...announcementForm, type: e.target.value as any})}
                    >
                      <option value="info">Informasi (Biru)</option>
                      <option value="warning">Peringatan (Kuning)</option>
                      <option value="urgent">Mendesak (Merah)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konten / Isi</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Tulis detail pengumuman di sini..."
                    value={announcementForm.content}
                    onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddingAnnouncement(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600">Batal</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Simpan Pengumuman</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {announcements.length > 0 ? announcements.map((item) => (
              <div key={item.id} className={cn(
                "p-5 rounded-2xl border transition-all flex items-start gap-4 shadow-sm",
                item.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.type === 'info' ? "bg-blue-100 text-blue-600" : 
                  item.type === 'warning' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                )}>
                  {item.type === 'info' ? <Info className="w-5 h-5" /> : 
                   item.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                    {!item.isActive && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Nonaktif</span>}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.content}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Dibuat pada: {new Date(item.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleAnnouncement(item.id, item.isActive)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      item.isActive ? "text-amber-500 hover:bg-amber-50" : "text-indigo-500 hover:bg-indigo-50"
                    )}
                    title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Belum ada pengumuman yang dibuat.</p>
                <p className="text-xs text-slate-400 mt-1">Pengumuman Anda akan muncul di Dashboard pengguna.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
