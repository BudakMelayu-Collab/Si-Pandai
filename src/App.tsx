/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from './components/Layout';
import Dashboard from './components/Dashboard';
import RecipientForm from './components/RecipientForm';
import RecipientList from './components/RecipientList';
import SectorReportTable from './components/SectorReportTable';
import MonthlyPaymentTable from './components/MonthlyPaymentTable';
import PrintTemplate from './components/PrintTemplate';
import ReceiptTemplate from './components/ReceiptTemplate';
import MPZISTemplate from './components/MPZISTemplate';
import EPPDTemplate from './components/EPPDTemplate';
import SurveyTemplate from './components/SurveyTemplate';
import CompanionCatalog from './components/CompanionCatalog';
import Settings from './components/Settings';
import { Recipient, AidStatus, PPDRecord, AppSettings, Announcement } from './types';
import { SIAK_COMPANIONS } from './constants';
import { Plus, CheckCircle2, LogIn, Bell, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  streamRecipients, 
  streamPPDRecords, 
  saveRecipient, 
  testConnection, 
  logout,
  streamAppSettings,
  streamAnnouncements
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ppdRecords, setPpdRecords] = useState<PPDRecord[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isShowingReceipt, setIsShowingReceipt] = useState(false);
  const [isShowingMPZIS, setIsShowingMPZIS] = useState(false);
  const [isShowingEPPD, setIsShowingEPPD] = useState(false);
  const [isShowingSurvey, setIsShowingSurvey] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const savePPDRecordLocal = async (record: Omit<PPDRecord, 'id' | 'createdAt'>) => {
    try {
      const { savePPDRecord } = await import('./firebase');
      await savePPDRecord(record);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      alert('Gagal menyimpan rekap PPD.');
    }
  };

  const deletePPDRecordLocal = async (id: string) => {
    try {
      const { deletePPDRecordServer } = await import('./firebase');
      await deletePPDRecordServer(id);
    } catch (error) {
      alert('Gagal menghapus rekap PPD.');
    }
  };

  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLoginWithGoogle = async () => {
    try {
      setAuthError(null);
      setAuthLoading(true);
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('Domain tidak terdaftar. Silakan tambahkan domain ini ke "Authorized domains" di Firebase Console Anda.');
      } else {
        setAuthError('Gagal login: ' + (error.message || 'Error tidak diketahui'));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isRegistering) {
        if (!displayName) throw new Error('Nama lengkap wajib diisi');
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    
    const init = async () => {
      const connError = await testConnection();
      if (connError) {
        setAuthError(connError);
      }
      
      unsubscribeAuth = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    };
    
    init();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeRecipients = streamRecipients((data) => {
        setRecipients(data);
      });
      
      const unsubscribePPD = streamPPDRecords((data: PPDRecord[]) => {
        setPpdRecords(data);
      });

      const unsubSettings = streamAppSettings(setAppSettings);
      const unsubAnnouncements = streamAnnouncements(setAnnouncements);
      
      return () => {
        unsubscribeRecipients();
        unsubscribePPD();
        unsubSettings();
        unsubAnnouncements();
      };
    }
  }, [user]);

  // Keep selectedRecipient in sync with latest data from recipients stream
  useEffect(() => {
    if (selectedRecipient) {
      const latest = recipients.find(r => r.id === selectedRecipient.id);
      if (latest && (
        latest.status !== selectedRecipient.status ||
        latest.signedPdfUrl !== selectedRecipient.signedPdfUrl ||
        latest.signedReceiptPdfUrl !== selectedRecipient.signedReceiptPdfUrl ||
        latest.signedMPZISPdfUrl !== selectedRecipient.signedMPZISPdfUrl ||
        latest.signedSurveyPdfUrl !== selectedRecipient.signedSurveyPdfUrl ||
        latest.hasSignedPdf !== selectedRecipient.hasSignedPdf ||
        latest.hasSignedReceiptPdf !== selectedRecipient.hasSignedReceiptPdf ||
        latest.hasSignedMPZISPdf !== selectedRecipient.hasSignedMPZISPdf ||
        latest.hasSignedSurveyPdf !== selectedRecipient.hasSignedSurveyPdf
      )) {
        setSelectedRecipient(latest);
      }
    }
  }, [recipients, selectedRecipient]);

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const handleCreateRecipient = async (data: any) => {
    try {
      if (Array.isArray(data)) {
        for (const item of data) {
          await saveRecipient(item);
        }
      } else {
        await saveRecipient(data);
      }
      setActiveTab('recipients');
      setShowSuccessToast(true);
    } catch (error) {
      alert('Gagal menyimpan data. Pastikan Anda memiliki akses.');
    }
  };

  useEffect(() => {
    if (activeTab.startsWith('companion-')) {
      // Find the actual companion name from the slugs
      const slug = activeTab.replace('companion-', '');
      const name = SIAK_COMPANIONS.find(c => c.toLowerCase().replace(/\s+/g, '-') === slug);
      if (name) {
        // No-op for now, just useful for mapping
      }
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-medium animate-pulse">Memuat Sistem Si-PANDAI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center my-8"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-1">Si-PANDAI</h1>
          <p className="text-slate-500 mb-6 font-medium text-sm">Sistem Administrasi Bantuan Sosial</p>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 px-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Ahmad Fauzi"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 px-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="email@lembaga.org"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 px-1">Kata Sandi</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="********"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {authLoading ? 'Memproses...' : (isRegistering ? 'Daftar Akun' : 'Masuk ke Sistem')}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Atau</span></div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleLoginWithGoogle}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all transform active:scale-95 shadow-lg disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              Masuk dengan Google
            </button>
            
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 font-bold text-sm hover:underline"
            >
              {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            </button>
            
            {authError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[10px] font-medium text-left space-y-2">
                <div className="flex items-center gap-2 font-bold mb-1 text-xs">
                  <Plus className="w-4 h-4 rotate-45" />
                  <span>Kesalahan Akses</span>
                </div>
                <p className="font-bold">{authError}</p>
                
                {authError.includes('Domain tidak terdaftar') && (
                  <div className="mt-2 space-y-2">
                    <p className="bg-white p-2 rounded border border-red-100">
                      Domain <code className="font-bold text-slate-800">{window.location.hostname}</code> belum terdaftar di Authorized domains.
                    </p>
                  </div>
                )}

                {authError.includes('Network Request Failed') && (
                  <div className="mt-2 space-y-2">
                    <p className="bg-white p-2 rounded border border-red-100">
                      Biasanya disebabkan oleh:
                    </p>
                    <ul className="list-disc list-inside text-[9px] text-slate-500 space-y-1 bg-white p-2 rounded border border-red-100">
                      <li>Pemblokir iklan (AdBlock) aktif</li>
                      <li>Third-party cookies diblokir browser</li>
                      <li>Koneksi internet tidak stabil</li>
                      <li>Domain belum di-whitelist di Firebase Console</li>
                    </ul>
                  </div>
                )}
                
                {(authError.includes('API Key') || authError.includes('API key')) && (
                  <div className="mt-2 space-y-2">
                    <p className="bg-white p-2 rounded border border-red-100">
                      Kunci API Firebase tidak valid atau belum terpasang.
                    </p>
                    <div className="bg-slate-900 text-slate-400 p-3 rounded-lg font-mono text-[9px] leading-relaxed">
                      Sistem otomatis mengalami kegagalan izin (Permission Denied). 
                      Penyebab: Proyek cloud ini memerlukan aktivasi Firebase manual.
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-400 font-medium px-4">
              Akses terbatas hanya untuk staff administrasi lembaga yang telah terverifikasi.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setActiveTab('dashboard');
    } catch (error) {
      alert('Gagal logout.');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard recipients={recipients} />;
      case 'input':
        return (
          <div className="max-w-4xl mx-auto">
            <RecipientForm 
              onSubmit={handleCreateRecipient} 
              onCancel={() => setActiveTab('dashboard')} 
            />
          </div>
        );
      case 'recipients':
      case 'siak-cerdas':
      case 'siak-dakwah':
      case 'siak-peduli':
      case 'siak-sehat':
      case 'siak-sejahtera':
      case 'atm-beras':
      case 'rumah-singgah':
      case 'bnba-recap':
        let filteredData = [];
        let currentSector = '';
        
        if (activeTab === 'recipients' || activeTab === 'bnba-recap') {
          filteredData = recipients;
        } else if (activeTab === 'atm-beras') {
          filteredData = recipients.filter(r => r.programName?.toLowerCase().includes('atm beras') || (r.sector === 'Siak Sejahtera' && r.programName?.toLowerCase().includes('beras')));
        } else if (activeTab === 'rumah-singgah') {
          filteredData = recipients.filter(r => r.programName?.toLowerCase().includes('rumah singgah') || (r.sector === 'Siak Sejahtera' && r.programName?.toLowerCase().includes('rumah')));
        } else {
          currentSector = activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          filteredData = recipients.filter(r => r.sector === currentSector);
        }
        
        const isSectorTab = ['Siak Cerdas', 'Siak Dakwah', 'Siak Peduli', 'Siak Sehat', 'Siak Sejahtera'].includes(currentSector);
        const isMonthlySector = ['Siak Cerdas', 'Siak Dakwah', 'Siak Peduli', 'Siak Sejahtera'].includes(currentSector) || activeTab === 'atm-beras';
        const displaySector = isMonthlySector ? (activeTab === 'atm-beras' ? 'ATM Beras' : currentSector) : currentSector;

        return (
          <div className="space-y-12">
            <div className="space-y-4">
              {isSectorTab && <h2 className="text-lg font-bold text-slate-800">Layanan Konter - {currentSector}</h2>}
              <RecipientList 
                data={filteredData} 
                onReceipt={(rec) => {
                  setSelectedRecipient(rec);
                  setIsShowingReceipt(true);
                }}
                onMPZIS={(rec) => {
                  setSelectedRecipient(rec);
                  setIsShowingMPZIS(true);
                }}
                onEPPD={(rec) => {
                  setSelectedRecipient(rec);
                  setIsShowingEPPD(true);
                }}
                onSurvey={(rec) => {
                  setSelectedRecipient(rec);
                  setIsShowingSurvey(true);
                }}
              />
            </div>
            
            {isMonthlySector ? (
              <MonthlyPaymentTable sector={displaySector} />
            ) : (
              isSectorTab && (
                <SectorReportTable sector={currentSector} />
              )
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Felix'}`} alt="avatar" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{user?.displayName}</h2>
                <p className="text-slate-500 font-medium">{user?.email}</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Akun Terverifikasi
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">UID Pengguna</p>
                <p className="text-sm font-mono text-slate-600 truncate">{user?.uid}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Terakhir Masuk</p>
                <p className="text-sm font-medium text-slate-600">
                  {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                </p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              Keluar dari Sistem
            </button>
          </div>
        );
      case 'settings':
        return <Settings />;
      default:
        if (activeTab.startsWith('companion-')) {
          const slug = activeTab.replace('companion-', '');
          const name = SIAK_COMPANIONS.find(c => c.toLowerCase().replace(/\s+/g, '-') === slug);
          return (
            <CompanionCatalog 
              companionId={slug} 
              companionName={name || 'Pendamping'} 
              recipients={recipients}
            />
          );
        }
        return <Dashboard recipients={recipients} />;
    }
  };

  const getHeaderTitle = () => {
    if (activeTab.startsWith('companion-')) {
      const slug = activeTab.replace('companion-', '');
      const name = SIAK_COMPANIONS.find(c => c.toLowerCase().replace(/\s+/g, '-') === slug);
      return `Pendamping: ${name || 'Program'}`;
    }
    switch (activeTab) {
      case 'dashboard': return 'Overview Dashboard';
      case 'input': return 'Input Data Baru';
      case 'recipients': return 'Antrean Layanan';
      case 'siak-cerdas': return 'Bidang Pendistribusian: Siak Cerdas';
      case 'siak-dakwah': return 'Bidang Pendistribusian: Siak Dakwah';
      case 'siak-peduli': return 'Bidang Pendistribusian: Siak Peduli';
      case 'siak-sehat': return 'Bidang Pendistribusian: Siak Sehat';
      case 'siak-sejahtera': return 'Bidang Pendistribusian: Siak Sejahtera';
      case 'atm-beras': return 'Program Khusus: ATM Beras';
      case 'rumah-singgah': return 'Program Khusus: Rumah Singgah';
      case 'bnba-recap': return 'Rekap BNBA (By Name By Address)';
      case 'profile': return 'Profil Pengguna';
      case 'settings': return 'Pengaturan Aplikasi';
      default: return 'Antrean Layanan';
    }
  };

  const activeAnnouncements = announcements.filter(a => a.isActive);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        settings={appSettings}
      />
      
      <main className="flex-1 ml-64 min-h-screen">
        <Header 
          title={getHeaderTitle()} 
          user={user}
          onProfileClick={() => setActiveTab('profile')}
          onNotificationClick={() => setShowAnnouncements(true)}
          notificationCount={activeAnnouncements.length}
        />
        
        <div className="p-8 pt-24 max-w-7xl mx-auto">
          {activeTab !== 'input' && (
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-slate-500 font-medium">Selamat datang, {user.displayName}</p>
                <h1 className="text-3xl font-bold text-slate-800">Panel Kontrol Si-PANDAI</h1>
              </div>
              
              {(activeTab === 'recipients' || activeTab.startsWith('siak-')) && (
                <button 
                  onClick={() => setActiveTab('input')}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 scale-100 hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Penerima
                </button>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {isPrinting && selectedRecipient && (
          <PrintTemplate 
            recipient={selectedRecipient} 
            onClose={() => setIsPrinting(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShowingReceipt && selectedRecipient && (
          <ReceiptTemplate
            recipient={selectedRecipient}
            onClose={() => setIsShowingReceipt(false)}
            onEdit={(rec) => {
              setIsShowingReceipt(false);
              setSelectedRecipient(rec);
              setActiveTab('input');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShowingMPZIS && selectedRecipient && (
          <MPZISTemplate
            recipient={selectedRecipient}
            onClose={() => setIsShowingMPZIS(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShowingEPPD && selectedRecipient && (
          <EPPDTemplate
            recipient={selectedRecipient}
            records={ppdRecords}
            onSaveRecord={savePPDRecordLocal}
            onDeleteRecord={deletePPDRecordLocal}
            onClose={() => setIsShowingEPPD(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShowingSurvey && selectedRecipient && (
          <SurveyTemplate
            recipient={selectedRecipient}
            onClose={() => setIsShowingSurvey(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnnouncements && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnnouncements(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[90] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-800">Pemberitahuan</h3>
                </div>
                <button 
                  onClick={() => setShowAnnouncements(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeAnnouncements.length > 0 ? activeAnnouncements.map((ann) => (
                  <div key={ann.id} className={cn(
                    "p-4 rounded-2xl border-l-4 shadow-sm",
                    ann.type === 'info' ? "bg-blue-50 border-blue-500" : 
                    ann.type === 'warning' ? "bg-amber-50 border-amber-500" : "bg-red-50 border-red-500"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {ann.type === 'info' ? <Info className="w-4 h-4 text-blue-600" /> : 
                       ann.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        ann.type === 'info' ? "text-blue-600" : 
                        ann.type === 'warning' ? "text-amber-600" : "text-red-600"
                      )}>{ann.type}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{ann.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      {new Date(ann.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </p>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                    <Bell className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold">Tidak ada pemberitahuan baru.</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => {
                    setShowAnnouncements(false);
                    setActiveTab('settings');
                  }}
                  className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  Kelola Pengumuman
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 backdrop-blur-md"
          >
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-bold">Berhasil Disimpan!</p>
              <p className="text-xs text-green-100">Data penerima bantuan telah masuk ke sistem.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


