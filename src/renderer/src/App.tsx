import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutDashboard,
  FolderOpen,
  Copy,
  FolderTree,
  Settings,
  Cpu,
  HardDrive,
} from 'lucide-react';
import type { FolderInfo, AIProviderConfig } from '@shared/contracts/ipc-api';
import { SearchView } from './components/search/SearchView';
import { DashboardView } from './components/dashboard/DashboardView';
import { LibraryView } from './components/library/LibraryView';
import { DuplicatesView } from './components/duplicates/DuplicatesView';
import { OrganizationView } from './components/organization/OrganizationView';
import { SettingsView } from './components/settings/SettingsView';
import { StatusBar } from './components/common/StatusBar';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'search' | 'overview' | 'library' | 'duplicates' | 'org' | 'settings'>('search');
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  useEffect(() => {
    if (window.api) {
      window.api
        .ping()
        .then(() => setIpcConnected(true))
        .catch(() => setIpcConnected(false));

      window.api.getAiSettings().then(setAiConfig).catch(console.error);

      window.api.listFolders().then((f) => {
        setFolders(f);
        if (f.length === 0) {
          setShowOnboarding(true);
        }
      }).catch(console.error);
    }
  }, []);

  const refreshFolders = async () => {
    if (!window.api) return;
    try {
      const f = await window.api.listFolders();
      setFolders(f);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 antialiased overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                SIFT
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Local File Librarian
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Library</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>My Library</span>
            </button>

            <button
              onClick={() => setActiveTab('duplicates')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'duplicates'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Duplicates</span>
            </button>

            <button
              onClick={() => setActiveTab('org')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'org'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Organization</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Hardware Profile / IPC indicator */}
        <div className="pt-4 border-t border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  ipcConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>IPC Bridge</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-500">Electron 33</span>
          </div>

          <div className="p-2 rounded-md bg-zinc-950/60 border border-zinc-800/80 text-[10px] text-zinc-400 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ryzen 7 • RTX 3050</span>
            </span>
            <span className="text-zinc-500">24 GB</span>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Dynamic View Router */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'search' && <SearchView />}
          {activeTab === 'overview' && (
            <DashboardView
              onNavigateToSearch={() => setActiveTab('search')}
              onNavigateToLibrary={() => setActiveTab('library')}
              onNavigateToDuplicates={() => setActiveTab('duplicates')}
            />
          )}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'duplicates' && <DuplicatesView />}
          {activeTab === 'org' && <OrganizationView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Live Indexing Docked Status Bar */}
        <StatusBar />
      </div>

      {/* First-Launch Onboarding Wizard */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onFolderSelected={() => {
          refreshFolders();
          setActiveTab('search');
        }}
      />
    </div>
  );
}
