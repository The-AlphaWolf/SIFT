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
  CheckCircle2,
} from 'lucide-react';
import type { FolderInfo, CategoryInfo } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';
import { useToast } from '../common/Toast';

export function LibraryView(): JSX.Element {
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-zinc-100">Library Folders & Categories</h2>
          <p className="text-xs text-zinc-400">
            Configure root directories for recursive indexing, real-time filesystem watchers, and categories.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleReindex()}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reindex All</span>
          </button>
          <button
            onClick={handleAddFolder}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Folder</span>
          </button>
        </div>
      </div>

      {/* Folders List */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden space-y-0 shadow-sm">
        <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Monitored Directories</h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">{folders.length} configured</span>
        </div>

        {folders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6 text-zinc-600" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-300">No folders added yet</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Click "+ Add Folder" to select folders from your PC for local indexing and search.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {folders.map((folder) => {
              const isReindexing = reindexingFolderId === folder.id;
              const isCopied = copiedFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className="p-5 flex items-start justify-between hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                        {folder.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Win32 Watcher Active</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-zinc-500 font-mono truncate max-w-xl">
                        {folder.folderPath}
                      </p>
                      <button
                        onClick={() => handleCopyFolderPath(folder.folderPath, folder.id)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
                        title="Copy Path"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="flex items-center space-x-4 text-[11px] text-zinc-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <Files className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{folder.fileCount.toLocaleString()} files</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatBytes(folder.totalSizeBytes)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Last Scanned: {formatDate(folder.lastScannedAt)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleReindex(folder.id)}
                      disabled={isReindexing}
                      title="Reindex this folder"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemoveFolder(folder)}
                      title="Remove folder from library"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 transition-colors cursor-pointer"
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

      {/* Categories Explorer */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden space-y-0 shadow-sm">
        <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Library Categories</h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Auto-classification targets</span>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 space-y-1.5 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.colorHex }}
                />
                <h4 className="text-xs font-semibold text-zinc-200">{cat.name}</h4>
              </div>
              <p className="text-[10px] text-zinc-500">
                {cat.isSystem ? 'System Category' : 'Custom Category'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
