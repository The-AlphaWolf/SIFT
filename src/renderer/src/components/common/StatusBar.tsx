import React, { useEffect, useState } from 'react';
import { Pause, Play, XSquare, HardDrive, Loader2, CheckCircle2 } from 'lucide-react';
import type { IndexingProgressEvent } from '@shared/contracts/ipc-api';

export function StatusBar(): JSX.Element {
  const [progress, setProgress] = useState<IndexingProgressEvent>({
    stage: 'idle',
    totalFiles: 0,
    processedFiles: 0,
    currentFilePath: '',
    isPaused: false,
  });

  useEffect(() => {
    if (!window.api?.onIndexingProgress) return;
    const unsubscribe = window.api.onIndexingProgress((event) => {
      setProgress(event);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handlePauseResume = async () => {
    if (!window.api) return;
    if (progress.isPaused) {
      await window.api.resumeIndexing();
    } else {
      await window.api.pauseIndexing();
    }
  };

  const handleCancel = async () => {
    if (!window.api) return;
    await window.api.cancelIndexing();
  };

  const isBusy = progress.stage !== 'idle';
  const percent = progress.totalFiles > 0
    ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
    : 0;

  return (
    <footer className="h-8 border-t border-white/[0.08] bg-[#0f0f10] px-3.5 flex items-center justify-between text-xs text-[#85858b] select-none shrink-0">
      <div className="flex items-center space-x-2.5 overflow-hidden">
        {isBusy ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ededed] shrink-0" />
            <span className="text-[#ededed] font-medium capitalize">
              {progress.stage}
            </span>
            <span className="text-[#85858b] font-mono tabular-nums text-[11px]">
              [{progress.processedFiles} / {progress.totalFiles} • {percent}%]
            </span>
            <span className="text-[11px] text-[#85858b] truncate max-w-md font-mono hidden md:inline">
              {progress.currentFilePath}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-[#85858b]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a] shrink-0" />
            <span className="text-[#a1a1a6]">Library index up to date</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2.5">
        {isBusy && (
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePauseResume}
              title={progress.isPaused ? 'Resume Indexing' : 'Pause Indexing'}
              className="p-1 rounded hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] transition-colors"
            >
              {progress.isPaused ? <Play className="w-3 h-3 text-[#4cc38a]" /> : <Pause className="w-3 h-3 text-[#f59e0b]" />}
            </button>
            <button
              onClick={handleCancel}
              title="Cancel Indexing"
              className="p-1 rounded hover:bg-[#232325] text-[#85858b] hover:text-[#e5484d] transition-colors"
            >
              <XSquare className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="h-3 w-px bg-white/[0.08]" />
        <span className="flex items-center space-x-1.5 text-[11px] text-[#85858b]">
          <HardDrive className="w-3 h-3 text-[#85858b]" />
          <span>Local SQLite & FTS5</span>
        </span>
      </div>
    </footer>
  );
}
