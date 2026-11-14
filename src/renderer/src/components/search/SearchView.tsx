import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  FileText,
  FileCode,
  Image as ImageIcon,
  File as FileIcon,
  ExternalLink,
  FolderOpen,
  Eye,
  Filter,
  X,
  Clock,
  HardDrive,
  Loader2,
  Check,
} from 'lucide-react';
import type { SearchResultItem, SearchResponse, StructuredQuery } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';

const EXTENSION_FILTERS = ['All', 'pdf', 'docx', 'txt', 'md', 'png', 'jpg'];
const CATEGORY_FILTERS = ['All', 'Academics', 'Work', 'Projects', 'Finance', 'Personal', 'Images'];

export function SearchView(): JSX.Element {
  const [query, setQuery] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [selectedExt, setSelectedExt] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);

  // Preview Drawer State
  const [previewFile, setPreviewFile] = useState<SearchResultItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: SearchResultItem } | null>(null);

  const executeSearch = async (targetQuery: string = query) => {
    if (!window.api || !targetQuery.trim()) {
      setSearchResponse(null);
      return;
    }

    setIsSearching(true);
    try {
      const filters: any = {};
      if (selectedExt !== 'All') {
        filters.extensions = [selectedExt.toLowerCase()];
      }
      if (selectedCat !== 'All') {
        filters.category = selectedCat;
      }

      const res = await window.api.search(targetQuery, {
        useAiInterpretation: useAi,
        filters,
        limit: 50,
      });
      setSearchResponse(res);
    } catch (err) {
      console.error('[Search] Execution failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleOpenPreview = async (item: SearchResultItem) => {
    if (!window.api) return;
    setPreviewFile(item);
    setIsLoadingPreview(true);
    try {
      const res = await window.api.getFilePreview(item.fileId);
      setPreviewContent(res.content);
    } catch (err: any) {
      setPreviewContent(`Failed to load preview: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.openFileInOS(filePath);
    } catch (err: any) {
      alert(`Could not open file: ${err.message}`);
    }
  };

  const handleRevealFile = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.revealFileInOS(filePath);
    } catch (err: any) {
      alert(`Could not reveal file: ${err.message}`);
    }
  };

  const getFileIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(lower)) {
      return <ImageIcon className="w-5 h-5 text-pink-400" />;
    }
    if (['ts', 'js', 'py', 'rs', 'go', 'cpp', 'html', 'css', 'json'].includes(lower)) {
      return <FileCode className="w-5 h-5 text-indigo-400" />;
    }
    if (['pdf', 'docx', 'txt', 'md'].includes(lower)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <FileIcon className="w-5 h-5 text-zinc-400" />;
  };

  const renderBadge = (matchType: SearchResultItem['matchType'], score: number) => {
    switch (matchType) {
      case 'hybrid':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
            Hybrid {(score * 100).toFixed(0)}%
          </span>
        );
      case 'vector':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 text-purple-300 border border-purple-500/30">
            Semantic {(score * 100).toFixed(0)}%
          </span>
        );
      case 'fts':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-500/30">
            Full-Text
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
            Filename
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Top Search Controls Bar */}
      <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/30 space-y-4">
        {/* Natural Language Search Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search naturally (e.g. 'microwave engineering notes about waveguides', 'recent resume docx')..."
            className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 pl-12 pr-32 py-3 rounded-xl border border-zinc-700/60 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-inner transition-all"
          />
          <div className="absolute right-3 flex items-center space-x-2">
            <button
              onClick={() => executeSearch()}
              disabled={isSearching}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar & AI Interpretation Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* AI Toggle */}
            <button
              onClick={() => setUseAi(!useAi)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                useAi
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 font-medium'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${useAi ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span>AI Query Interpretation</span>
            </button>

            {/* Extension Filter Chips */}
            <div className="flex items-center space-x-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase px-1.5 font-semibold">Ext:</span>
              {EXTENSION_FILTERS.map((ext) => (
                <button
                  key={ext}
                  onClick={() => {
                    setSelectedExt(ext);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                    selectedExt === ext
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {ext}
                </button>
              ))}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center space-x-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase px-1.5 font-semibold">Cat:</span>
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCat(cat);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                    selectedCat === cat
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {searchResponse && (
            <div className="text-zinc-500 text-[11px]">
              Found {searchResponse.totalCount} files in {searchResponse.executionTimeMs} ms
            </div>
          )}
        </div>

        {/* AI Query Interpretation Badge if query interpreted */}
        {searchResponse?.queryInterpreted && (
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center space-x-3">
            <span className="text-indigo-400 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Interpreted:</span>
            </span>
            <span>Keywords: <strong className="text-zinc-200">[{searchResponse.queryInterpreted.keywords.join(', ')}]</strong></span>
            {searchResponse.queryInterpreted.category && (
              <span>Category: <strong className="text-zinc-200">{searchResponse.queryInterpreted.category}</strong></span>
            )}
            {searchResponse.queryInterpreted.extensions && (
              <span>Extensions: <strong className="text-zinc-200">[{searchResponse.queryInterpreted.extensions.join(', ')}]</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Main Results / Empty State Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isSearching && (
            <div className="h-48 flex flex-col items-center justify-center space-y-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs">Searching local library with hybrid ranking...</p>
            </div>
          )}

          {!isSearching && !searchResponse && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Search className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-400">Start Searching Your Library</h3>
                <p className="text-xs max-w-sm text-zinc-500">
                  Search across PDF, DOCX, TXT, code files and images using natural language queries.
                </p>
              </div>
            </div>
          )}

          {!isSearching && searchResponse && searchResponse.results.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <FileText className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-300">No matching files found</h3>
                <p className="text-xs text-zinc-500">
                  Try adjusting your search terms or clearing extension and category filters.
                </p>
              </div>
            </div>
          )}

          {!isSearching && searchResponse && searchResponse.results.length > 0 && (
            <div className="space-y-2.5">
              {searchResponse.results.map((item) => (
                <div
                  key={item.fileId}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item });
                  }}
                  className="group p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700/80 transition-all space-y-2 cursor-pointer"
                  onClick={() => handleOpenPreview(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5">
                        {getFileIcon(item.extension)}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                            {item.filename}
                          </h4>
                          {renderBadge(item.matchType, item.score)}
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono truncate max-w-xl">
                          {item.filePath}
                        </p>
                      </div>
                    </div>

                    {/* Quick Hover Action Buttons */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(item);
                        }}
                        title="Quick Preview"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFile(item.filePath);
                        }}
                        title="Open in Native Application"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevealFile(item.filePath);
                        }}
                        title="Reveal in File Explorer"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Snippets if any */}
                  {item.snippets && item.snippets.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/60 text-[11px] text-zinc-400 line-clamp-2">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: item.snippets[0].text
                            .replace(/<b>/g, '<mark class="bg-indigo-500/30 text-indigo-200 font-semibold px-0.5 rounded">')
                            .replace(/<\/b>/g, '</mark>'),
                        }}
                      />
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="flex items-center space-x-4 text-[10px] text-zinc-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{formatBytes(item.sizeBytes)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Modified: {formatDate(item.modifiedAt)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right-Side Quick Preview Drawer */}
        {previewFile && (
          <aside className="w-96 border-l border-zinc-800/80 bg-zinc-900/60 flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 overflow-hidden">
                <h4 className="text-xs font-semibold text-zinc-200 truncate">{previewFile.filename}</h4>
                <p className="text-[10px] text-zinc-500">{formatBytes(previewFile.sizeBytes)} • {previewFile.category}</p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex items-center space-x-2 border-b border-zinc-800/60 bg-zinc-950/30">
              <button
                onClick={() => handleOpenFile(previewFile.filePath)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open File</span>
              </button>
              <button
                onClick={() => handleRevealFile(previewFile.filePath)}
                className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Reveal</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
              {isLoadingPreview ? (
                <div className="h-32 flex items-center justify-center space-x-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Loading text chunks...</span>
                </div>
              ) : (
                previewContent || 'No text extracted.'
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-1 text-xs space-y-0.5 text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleOpenPreview(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span>Quick Preview</span>
          </button>
          <button
            onClick={() => {
              handleOpenFile(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open in Default App</span>
          </button>
          <button
            onClick={() => {
              handleRevealFile(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reveal in File Explorer</span>
          </button>
        </div>
      )}
    </div>
  );
}
