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
  AlertCircle,
  Sparkles,
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

const CATEGORY_COLORS: Record<string, string> = {
  Academics: '#3B82F6',
  Work: '#10B981',
  Projects: '#8B5CF6',
  Personal: '#EC4899',
  Finance: '#F59E0B',
  Applications: '#06B6D4',
  Images: '#6366F1',
  Miscellaneous: '#64748B',
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header & Refresh */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-zinc-100">Library Telemetry</h2>
          <p className="text-xs text-zinc-400">
            Real-time metadata distribution, local AI connectivity, and index storage efficiency.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* AI Inference Provider Banner */}
      {aiConfig && (
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-zinc-900/40 to-zinc-950 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-zinc-200 capitalize">
                  {aiConfig.provider} Local Engine
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Model: {aiConfig.model} • {aiConfig.baseUrl}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSearch}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <span>Query with AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Indexed Files</span>
            <Files className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{totalFiles.toLocaleString()}</div>
          <p className="text-[11px] text-zinc-500">Across monitored roots</p>
        </div>

        {/* Total Storage Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Indexed Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{formatBytes(stats?.totalSizeBytes || 0)}</div>
          <p className="text-[11px] text-zinc-500">Physical volume indexed</p>
        </div>

        {/* Monitored Folders Card */}
        <div
          onClick={onNavigateToLibrary}
          className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 cursor-pointer hover:border-indigo-500/40 hover:bg-zinc-900/60 transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Monitored Roots</span>
            <FolderOpen className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{folders.length}</div>
          <div className="text-[11px] text-indigo-400 flex items-center space-x-1">
            <span>Manage directories</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Duplicates Savings Card */}
        <div
          onClick={onNavigateToDuplicates}
          className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 cursor-pointer hover:border-amber-500/40 hover:bg-zinc-900/60 transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Reclaimable Duplicates</span>
            <Copy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{formatBytes(stats?.reclaimableBytes || 0)}</div>
          <div className="text-[11px] text-amber-400/90 flex items-center space-x-1">
            <span>{stats?.duplicateCount || 0} redundant files</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Categories & Extensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-zinc-200">Category Distribution</h3>
            </div>
            <span className="text-[11px] text-zinc-500">Auto & manual tags</span>
          </div>

          <div className="space-y-3">
            {stats && Object.keys(stats.categoryCounts).length > 0 ? (
              Object.entries(stats.categoryCounts).map(([cat, count]) => {
                const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                const color = CATEGORY_COLORS[cat] || '#64748B';
                return (
                  <div
                    key={cat}
                    onClick={() => onSelectCategory?.(cat)}
                    className="space-y-1 p-1 rounded-lg hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    title={`Browse all ${cat} files`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-zinc-300 font-medium group-hover:text-indigo-300 transition-colors">{cat}</span>
                      </span>
                      <span className="text-zinc-500 font-mono text-[11px] flex items-center space-x-1">
                        <span>{count.toLocaleString()} ({percentage}%)</span>
                        <ArrowRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">No categorized files in index yet.</p>
            )}
          </div>
        </div>

        {/* Extension Breakdown */}
        <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200">File Type Breakdown</h3>
            </div>
            <span className="text-[11px] text-zinc-500">By format</span>
          </div>

          <div className="space-y-3">
            {stats && Object.keys(stats.extensionCounts).length > 0 ? (
              Object.entries(stats.extensionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([ext, count]) => {
                  const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                  return (
                    <div key={ext} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-mono text-[11px] uppercase">
                          .{ext || 'none'}
                        </span>
                        <span className="text-zinc-500 font-mono text-[11px]">
                          {count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/90 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">No extensions indexed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
