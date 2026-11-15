import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutDashboard,
  FolderOpen,
  Copy,
  FolderTree,
  Settings,
  HardDrive,
  Cpu,
} from 'lucide-react';
import type { FolderInfo, AIProviderConfig, HardwareProfile } from '@shared/contracts/ipc-api';
import { SearchView } from './components/search/SearchView';
import { DashboardView } from './components/dashboard/DashboardView';
import { LibraryView } from './components/library/LibraryView';
import { DuplicatesView } from './components/duplicates/DuplicatesView';
import { OrganizationView } from './components/organization/OrganizationView';
import { SettingsView } from './components/settings/SettingsView';
import { StatusBar } from './components/common/StatusBar';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ToastProvider, useToast } from './components/common/Toast';

type ActiveTab = 'search' | 'overview' | 'library' | 'duplicates' | 'org' | 'settings';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'search', label: 'Search', icon: Search, shortcut: 'Ctrl+1' },
  { id: 'overview', label: 'Telemetry', icon: LayoutDashboard, shortcut: 'Ctrl+2' },
  { id: 'library', label: 'Folders & Categories', icon: FolderOpen, shortcut: 'Ctrl+3' },
  { id: 'duplicates', label: 'Duplicates', icon: Copy, shortcut: 'Ctrl+4' },
  { id: 'org', label: 'Organization', icon: FolderTree, shortcut: 'Ctrl+5' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'Ctrl+6' },
];

function AppContent(): JSX.Element {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hardware, setHardware] = useState<HardwareProfile | null>(null);

  useEffect(() => {
    if (window.api) {
      window.api
        .ping()
        .then(() => setIpcConnected(true))
        .catch(() => setIpcConnected(false));

      window.api.getAiSettings().then(setAiConfig).catch(console.error);

      window.api
        .getHardwareProfile?.()
        ?.then(setHardware)
        ?.catch(console.error);

      window.api
        .listFolders()
        .then((f) => {
          setFolders(f);
          if (f.length === 0) {
            setShowOnboarding(true);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Global Tab Switching Shortcuts (Ctrl+1 through Ctrl+6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const keyMap: Record<string, ActiveTab> = {
          '1': 'search',
          '2': 'overview',
          '3': 'library',
          '4': 'duplicates',
          '5': 'org',
          '6': 'settings',
        };
        if (keyMap[e.key]) {
          e.preventDefault();
          setActiveTab(keyMap[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <div className="flex h-screen w-screen bg-[#141415] text-[#ededed] antialiased overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/[0.08] bg-[#0f0f10] flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* Logo / Brand with vivid color accent */}
          <div className="flex items-center space-x-3 px-1 pt-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold tracking-tight text-[#ededed] flex items-center space-x-2">
                <span>SIFT</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  LOCAL
                </span>
              </div>
              <div className="text-[11px] text-[#85858b] font-normal leading-none">
                Intelligent file librarian
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-200 border border-indigo-500/30 surface-highlight'
                      : 'text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#85858b]'}`} />
                    <span>{item.label}</span>
                  </div>
                  <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isActive
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                      : 'bg-white/[0.04] border border-white/[0.06] text-[#85858b]'
                  }`}>
                    {item.shortcut}
                  </kbd>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Hardware Profile / IPC indicator */}
        <div className="pt-3 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] text-[#85858b]">
            <span className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  ipcConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`}
              />
              <span className="text-[#a1a1a6]">IPC Bridge</span>
            </span>
            <span className="font-mono text-[10px] text-[#85858b]">Electron 33</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-[#19191b] border border-white/[0.08] text-[11px] text-[#85858b] flex items-center justify-between">
            <span className="flex items-center space-x-2 truncate pr-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[#ededed] font-medium truncate">
                {hardware ? hardware.summaryBadge : 'Hardware Specs'}
              </span>
            </span>
            <span className="text-indigo-300 font-mono text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
              {hardware ? hardware.ramBadge : 'Local'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Dynamic View Router */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#141415]">
          {activeTab === 'search' && (
            <SearchView
              initialCategory={selectedCategory}
              onClearCategory={() => setSelectedCategory(null)}
            />
          )}
          {activeTab === 'overview' && (
            <DashboardView
              onNavigateToSearch={() => setActiveTab('search')}
              onNavigateToLibrary={() => setActiveTab('library')}
              onNavigateToDuplicates={() => setActiveTab('duplicates')}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('search');
              }}
            />
          )}
          {activeTab === 'library' && (
            <LibraryView
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('search');
              }}
            />
          )}
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

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
