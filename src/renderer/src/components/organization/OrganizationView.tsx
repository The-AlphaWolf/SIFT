import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Sparkles,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  FileCheck,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import type { OrganizationResponse } from '@shared/contracts/ipc-api';
import { useToast } from '../common/Toast';

export function OrganizationView(): JSX.Element {
  const toast = useToast();
  const [data, setData] = useState<OrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const res = await window.api.getOrganizationSuggestions({ limit: 50, offset: 0 });
      setData(res);
    } catch (err: any) {
      toast.error('Failed to load suggestions', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCopySuggestedName = async (name: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedId(fileId);
      toast.success('Suggested name copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141415] text-[#ededed]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-[#ededed] flex items-center space-x-2">
            <span>Smart Organization Proposals</span>
            <span className="w-2 h-2 rounded-full bg-violet-400" />
          </h2>
          <p className="text-xs text-[#85858b]">
            Naming and category proposals for generic camera names and download artifacts
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-[#19191b] hover:bg-[#232325] text-[#ededed] border border-white/[0.08] hover:border-violet-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-violet-400' : 'text-violet-400'}`} />
          <span>Refresh suggestions</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-950/20 via-[#19191b] to-[#19191b] flex items-start space-x-3">
        <div className="p-1.5 rounded-md bg-violet-500/15 border border-violet-500/30 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-semibold text-[#ededed]">Interactive proposal mode</h4>
            <span className="px-2 py-0.2 rounded text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
              Read-Only Safety
            </span>
          </div>
          <p className="text-[11px] text-[#85858b] leading-relaxed">
            SIFT analyzes content and modification dates to recommend descriptive titles. Suggestions are proposals; copy the name or open the folder to apply renames.
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {data && data.suggestions.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-white/[0.08] bg-[#19191b] space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <FileCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-xs font-semibold text-[#ededed]">All files organized</h4>
            <p className="text-xs text-[#85858b] max-w-sm mx-auto">
              No generic filenames or misclassified documents were identified in your monitored library
            </p>
          </div>
        )}

        {data &&
          data.suggestions.map((item) => {
            const isCopied = copiedId === item.fileId;
            return (
              <div
                key={item.fileId}
                className="p-4 rounded-xl border border-white/[0.08] bg-[#19191b] hover:border-violet-500/30 transition-colors duration-150 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 overflow-hidden pr-4">
                    <div className="text-[11px] text-[#85858b] font-mono truncate max-w-2xl">
                      {item.currentPath}
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-xs font-mono text-[#85858b] line-through">
                        {item.currentPath.split(/[/\\]/).pop()}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-300 font-mono bg-emerald-500/15 px-2.5 py-0.5 rounded border border-emerald-500/30">
                        {item.suggestedFilename}
                      </span>
                      <button
                        onClick={() => handleCopySuggestedName(item.suggestedFilename, item.fileId)}
                        title="Copy suggested filename"
                        className="p-1 rounded text-[#85858b] hover:text-emerald-300 transition-colors"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleOpen(item.currentPath)}
                      title="Open file"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-violet-600/20 text-[#85858b] hover:text-violet-300 border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReveal(item.currentPath)}
                      title="Reveal in Explorer"
                      className="p-1.5 rounded-lg bg-[#232325] hover:bg-violet-600/20 text-[#85858b] hover:text-violet-300 border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                    </button>
                  </div>
                </div>

                {/* Rationale & Target Category */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center space-x-2 text-[#85858b]">
                    <span>Rationale:</span>
                    <span className="text-[#a1a1a6]">{item.reason}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[#85858b]">
                    <Tag className="w-3 h-3 text-violet-400" />
                    <span className="font-mono bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 text-[10px] font-medium">
                      {item.suggestedCategory}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
