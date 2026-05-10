import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Bell,
  GraduationCap,
  BookOpen,
  Heart,
  Activity,
  Wallet,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  Package,
  Home
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SIAK_COMPANIONS } from '../constants';
import { AppSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  settings?: AppSettings | null;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, settings }: SidebarProps) {
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Input Data', icon: UserPlus },
    { id: 'recipients', label: 'Konter Layanan', icon: Users },
    { id: 'bnba-recap', label: 'Rekap BNBA', icon: FileBarChart, isSub: true },
    { id: 'siak-cerdas', label: 'Siak Cerdas', icon: GraduationCap },
    { id: 'siak-dakwah', label: 'Siak Dakwah', icon: BookOpen },
    { id: 'siak-peduli', label: 'Siak Peduli', icon: Heart },
    { id: 'siak-sehat', label: 'Siak Sehat', icon: Activity },
    { id: 'siak-sejahtera', label: 'Siak Sejahtera', icon: Wallet },
    { id: 'atm-beras', label: 'ATM Beras', icon: Package, isSub: true },
    { id: 'rumah-singgah', label: 'Rumah Singgah', icon: Home, isSub: true },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col p-4 overflow-y-auto hidden-scrollbar">
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Users className="w-6 h-6 text-white" />
          )}
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">{settings?.appName || 'Si-PANDAI'}</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-6 pb-20">
        <div className="space-y-1">
          {menuItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                item.isSub && "ml-4 w-[calc(100%-1rem)]"
              )}
            >
              <item.icon className={cn("w-5 h-5", item.isSub && "w-4 h-4")} />
              <span className={cn(item.isSub && "text-xs")}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => setIsCompanionOpen(!isCompanionOpen)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              activeTab.startsWith('companion-') 
                ? "bg-indigo-600/20 text-indigo-400" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span>Pendamping Program</span>
            </div>
            {isCompanionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {isCompanionOpen && (
            <div className="ml-9 space-y-1 mt-1 border-l border-slate-800 pl-4">
              {SIAK_COMPANIONS.map((companion) => (
                <button
                  key={companion}
                  onClick={() => setActiveTab(`companion-${companion.toLowerCase().replace(/\s+/g, '-')}`)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors text-xs font-semibold",
                    activeTab === `companion-${companion.toLowerCase().replace(/\s+/g, '-')}`
                      ? "text-indigo-400" 
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {companion}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="pt-4 mt-4 border-t border-slate-800">
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
            activeTab === 'settings' 
              ? "bg-indigo-600 text-white" 
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Settings className="w-5 h-5" />
          Pengaturan
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors text-sm font-medium mt-2"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </div>
  );
}

export function Header({ 
  title, 
  user, 
  onProfileClick, 
  onNotificationClick, 
  notificationCount = 0 
}: { 
  title: string; 
  user?: any; 
  onProfileClick?: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
}) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari data..." 
            className="pl-10 pr-4 py-2 bg-slate-100 border-transparent border focus:border-indigo-500 focus:bg-white rounded-full text-sm outline-none w-64 transition-all"
          />
        </div>
        
        <button 
          onClick={onNotificationClick}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center min-w-[18px]">
              {notificationCount}
            </span>
          )}
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        
        <button onClick={onProfileClick} className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors text-left">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{user?.displayName || 'Admin Keuangan'}</p>
            <p className="text-xs text-slate-400">{user?.email || 'Staff Administrasi'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'Felix'}`} alt="avatar" />
          </div>
        </button>
      </div>
    </header>
  );
}
