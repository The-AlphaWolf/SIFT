import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  Files,
  FolderOpen,
  Copy,
  RefreshCw,
  FolderTree,
  ArrowRight,
  TrendingUp,
  PieChart,
  Tag,
} from 'lucide-react';
import type { SystemStats, FolderInfo } from '@shared/contracts/ipc-api';
import { formatBytes } from '../../lib/utils';

interface DashboardViewProps {
  onNavigateToSearch: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToDuplicates: () => void;
}

export function DashboardView({
  onNavigateToSearch,
  onNavigateToLibrary,
  onNavigateToDuplicates,
}: DashboardViewProps): JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const [s, f] = await Promise.all([
        window.api.getSystemStats(),
        window.api.listFolders(),
      ]);
      setStats(s);
      setFolders(f);
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalFiles = stats?.totalFiles || 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Library Overview</h2>
          <p className="text-xs text-zinc-400">
            Real-time telemetry and metadata statistics across all indexed directories.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Indexed Files</span>
            <Files className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{totalFiles.toLocaleString()}</div>
          <p className="text-[11px] text-zinc-500">Across all monitored folders</p>
        </div>

        {/* Total Storage Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Indexed Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatBytes(stats?.totalSizeBytes || 0)}</div>
          <p className="text-[11px] text-zinc-500">Local physical disk volume</p>
        </div>

        {/* Monitored Folders Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 cursor-pointer hover:border-zinc-700 transition-all" onClick={onNavigateToLibrary}>
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Monitored Roots</span>
            <FolderOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{folders.length}</div>
          <div className="text-[11px] text-indigo-400 flex items-center space-x-1">
            <span>Manage directories</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Duplicates Savings Card */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 cursor-pointer hover:border-zinc-700 transition-all" onClick={onNavigateToDuplicates}>
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Reclaimable Duplicates</span>
            <Copy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatBytes(stats?.reclaimableBytes || 0)}</div>
          <div className="text-[11px] text-amber-400/90 flex items-center space-x-1">
            <span>{stats?.duplicateCount || 0} redundant files</span>
            <ArrowRight className="w-3 h-3" />
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
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{cat}</span>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        {count.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-4 text-center">No categorised files found yet.</p>
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
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-zinc-500 py-4 text-center">No extensions indexed yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Monitored Folders Quick List */}
      <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200">Monitored Root Folders</h3>
          <button
            onClick={onNavigateToLibrary}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {folders.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            No folders indexed yet. Go to "My Library" to select directories.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {folders.map((f) => (
              <div key={f.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-zinc-200">{f.displayName}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">{f.folderPath}</div>
                </div>
                <div className="flex items-center space-x-3 text-zinc-400 text-[11px]">
                  <span>{f.fileCount} files</span>
                  <span>{formatBytes(f.totalSizeBytes)}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    Watching
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
