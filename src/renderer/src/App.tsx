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
import type { FolderInfo, AIProviderConfig } from '@shared/contracts/ipc-api';
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

  useEffect(() => {
    if (window.api) {
      window.api
        .ping()
        .then(() => setIpcConnected(true))
        .catch(() => setIpcConnected(false));

      window.api.getAiSettings().then(setAiConfig).catch(console.error);

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
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3 px-1.5 pt-1">
            <div className="w-7 h-7 rounded-md bg-[#232325] border border-white/[0.08] flex items-center justify-center shrink-0">
              <HardDrive className="w-3.5 h-3.5 text-[#ededed]" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium tracking-tight text-[#ededed]">
                SIFT
              </div>
              <div className="text-[11px] text-[#85858b] font-normal leading-none">
                Local file librarian
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-normal transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#232325] text-[#ededed] border border-white/[0.08] surface-highlight'
                      : 'text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#ededed]' : 'text-[#85858b]'}`} />
                    <span>{item.label}</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-[#85858b]">
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
                className={`w-1.5 h-1.5 rounded-full ${
                  ipcConnected ? 'bg-[#4cc38a]' : 'bg-[#e5484d]'
                }`}
              />
              <span className="text-[#a1a1a6]">IPC Bridge</span>
            </span>
            <span className="font-mono text-[10px] text-[#85858b]">Electron 33</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-[#19191b] border border-white/[0.08] text-[11px] text-[#85858b] flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-[#85858b]" />
              <span className="text-[#a1a1a6]">Ryzen 7 • RTX 3050</span>
            </span>
            <span className="text-[#85858b] font-mono text-[10px]">24 GB</span>
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
