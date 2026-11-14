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
    <footer className="h-9 border-t border-zinc-800/80 bg-zinc-950/90 px-4 flex items-center justify-between text-xs text-zinc-400 select-none">
      <div className="flex items-center space-x-3 overflow-hidden">
        {isBusy ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
            <span className="font-semibold text-zinc-200 capitalize">
              {progress.stage}...
            </span>
            <span className="text-zinc-500 font-mono text-[11px]">
              [{progress.processedFiles} / {progress.totalFiles} • {percent}%]
            </span>
            <span className="text-[11px] text-zinc-500 truncate max-w-md font-mono hidden md:inline">
              {progress.currentFilePath}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
            <span>Library index up to date</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {isBusy && (
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePauseResume}
              title={progress.isPaused ? 'Resume Indexing' : 'Pause Indexing'}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              {progress.isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            </button>
            <button
              onClick={handleCancel}
              title="Cancel Indexing"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              <XSquare className="w-3 h-3 text-rose-400" />
            </button>
          </div>
        )}
        <div className="h-3 w-px bg-zinc-800 mx-1" />
        <span className="flex items-center space-x-1.5 text-[11px] text-zinc-500">
          <HardDrive className="w-3 h-3 text-zinc-500" />
          <span>Local SQLite & FTS5</span>
        </span>
      </div>
    </footer>
  );
}
