import React from 'react';
import { HardDrive, Sparkles, FolderOpen, ShieldCheck, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelected: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  onFolderSelected,
}: OnboardingModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const handleSelect = async () => {
    if (!window.api) return;
    try {
      const selected = await window.api.selectDirectoryDialog();
      if (selected) {
        await window.api.addFolder(selected);
        onFolderSelected();
        onClose();
      }
    } catch (err: any) {
      alert(`Could not add folder: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none">
      <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#19191b] shadow-2xl p-6 space-y-5 text-[#ededed] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-[#85858b] hover:text-[#ededed] hover:bg-[#232325] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#232325] border border-white/[0.08] flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4 text-[#ededed]" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-[#ededed]">SIFT</h3>
            <p className="text-xs text-[#85858b]">Local file librarian</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-[#a1a1a6] leading-relaxed">
          <p>
            SIFT indexes your documents locally with hybrid BM25 and vector search without sending any telemetry or files to the cloud.
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#85858b] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#ededed]">Hybrid Search:</strong> Match full-text contents, filenames, and semantic embeddings offline.
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-[#4cc38a] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#ededed]">Local & Private:</strong> Single-writer SQLite WAL database on local NVMe disk.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="text-xs text-[#85858b] hover:text-[#ededed] px-3 py-1.5 rounded-lg hover:bg-[#232325] transition-colors cursor-pointer"
          >
            Skip for now
          </button>
          <button
            onClick={handleSelect}
            className="px-3.5 py-1.5 rounded-lg bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium surface-highlight flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Select root directory</span>
          </button>
        </div>
      </div>
    </div>
  );
}
