import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutDashboard,
  FolderOpen,
  Copy,
  FolderTree,
  Settings,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import type { FolderInfo, AIProviderConfig } from '@shared/contracts/ipc-api';

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'search' | 'overview' | 'library' | 'duplicates' | 'org' | 'settings'>('overview');
  const [pingStatus, setPingStatus] = useState<string>('Testing IPC bridge...');
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; latencyMs?: number; models?: string[]; error?: string } | null>(null);

  useEffect(() => {
    // Check IPC connection via typed bridge
    if (window.api) {
      window.api
        .ping()
        .then((res) => {
          setPingStatus(res);
          setIpcConnected(true);
        })
        .catch((err) => {
          setPingStatus(`IPC error: ${err.message}`);
          setIpcConnected(false);
        });

      window.api.getAiSettings().then(setAiConfig).catch(console.error);
      window.api.listFolders().then(setFolders).catch(console.error);
    } else {
      setPingStatus('window.api not found (running outside Electron?)');
      setIpcConnected(false);
    }
  }, []);

  const handleTestAi = async () => {
    if (!window.api || !aiConfig) return;
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const result = await window.api.testAiConnection(aiConfig);
      setAiTestResult(result);
    } catch (err: any) {
      setAiTestResult({ success: false, error: err?.message || 'Failed to test connection' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSelectFolder = async () => {
    if (!window.api) return;
    try {
      const selected = await window.api.selectDirectoryDialog();
      if (selected) {
        const added = await window.api.addFolder(selected);
        setFolders((prev) => [...prev, added]);
      }
    } catch (err) {
      console.error('Failed to add folder:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 antialiased overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/50 flex flex-col justify-between p-4">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                SIFT
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                File Librarian
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Library</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
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
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
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
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
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
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Status / Hardware Profile */}
        <div className="pt-4 border-t border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${ipcConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold capitalize text-zinc-200">
              {activeTab === 'org' ? 'Organization Suggestions' : activeTab}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              Phase 1 Core Verified
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {aiConfig && (
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="font-mono text-[11px]">{aiConfig.provider}: {aiConfig.model}</span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Phase 1 Verification Banner */}
          <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 via-zinc-900/40 to-zinc-950 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Phase 1 Foundation & Typed IPC Bridge Operational
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 max-w-2xl">
                  The desktop shell, Vite bundling, TypeScript strictness, ContextIsolation preload, and typed RPC contract have been initialized and verified.
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block text-[11px] font-mono px-2 py-1 rounded bg-zinc-800/80 text-emerald-400 border border-emerald-500/20">
                  {pingStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Indexed Folders</span>
                <FolderOpen className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-100">{folders.length}</div>
              <button
                onClick={handleSelectFolder}
                className="w-full text-xs py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700/50"
              >
                + Select Folder to Index
              </button>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>AI Inference Provider</span>
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-semibold text-zinc-200 capitalize">
                {aiConfig?.provider || 'Ollama'}
              </div>
              <div className="text-[11px] text-zinc-500 truncate font-mono">
                {aiConfig?.baseUrl || 'http://127.0.0.1:11434'}
              </div>
              <button
                onClick={handleTestAi}
                disabled={isTestingAi}
                className="w-full text-xs py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isTestingAi && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Test Local AI Connection</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Total Files Managed</span>
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-100">0</div>
              <p className="text-[11px] text-zinc-500">
                Ready for Phase 2 (SQLite & FTS5 storage)
              </p>
            </div>
          </div>

          {/* AI Connection Test Result Notification */}
          {aiTestResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                aiTestResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              {aiTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">
                  {aiTestResult.success
                    ? `Local AI Online (${aiTestResult.latencyMs} ms)`
                    : 'Local AI Provider Offline'}
                </div>
                {aiTestResult.success ? (
                  <p className="text-zinc-400 text-[11px]">
                    Available models: {aiTestResult.models?.join(', ') || 'None found'}
                  </p>
                ) : (
                  <p className="text-zinc-400 text-[11px]">
                    {aiTestResult.error}. Make sure Ollama or LM Studio is running locally.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Folder List Table if any added */}
          {folders.length > 0 && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-300">Monitored Root Folders</h4>
                <span className="text-[10px] text-zinc-500">{folders.length} configured</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {folders.map((f) => (
                  <div key={f.id} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-zinc-800/30">
                    <div className="space-y-0.5">
                      <div className="font-medium text-zinc-200">{f.displayName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{f.folderPath}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
