import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  HardDrive,
  Calendar,
  Files,
  Tag,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import type { FolderInfo, CategoryInfo } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';
import { useToast } from '../common/Toast';

interface LibraryViewProps {
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_ACCENTS: Record<string, string> = {
  Academics: '#3b82f6',
  Work: '#10b981',
  Projects: '#8b5cf6',
  Personal: '#f43f5e',
  Finance: '#f59e0b',
  Applications: '#06b6d4',
  Images: '#6366f1',
  Miscellaneous: '#94a3b8',
};

export function LibraryView({ onSelectCategory }: LibraryViewProps): JSX.Element {
  const toast = useToast();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reindexingFolderId, setReindexingFolderId] = useState<string | null>(null);
  const [copiedFolderId, setCopiedFolderId] = useState<string | null>(null);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const [f, c] = await Promise.all([
        window.api.listFolders(),
        window.api.listCategories(),
      ]);
      setFolders(f);
      setCategories(c);
    } catch (err: any) {
      toast.error('Library Load Failed', err?.message);
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

  const handleAddFolder = async () => {
    if (!window.api) return;
    try {
      const selected = await window.api.selectDirectoryDialog();
      if (selected) {
        const added = await window.api.addFolder(selected);
        setFolders((prev) => [...prev, added]);
        toast.success('Directory Added to Library', added.displayName);
      }
    } catch (err: any) {
      toast.error('Could Not Add Folder', err.message);
    }
  };

  const handleRemoveFolder = async (folder: FolderInfo) => {
    if (!window.api) return;
    if (confirm(`Stop monitoring '${folder.displayName}'? SIFT will remove its indexed metadata.`)) {
      try {
        await window.api.removeFolder(folder.id);
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        toast.info('Folder Removed', folder.displayName);
      } catch (err: any) {
        toast.error('Remove Failed', err.message);
      }
    }
  };

  const handleReindex = async (folderId?: string) => {
    if (!window.api) return;
    if (folderId) setReindexingFolderId(folderId);
    try {
      await window.api.triggerReindex(folderId);
      toast.info('Reindexing Started in Background');
      await loadData();
    } catch (err: any) {
      toast.error('Reindexing Failed', err.message);
    } finally {
      setReindexingFolderId(null);
    }
  };

  const handleCopyFolderPath = async (folderPath: string, folderId: string) => {
    try {
      await navigator.clipboard.writeText(folderPath);
      setCopiedFolderId(folderId);
      toast.success('Folder Path Copied');
      setTimeout(() => setCopiedFolderId(null), 2000);
    } catch {
      toast.error('Clipboard Access Denied');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141415] text-[#ededed]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-[#ededed] flex items-center space-x-2">
            <span>Library Folders & Categories</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </h2>
          <p className="text-xs text-[#85858b]">
            Configure root directories for recursive indexing, real-time filesystem watchers, and categories
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleReindex()}
            className="px-3 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#ededed] border border-white/[0.08] hover:border-indigo-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reindex all</span>
          </button>
          <button
            onClick={handleAddFolder}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add folder</span>
          </button>
        </div>
      </div>

      {/* Folders List */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#19191b]">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-[#ededed]">Monitored directories</h3>
          </div>
          <span className="text-[11px] text-indigo-300 font-mono tabular-nums bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {folders.length} configured
          </span>
        </div>

        {folders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#232325] border border-white/[0.08] flex items-center justify-center mx-auto">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#ededed]">No folders monitored yet</p>
              <p className="text-[11px] text-[#85858b] max-w-sm mx-auto">
                Add a directory to begin recursive full-text and vector indexing
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {folders.map((folder) => {
              const isReindexing = reindexingFolderId === folder.id;
              const isCopied = copiedFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className="p-4 flex items-start justify-between hover:bg-[#232325]/40 transition-colors duration-150 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="text-sm font-semibold text-[#ededed] group-hover:text-indigo-300 transition-colors">
                        {folder.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Win32 Watcher Active</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-[#85858b] font-mono truncate max-w-xl">
                        {folder.folderPath}
                      </p>
                      <button
                        onClick={() => handleCopyFolderPath(folder.folderPath, folder.id)}
                        className="text-[#85858b] hover:text-[#ededed] p-0.5 rounded transition-colors cursor-pointer"
                        title="Copy Path"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="flex items-center space-x-4 text-[11px] text-[#85858b] pt-0.5 font-mono tabular-nums">
                      <span className="flex items-center space-x-1.5">
                        <Files className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[#a1a1a6] font-medium">{folder.fileCount.toLocaleString()} files</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[#a1a1a6]">{formatBytes(folder.totalSizeBytes)}</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Last scanned: {formatDate(folder.lastScannedAt)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleReindex(folder.id)}
                      disabled={isReindexing}
                      title="Reindex folder"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-indigo-600/20 text-[#a1a1a6] hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemoveFolder(folder)}
                      title="Stop monitoring"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-rose-500/20 hover:text-rose-400 text-[#85858b] border border-white/[0.08] hover:border-rose-500/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Categories Explorer with Rich Vibrant Badges */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-[#ededed]">Library Categories</h3>
          </div>
          <span className="text-[11px] text-indigo-300 font-medium">Click any category to browse its files</span>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const colorHex = cat.colorHex || CATEGORY_ACCENTS[cat.name] || '#94a3b8';
            return (
              <div
                key={cat.name}
                onClick={() => onSelectCategory?.(cat.name)}
                className="p-3.5 rounded-xl border border-white/[0.08] bg-[#232325]/50 space-y-2 hover:bg-[#232325] transition-all duration-150 cursor-pointer group shadow-sm"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: colorHex,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="text-xs font-semibold text-[#ededed] group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#85858b] group-hover:text-[#ededed] group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#85858b] font-mono tabular-nums">
                  <span className="text-[#a1a1a6] font-medium">{(cat.fileCount || 0).toLocaleString()} files</span>
                  <span>{formatBytes(cat.totalSizeBytes || 0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
