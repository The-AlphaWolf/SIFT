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
} from 'lucide-react';
import type { DuplicateResponse, DuplicateFileEntry } from '@shared/contracts/ipc-api';
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
      toast.success('Path copied');
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      toast.error('Clipboard access denied');
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141415] text-[#ededed]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-base font-medium text-[#ededed]">Duplicates</h2>
          <p className="text-xs text-[#85858b]">
            Exact SHA-256 duplicate detection and storage recovery
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-2.5 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] border border-white/[0.08] text-xs font-normal flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ededed]' : ''}`} />
          <span>Scan again</span>
        </button>
      </div>

      {/* Safety Notice & Potential Savings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 rounded-xl border border-white/[0.08] bg-[#19191b] flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-[#85858b] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-[#ededed]">Execution safety protocol</h4>
            <p className="text-[11px] text-[#85858b] leading-relaxed">
              SIFT never deletes or moves files automatically. Inspect duplicate copies and reveal them in File Explorer before manual removal.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#85858b]">
            <span>Potential savings</span>
            <HardDrive className="w-4 h-4 text-[#85858b]" />
          </div>
          <div className="text-2xl font-normal text-[#ededed] font-mono tabular-nums">
            {formatBytes(data?.totalReclaimableBytes || 0)}
          </div>
          <p className="text-[11px] text-[#85858b] font-mono tabular-nums">
            Across {data?.totalGroups || 0} duplicate sets
          </p>
        </div>
      </div>

      {/* Duplicate Groups List */}
      <div className="space-y-3">
        {data && data.groups.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-white/[0.08] bg-[#19191b] space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#232325] border border-white/[0.08] flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 text-[#4cc38a]" />
            </div>
            <h4 className="text-xs font-medium text-[#ededed]">No duplicate files detected</h4>
            <p className="text-xs text-[#85858b]">
              All indexed files have unique SHA-256 cryptographic hashes
            </p>
          </div>
        )}

        {data &&
          data.groups.map((group) => {
            const isExpanded = expandedHashes.has(group.sha256Hash);
            return (
              <div
                key={group.sha256Hash}
                className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden"
              >
                {/* Group Summary Row */}
                <div
                  onClick={() => toggleExpand(group.sha256Hash)}
                  className="p-4 flex items-center justify-between hover:bg-[#232325]/50 transition-colors duration-150 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-[#85858b]">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#ededed]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#85858b]" />
                      )}
                    </button>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-[#ededed]">
                          {group.fileCount} identical copies
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04] text-[#ededed] border border-white/[0.08] font-mono tabular-nums">
                          {formatBytes(group.reclaimableBytes)} reclaimable
                        </span>
                      </div>
                      <p className="text-[10px] text-[#85858b] font-mono">
                        SHA-256: {group.sha256Hash.substring(0, 24)}...
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
                      className="text-[11px] text-[#85858b] hover:text-[#ededed] px-2 py-1 rounded bg-[#232325] hover:bg-white/[0.12] border border-white/[0.08] transition-colors flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy set</span>
                    </button>

                    <span className="font-mono tabular-nums text-xs text-[#a1a1a6]">
                      {formatBytes(group.sizeBytes)} <span className="text-[#85858b] font-sans text-[11px]">each</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Individual Files List */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-[#141415] divide-y divide-white/[0.06]">
                    {group.files.map((file, idx) => {
                      const isOldest = idx === group.files.length - 1;
                      const isCopied = copiedFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          className="p-3 pl-10 flex items-center justify-between text-xs hover:bg-[#19191b] transition-colors duration-150"
                        >
                          <div className="space-y-1 overflow-hidden pr-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  isOldest
                                    ? 'bg-white/[0.08] text-[#ededed] border border-white/[0.12]'
                                    : 'bg-white/[0.03] text-[#85858b] border border-white/[0.06]'
                                }`}
                              >
                                {isOldest ? 'Earliest copy' : `Duplicate #${idx + 1}`}
                              </span>
                              <span className="font-mono text-[11px] text-[#a1a1a6] truncate">
                                {file.filePath}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-[10px] text-[#85858b] font-mono tabular-nums">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-[#85858b]" />
                                <span>Modified: {formatDate(file.modifiedAt)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyPath(file.filePath, file.id)}
                              title="Copy file path"
                              className="p-1.5 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#85858b] hover:text-[#ededed] border border-white/[0.08] transition-colors cursor-pointer"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-[#4cc38a]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleOpen(file.filePath)}
                              title="Open file"
                              className="p-1.5 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#85858b] hover:text-[#ededed] border border-white/[0.08] transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReveal(file.filePath)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#ededed] border border-white/[0.08] text-[11px] font-normal flex items-center space-x-1.5 transition-colors cursor-pointer"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-[#85858b]" />
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
