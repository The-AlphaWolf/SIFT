import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Sparkles,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  FileCheck,
  Tag,
} from 'lucide-react';
import type { OrganizationResponse, OrganizationSuggestion } from '@shared/contracts/ipc-api';

export function OrganizationView(): JSX.Element {
  const [data, setData] = useState<OrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!window.api) return;
    setIsLoading(true);
    try {
      const res = await window.api.getOrganizationSuggestions({ limit: 50, offset: 0 });
      setData(res);
    } catch (err) {
      console.error('[Organization] Failed to load suggestions:', err);
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
    } catch (err: any) {
      alert(`Could not reveal file: ${err.message}`);
    }
  };

  const handleOpen = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.openFileInOS(filePath);
    } catch (err: any) {
      alert(`Could not open file: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Smart Organization Suggestions</h2>
          <p className="text-xs text-zinc-400">
            Intelligent renaming and categorization recommendations based on document text and structure.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Suggestions</span>
        </button>
      </div>

      {/* Safety / Read-Only Preview Notice */}
      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex items-start space-x-3">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-semibold text-zinc-200">Non-Destructive Preview Mode</h4>
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-medium">
              Safety Guaranteed
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            SIFT suggests descriptive names for camera photos, browser download artifacts, untitled documents, and misfiled notes. In compliance with local safety guidelines, all suggestions are presented for review.
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {data && data.suggestions.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-2">
            <FileCheck className="w-8 h-8 text-emerald-500/70 mx-auto" />
            <h4 className="text-sm font-semibold text-zinc-300">All files are well-organized!</h4>
            <p className="text-xs text-zinc-500">
              No generic filenames or misclassified documents were identified in your library.
            </p>
          </div>
        )}

        {data &&
          data.suggestions.map((item) => (
            <div
              key={item.fileId}
              className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 overflow-hidden pr-4">
                  <div className="text-[11px] text-zinc-500 font-mono truncate max-w-2xl">
                    {item.currentPath}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-xs font-mono text-zinc-400 line-through">
                      {item.currentPath.split(/[/\\]/).pop()}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-indigo-300 font-mono">
                      {item.suggestedFilename}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleOpen(item.currentPath)}
                    title="Open File"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleReveal(item.currentPath)}
                    title="Reveal in File Explorer"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rationale & Target Category */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
                <div className="flex items-center space-x-2 text-zinc-400">
                  <span className="text-zinc-500">Rationale:</span>
                  <span>{item.reason}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-zinc-300">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  <span className="font-medium">{item.suggestedCategory}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
