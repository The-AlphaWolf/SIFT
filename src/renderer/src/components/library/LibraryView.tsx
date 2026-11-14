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
          <h2 className="text-base font-medium text-[#ededed]">Folders & Categories</h2>
          <p className="text-xs text-[#85858b]">
            Monitored directories and automated classification targets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleReindex()}
            className="px-2.5 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] border border-white/[0.08] text-xs font-normal flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reindex all</span>
          </button>
          <button
            onClick={handleAddFolder}
            className="px-3 py-1.5 rounded-lg bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium surface-highlight flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add folder</span>
          </button>
        </div>
      </div>

      {/* Folders List */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-[#85858b]" />
            <h3 className="text-xs font-medium text-[#ededed]">Monitored directories</h3>
          </div>
          <span className="text-[11px] text-[#85858b] font-mono tabular-nums">
            {folders.length} configured
          </span>
        </div>

        {folders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#232325] border border-white/[0.08] flex items-center justify-center mx-auto">
              <FolderOpen className="w-5 h-5 text-[#85858b]" />
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
                      <h4 className="text-sm font-medium text-[#ededed]">
                        {folder.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#232325] text-[#4cc38a] border border-white/[0.08] flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                        <span>Watcher active</span>
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
                        {isCopied ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="flex items-center space-x-4 text-[11px] text-[#85858b] pt-0.5 font-mono tabular-nums">
                      <span className="flex items-center space-x-1.5">
                        <Files className="w-3.5 h-3.5 text-[#85858b]" />
                        <span>{folder.fileCount.toLocaleString()} files</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-[#85858b]" />
                        <span>{formatBytes(folder.totalSizeBytes)}</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#85858b]" />
                        <span>Last scanned: {formatDate(folder.lastScannedAt)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleReindex(folder.id)}
                      disabled={isReindexing}
                      title="Reindex folder"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#a1a1a6] hover:text-[#ededed] border border-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-[#ededed]' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemoveFolder(folder)}
                      title="Stop monitoring"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-[#e5484d]/20 hover:text-[#e5484d] text-[#85858b] border border-white/[0.08] transition-colors cursor-pointer"
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
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#85858b]" />
            <h3 className="text-xs font-medium text-[#ededed]">Categories</h3>
          </div>
          <span className="text-[11px] text-[#85858b]">Select to filter search</span>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => onSelectCategory?.(cat.name)}
              className="p-3 rounded-lg border border-white/[0.08] bg-[#232325]/50 space-y-2 hover:bg-[#232325] hover:border-white/[0.14] transition-colors duration-150 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#ededed] group-hover:text-white transition-colors">
                  {cat.name}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85858b] group-hover:text-[#ededed] transition-colors" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#85858b] font-mono tabular-nums">
                <span>{(cat.fileCount || 0).toLocaleString()} files</span>
                <span>{formatBytes(cat.totalSizeBytes || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
