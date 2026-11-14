import React from 'react';
import { HardDrive, Sparkles, FolderOpen, ArrowRight, ShieldCheck, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl p-6 space-y-6 text-zinc-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <HardDrive className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">Welcome to SIFT</h3>
            <p className="text-xs text-zinc-400">Your Local-First Intelligent File Librarian</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
          <p>
            SIFT transforms your unorganized documents into a fast, searchable personal library without sending any data to the cloud.
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Natural-Language Search:</strong> Find files by describing what you remember (e.g. <em>"microwave engineering waveguide notes"</em>).
              </span>
            </div>
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>100% Offline & Private:</strong> Runs locally on your machine with SQLite FTS5, ONNX MiniLM vector search, and Ollama or LM Studio.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center space-x-2 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select First Folder to Index</span>
          </button>
        </div>
      </div>
    </div>
  );
}
