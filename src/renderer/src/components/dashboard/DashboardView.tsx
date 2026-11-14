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
          <h2 className="text-base font-medium text-[#ededed]">Telemetry</h2>
          <p className="text-xs text-[#85858b]">
            Index volume, storage allocation, and inference status
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-2.5 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] border border-white/[0.08] text-xs font-normal flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ededed]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Local AI Engine Status (Quiet Card) */}
      {aiConfig && (
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#19191b] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-md bg-[#232325] border border-white/[0.08] flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5 text-[#a1a1a6]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-[#ededed] capitalize">
                  {aiConfig.provider} engine
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
              </div>
              <p className="text-[11px] text-[#85858b] font-mono">
                {aiConfig.model} • {aiConfig.baseUrl}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSearch}
            className="text-xs text-[#85858b] hover:text-[#ededed] flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <span>Query library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Hierarchy: 1 Primary Card + 2 Stacked Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary Hero Metric: Indexed Storage */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-4">
          <div className="flex items-center justify-between text-xs text-[#85858b]">
            <span>Total indexed footprint</span>
            <HardDrive className="w-4 h-4 text-[#85858b]" />
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-normal text-[#ededed] font-mono tabular-nums">
              {formatBytes(totalBytes)}
            </div>
            <p className="text-xs text-[#85858b] font-mono tabular-nums">
              {totalFiles.toLocaleString()} files across {folders.length} root directories
            </p>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#85858b]">
            <span>FTS5 inverted index + 384-d vector embeddings</span>
            <span className="font-mono text-[11px] text-[#ededed]">WAL mode</span>
          </div>
        </div>

        {/* Right Stacked Secondary Metrics */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Monitored Roots Card */}
          <div
            onClick={onNavigateToLibrary}
            className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] transition-colors duration-150 cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs text-[#85858b]">
              <span>Monitored roots</span>
              <FolderOpen className="w-4 h-4 text-[#85858b]" />
            </div>
            <div className="text-xl font-normal text-[#ededed] font-mono tabular-nums">
              {folders.length}
            </div>
            <div className="text-[11px] text-[#85858b] flex items-center justify-between">
              <span>Win32 filesystem watchers</span>
              <ArrowRight className="w-3 h-3 text-[#85858b]" />
            </div>
          </div>

          {/* Duplicates Savings Card */}
          <div
            onClick={onNavigateToDuplicates}
            className="flex-1 p-4 rounded-xl border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] transition-colors duration-150 cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs text-[#85858b]">
              <span>Reclaimable duplicates</span>
              <Copy className="w-4 h-4 text-[#85858b]" />
            </div>
            <div className="text-xl font-normal text-[#ededed] font-mono tabular-nums">
              {formatBytes(reclaimableBytes)}
            </div>
            <div className="text-[11px] text-[#85858b] flex items-center justify-between">
              <span>{duplicateCount} redundant copies</span>
              <ArrowRight className="w-3 h-3 text-[#85858b]" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Categories & Extensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-[#85858b]" />
              <h3 className="text-xs font-medium text-[#ededed]">Category distribution</h3>
            </div>
            <span className="text-[11px] text-[#85858b]">Select to filter</span>
          </div>

          <div className="space-y-2">
            {stats && Object.keys(stats.categoryCounts).length > 0 ? (
              Object.entries(stats.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count], idx) => {
                  const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                  const isTop = idx === 0;
                  return (
                    <div
                      key={cat}
                      onClick={() => onSelectCategory?.(cat)}
                      className="space-y-1 p-1.5 rounded-lg hover:bg-[#232325] transition-colors duration-150 cursor-pointer group"
                      title={`Browse ${cat} files`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#a1a1a6] group-hover:text-[#ededed] transition-colors">
                          {cat}
                        </span>
                        <span className="text-[#85858b] font-mono tabular-nums text-[11px]">
                          {count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1 w-full bg-[#232325] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTop ? 'bg-[#ededed]' : 'bg-[#525256]'
                          }`}
                          style={{ width: `${percentage}%` }}
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

        {/* Extension Breakdown */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-[#85858b]" />
              <h3 className="text-xs font-medium text-[#ededed]">File formats</h3>
            </div>
            <span className="text-[11px] text-[#85858b]">By extension</span>
          </div>

          <div className="space-y-2">
            {stats && Object.keys(stats.extensionCounts).length > 0 ? (
              Object.entries(stats.extensionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([ext, count], idx) => {
                  const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
                  const isTop = idx === 0;
                  return (
                    <div key={ext} className="space-y-1 p-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#a1a1a6] font-mono text-[11px]">
                          .{ext || 'none'}
                        </span>
                        <span className="text-[#85858b] font-mono tabular-nums text-[11px]">
                          {count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1 w-full bg-[#232325] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTop ? 'bg-[#ededed]' : 'bg-[#525256]'
                          }`}
                          style={{ width: `${percentage}%` }}
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
