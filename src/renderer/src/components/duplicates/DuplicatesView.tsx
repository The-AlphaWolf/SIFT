import React, { useEffect, useState } from 'react';
import {
  Copy,
  HardDrive,
  FolderOpen,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Check,
  Files,
} from 'lucide-react';
import type { DuplicateResponse, DuplicateGroup, DuplicateFileEntry } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';
import { useToast } from '../common/Toast';

export function DuplicatesView(): JSX.Element {
  const toast = useToast();
  const [data, setData] = useState<DuplicateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const res = await window.api.getDuplicateGroups({ limit: 50, offset: 0 });
      setData(res);
      // Auto-expand top 3 groups
      const initialSet = new Set<string>();
      res.groups.slice(0, 3).forEach((g) => initialSet.add(g.sha256Hash));
      setExpandedHashes(initialSet);
    } catch (err: any) {
      toast.error('Scan Failed', err?.message || 'Failed to detect duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (hash: string) => {
    setExpandedHashes((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  };

  const handleReveal = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.revealFileInOS(filePath);
      toast.info('Revealed in Explorer', filePath.split(/[/\\]/).pop());
    } catch (err: any) {
      toast.error('Reveal Failed', err.message);
    }
  };

  const handleOpen = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.openFileInOS(filePath);
    } catch (err: any) {
      toast.error('Open Failed', err.message);
    }
  };

  const handleCopyPath = async (filePath: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedFileId(fileId);
      toast.success('Path Copied to Clipboard');
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      toast.error('Clipboard Access Denied');
    }
  };

  const handleCopyAllInGroup = async (files: DuplicateFileEntry[]) => {
    try {
      const text = files.map((f) => f.filePath).join('\n');
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${files.length} paths in set`);
    } catch {
      toast.error('Failed to copy paths');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-zinc-100">Exact Duplicate Detection</h2>
          <p className="text-xs text-zinc-400">
            Cryptographic SHA-256 duplicate detection with byte-level precision and storage recovery metrics.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Scan Again</span>
        </button>
      </div>

      {/* Safety Notice & Potential Savings Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-zinc-200">Execution Safety Protocol</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              SIFT never deletes or moves files automatically. Use the "Reveal in Explorer" buttons below to inspect duplicate copies before choosing to clean them up.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>Potential Savings</span>
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {formatBytes(data?.totalReclaimableBytes || 0)}
          </div>
          <p className="text-[11px] text-zinc-500">
            Across {data?.totalGroups || 0} duplicate sets
          </p>
        </div>
      </div>

      {/* Duplicate Groups List */}
      <div className="space-y-3">
        {data && data.groups.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">No duplicate files detected</h4>
            <p className="text-xs text-zinc-500">
              All indexed files have unique SHA-256 cryptographic hashes.
            </p>
          </div>
        )}

        {data &&
          data.groups.map((group) => {
            const isExpanded = expandedHashes.has(group.sha256Hash);
            return (
              <div
                key={group.sha256Hash}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-sm"
              >
                {/* Group Summary Row */}
                <div
                  onClick={() => toggleExpand(group.sha256Hash)}
                  className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-zinc-500">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-300" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-zinc-200">
                          {group.fileCount} Identical Copies
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-400 border border-amber-500/20 font-medium">
                          {formatBytes(group.reclaimableBytes)} Reclaimable
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        SHA-256: {group.sha256Hash.substring(0, 28)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAllInGroup(group.files);
                      }}
                      title="Copy all paths in group"
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Set</span>
                    </button>

                    <span className="font-mono text-xs text-zinc-300">
                      {formatBytes(group.sizeBytes)} <span className="text-zinc-500 font-sans text-[11px]">each</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Individual Files List */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/60 bg-zinc-950/50 divide-y divide-zinc-800/40">
                    {group.files.map((file, idx) => {
                      const isOldest = idx === group.files.length - 1;
                      const isCopied = copiedFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          className="p-3.5 pl-10 flex items-center justify-between text-xs hover:bg-zinc-900/40 transition-colors"
                        >
                          <div className="space-y-1 overflow-hidden pr-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                  isOldest
                                    ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {isOldest ? 'Earliest Copy' : `Duplicate #${idx + 1}`}
                              </span>
                              <span className="font-mono text-[11px] text-zinc-300 truncate">
                                {file.filePath}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-[10px] text-zinc-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Modified: {formatDate(file.modifiedAt)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleCopyPath(file.filePath, file.id)}
                              title="Copy File Path"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleOpen(file.filePath)}
                              title="Open File"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReveal(file.filePath)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Reveal</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
