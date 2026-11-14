import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  Files,
  FolderOpen,
  Copy,
  RefreshCw,
  FolderTree,
  ArrowRight,
  PieChart,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import type { SystemStats, FolderInfo, AIProviderConfig } from '@shared/contracts/ipc-api';
import { formatBytes } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface DashboardViewProps {
  onNavigateToSearch: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToDuplicates: () => void;
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Academics: { bg: 'bg-blue-500', text: 'text-blue-400', hex: '#3b82f6' },
  Work: { bg: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10b981' },
  Projects: { bg: 'bg-purple-500', text: 'text-purple-400', hex: '#8b5cf6' },
  Personal: { bg: 'bg-rose-500', text: 'text-rose-400', hex: '#f43f5e' },
  Finance: { bg: 'bg-amber-500', text: 'text-amber-400', hex: '#f59e0b' },
  Applications: { bg: 'bg-cyan-500', text: 'text-cyan-400', hex: '#06b6d4' },
  Images: { bg: 'bg-indigo-500', text: 'text-indigo-400', hex: '#6366f1' },
  Miscellaneous: { bg: 'bg-slate-400', text: 'text-slate-400', hex: '#94a3b8' },
};

const EXTENSION_COLORS: Record<string, string> = {
  pdf: '#ef4444',
  docx: '#3b82f6',
  doc: '#3b82f6',
  png: '#ec4899',
  jpg: '#ec4899',
  jpeg: '#ec4899',
  txt: '#06b6d4',
  md: '#06b6d4',
  ts: '#10b981',
  js: '#10b981',
  py: '#10b981',
  json: '#f59e0b',
  html: '#f97316',
};

export function DashboardView({
  onNavigateToSearch,
  onNavigateToLibrary,
  onNavigateToDuplicates,
  onSelectCategory,
}: DashboardViewProps): JSX.Element {
  const toast = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const [s, f, a] = await Promise.all([
        window.api.getSystemStats(),
        window.api.listFolders(),
        window.api.getAiSettings(),
      ]);
      setStats(s);
      setFolders(f);
      setAiConfig(a);
    } catch (err: any) {
      toast.error('Dashboard Error', err?.message || 'Failed to refresh statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!window.api?.onIndexingProgress) return;
    const unsubscribe = window.api.onIndexingProgress((event) => {
      if (event.stage === 'idle') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, []);

  const totalFiles = stats?.totalFiles || 0;
  const totalBytes = stats?.totalSizeBytes || 0;
  const reclaimableBytes = stats?.reclaimableBytes || 0;
  const duplicateCount = stats?.duplicateCount || 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141415] text-[#ededed]">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-[#ededed] flex items-center space-x-2">
            <span>Telemetry & Insights</span>
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          </h2>
          <p className="text-xs text-[#85858b]">
            Real-time metadata distribution, local AI connectivity, and index storage efficiency
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#ededed] border border-white/[0.08] hover:border-indigo-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Local AI Engine Status Card with Vivid Accents */}
      {aiConfig && (
        <div className="p-4 rounded-xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/20 via-[#19191b] to-[#19191b] flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#ededed] capitalize">
                  {aiConfig.provider} Local Engine
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  READY
                </span>
              </div>
              <p className="text-[11px] text-[#85858b] font-mono">
                Model: <strong className="text-indigo-300 font-normal">{aiConfig.model}</strong> • {aiConfig.baseUrl}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSearch}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
          >
            <span>Query library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Hierarchy with Colorful Icons and Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary Hero Metric: Indexed Storage */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-4 hover:border-emerald-500/30 transition-colors duration-150">
          <div className="flex items-center justify-between text-xs text-[#85858b]">
            <span className="font-medium text-[#a1a1a6]">Total Indexed Storage</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-semibold text-[#ededed] font-mono tabular-nums tracking-tight">
              {formatBytes(totalBytes)}
            </div>
            <p className="text-xs text-[#85858b] font-mono tabular-nums flex items-center space-x-2">
              <span className="text-emerald-400 font-medium">{totalFiles.toLocaleString()} files</span>
              <span>across {folders.length} monitored root directories</span>
            </p>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#85858b]">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>FTS5 inverted index + 384-d vector embeddings</span>
            </span>
            <span className="font-mono text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              SQLite WAL Active
            </span>
          </div>
        </div>

        {/* Right Stacked Secondary Metrics */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Monitored Roots Card */}
          <div
            onClick={onNavigateToLibrary}
            className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] hover:border-indigo-500/40 transition-colors duration-150 cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center justify-between text-xs text-[#85858b]">
              <span className="font-medium text-[#a1a1a6]">Monitored Roots</span>
              <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div className="text-xl font-semibold text-[#ededed] font-mono tabular-nums">
              {folders.length}
            </div>
            <div className="text-[11px] text-indigo-400 flex items-center justify-between">
              <span>Win32 filesystem watchers</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Duplicates Savings Card */}
          <div
            onClick={onNavigateToDuplicates}
            className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] hover:border-amber-500/40 transition-colors duration-150 cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center justify-between text-xs text-[#85858b]">
              <span className="font-medium text-[#a1a1a6]">Reclaimable Duplicates</span>
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Copy className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="text-xl font-semibold text-amber-300 font-mono tabular-nums">
              {formatBytes(reclaimableBytes)}
            </div>
            <div className="text-[11px] text-amber-400/90 flex items-center justify-between">
              <span>{duplicateCount} redundant files</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Categories & Extensions with Rich Colors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown with Vibrant Colors */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-[#ededed]">Category distribution</h3>
            </div>
            <span className="text-[11px] text-[#85858b]">Click category to browse</span>
          </div>

          <div className="space-y-2">
            {stats && Object.keys(stats.categoryCounts).length > 0 ? (
              Object.entries(stats.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                  const catTheme = CATEGORY_COLORS[cat] || { bg: 'bg-slate-400', text: 'text-slate-400', hex: '#94a3b8' };
                  return (
                    <div
                      key={cat}
                      onClick={() => onSelectCategory?.(cat)}
                      className="space-y-1 p-1.5 rounded-lg hover:bg-[#232325] transition-colors duration-150 cursor-pointer group"
                      title={`Browse ${cat} files`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catTheme.hex }} />
                          <span className="text-[#ededed] font-medium group-hover:text-indigo-300 transition-colors">
                            {cat}
                          </span>
                        </span>
                        <span className="text-[#85858b] font-mono tabular-nums text-[11px] flex items-center space-x-1">
                          <span>{count.toLocaleString()} ({percentage}%)</span>
                          <ArrowRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#232325] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%`, backgroundColor: catTheme.hex }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-[#85858b] py-6 text-center">No categorized files in index</p>
            )}
          </div>
        </div>

        {/* Extension Breakdown with Distinct Colors */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-[#ededed]">File formats</h3>
            </div>
            <span className="text-[11px] text-[#85858b]">By file extension</span>
          </div>

          <div className="space-y-2">
            {stats && Object.keys(stats.extensionCounts).length > 0 ? (
              Object.entries(stats.extensionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([ext, count]) => {
                  const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                  const color = EXTENSION_COLORS[ext.toLowerCase()] || '#8b5cf6';
                  return (
                    <div key={ext} className="space-y-1 p-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] uppercase font-semibold flex items-center space-x-1.5" style={{ color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          <span>.{ext || 'none'}</span>
                        </span>
                        <span className="text-[#85858b] font-mono tabular-nums text-[11px]">
                          {count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#232325] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-[#85858b] py-6 text-center">No extensions indexed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
