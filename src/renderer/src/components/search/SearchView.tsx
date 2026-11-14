import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Check,
  ArrowUpDown,
  CornerDownLeft,
  Info,
} from 'lucide-react';
import type { SearchResultItem, SearchResponse, StructuredQuery } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';
import { useToast } from '../common/Toast';

const EXTENSION_FILTERS = ['All', 'pdf', 'docx', 'txt', 'md', 'png', 'jpg'];
const CATEGORY_FILTERS = ['All', 'Academics', 'Work', 'Projects', 'Finance', 'Personal', 'Images'];

const SUGGESTED_QUERIES = [
  'Waveguides notes',
  'Placement preparation',
  'Recent resume .docx',
  'Tax invoices and receipts',
  'CMOS fabrication',
  'Largest pdf files',
];

interface SearchViewProps {
  initialCategory?: string | null;
  onClearCategory?: () => void;
}

export function SearchView({ initialCategory, onClearCategory }: SearchViewProps = {}): JSX.Element {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [selectedExt, setSelectedExt] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'size' | 'name'>('relevance');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);

  // Copy Feedback State
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  // Preview Drawer State
  const [previewFile, setPreviewFile] = useState<SearchResultItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: SearchResultItem } | null>(null);

  // Global Keyboard Shortcuts (Ctrl+K or / to focus search, Escape to close preview/menu)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement !== inputRef.current)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (previewFile) {
          setPreviewFile(null);
        }
        if (contextMenu) {
          setContextMenu(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [previewFile, contextMenu]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCat(initialCategory);
      executeSearch('', initialCategory);
    }
  }, [initialCategory]);

  const executeSearch = async (
    targetQuery: string = query,
    overrideCategory?: string,
    overrideExtension?: string
  ) => {
    if (!window.api) return;

    const catToUse = overrideCategory !== undefined ? overrideCategory : selectedCat;
    const extToUse = overrideExtension !== undefined ? overrideExtension : selectedExt;

    // If query is empty and no filters are selected, return null
    if (!targetQuery.trim() && catToUse === 'All' && extToUse === 'All') {
      setSearchResponse(null);
      return;
    }

    setIsSearching(true);
    try {
      const filters: any = {};
      if (extToUse !== 'All') {
        filters.extensions = [extToUse.toLowerCase()];
      }
      if (catToUse !== 'All') {
        filters.category = catToUse;
      }

      const res = await window.api.search(targetQuery, {
        useAiInterpretation: targetQuery.trim() ? useAi : false,
        filters,
        limit: 50,
      });

      // Apply client-side sorting if different from relevance
      if (sortBy !== 'relevance' && res.results.length > 0) {
        const sorted = [...res.results];
        if (sortBy === 'date') {
          sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
        } else if (sortBy === 'size') {
          sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
        } else if (sortBy === 'name') {
          sorted.sort((a, b) => a.filename.localeCompare(b.filename));
        }
        res.results = sorted;
      }

      setSearchResponse(res);
    } catch (err: any) {
      toast.error('Search Failed', err?.message || 'Error executing search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  const handleOpenPreview = async (item: SearchResultItem) => {
    if (!window.api) return;
    setPreviewFile(item);
    setIsLoadingPreview(true);
    setCopiedPreview(false);
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
      toast.info('Opening File', filePath.split(/[/\\]/).pop());
    } catch (err: any) {
      toast.error('Cannot Open File', err.message);
    }
  };

  const handleRevealFile = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.revealFileInOS(filePath);
      toast.info('Revealed in Explorer', filePath.split(/[/\\]/).pop());
    } catch (err: any) {
      toast.error('Cannot Reveal File', err.message);
    }
  };

  const handleCopyPath = async (filePath: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedFileId(fileId);
      toast.success('Path Copied to Clipboard');
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      toast.error('Clipboard Access Denied');
    }
  };

  const handleCopyPreviewText = async () => {
    if (!previewContent) return;
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopiedPreview(true);
      toast.success('Extracted Text Copied');
      setTimeout(() => setCopiedPreview(false), 2000);
    } catch {
      toast.error('Failed to copy text');
    }
  };

  const clearFilters = () => {
    setSelectedExt('All');
    setSelectedCat('All');
    setSortBy('relevance');
    onClearCategory?.();
    if (query.trim()) {
      executeSearch(query, 'All', 'All');
    } else {
      setSearchResponse(null);
    }
  };

  const hasActiveFilters = selectedExt !== 'All' || selectedCat !== 'All' || sortBy !== 'relevance';

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
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-950/50">
            Hybrid Rank {(score * 100).toFixed(0)}%
          </span>
        );
      case 'vector':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-500/40">
            Semantic {(score * 100).toFixed(0)}%
          </span>
        );
      case 'fts':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/70 text-blue-300 border border-blue-500/40">
            Full-Text BM25
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
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
        <div className="relative flex items-center group">
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 pointer-events-none group-focus-within:text-indigo-400 transition-colors" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search naturally (e.g. 'microwave engineering notes about waveguides', 'recent resume docx')..."
            className="w-full bg-zinc-900/95 text-zinc-100 placeholder-zinc-500 pl-12 pr-40 py-3.5 rounded-xl border border-zinc-700/70 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm shadow-inner transition-all"
          />

          <div className="absolute right-3 flex items-center space-x-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSearchResponse(null);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="hidden sm:flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-400">
              <span>Ctrl</span>
              <span>K</span>
            </div>

            <button
              onClick={() => executeSearch()}
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="w-3.5 h-3.5" />
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
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                useAi
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 font-medium shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${useAi ? 'text-indigo-400 animate-pulse' : 'text-zinc-500'}`} />
              <span>AI Query Interpreter</span>
            </button>

            {/* Extension Filter Chips */}
            <div className="flex items-center space-x-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase px-1.5 font-semibold">Ext:</span>
              {EXTENSION_FILTERS.map((ext) => (
                <button
                  key={ext}
                  onClick={() => {
                    setSelectedExt(ext);
                    executeSearch(query, undefined, ext);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                    selectedExt === ext
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
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
                    executeSearch(query, cat);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                    selectedCat === cat
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Clear Filters Button if any active */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-zinc-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-zinc-800/60 transition-colors flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right Toolbar: Sort & Count */}
          <div className="flex items-center space-x-3 text-zinc-400">
            <div className="flex items-center space-x-1.5 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800">
              <ArrowUpDown className="w-3 h-3 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[11px] text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="date">Sort: Date Modified</option>
                <option value="size">Sort: File Size</option>
                <option value="name">Sort: File Name</option>
              </select>
            </div>

            {searchResponse && (
              <div className="text-zinc-500 text-[11px] font-mono">
                {searchResponse.totalCount} results ({searchResponse.executionTimeMs} ms)
              </div>
            )}
          </div>
        </div>

        {/* AI Query Interpretation Badge */}
        {searchResponse?.queryInterpreted && (
          <div className="px-3.5 py-2 rounded-lg bg-zinc-900/70 border border-indigo-500/20 text-[11px] text-zinc-300 flex flex-wrap items-center gap-3">
            <span className="text-indigo-400 font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interpreted:</span>
            </span>
            <span>Keywords: <strong className="text-zinc-100 font-mono">[{searchResponse.queryInterpreted.keywords.join(', ')}]</strong></span>
            {searchResponse.queryInterpreted.category && (
              <span>Category: <strong className="text-indigo-300">{searchResponse.queryInterpreted.category}</strong></span>
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
              <p className="text-xs font-medium">Scanning index with hybrid full-text & vector retrieval...</p>
            </div>
          )}

          {/* Initial Blank State with Suggested Prompts */}
          {!isSearching && !searchResponse && (
            <div className="max-w-2xl mx-auto py-12 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
                  <Search className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Search Your Local Library</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Type natural questions or descriptive keywords. SIFT combines SQLite FTS5 full-text matching with local MiniLM embeddings.
                </p>
              </div>

              {/* Sample Queries Chips */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center">
                  Try a sample search:
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUERIES.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => {
                        setQuery(sq);
                        executeSearch(sq);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-indigo-500/40 hover:bg-zinc-900 text-xs text-zinc-300 hover:text-indigo-200 transition-all cursor-pointer shadow-sm"
                    >
                      ⚡ {sq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Results Fallback State */}
          {!isSearching && searchResponse && searchResponse.results.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-zinc-500">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <FileText className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-300">No matching files found</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  We couldn't find any documents matching your query. Try searching with broader terms or clearing active filters.
                </p>
              </div>
            </div>
          )}

          {/* Search Result Cards */}
          {!isSearching && searchResponse && searchResponse.results.length > 0 && (
            <div className="space-y-2.5">
              {searchResponse.results.map((item) => {
                const isCopied = copiedFileId === item.fileId;
                const isSelected = previewFile?.fileId === item.fileId;
                return (
                  <div
                    key={item.fileId}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item });
                    }}
                    onClick={() => handleOpenPreview(item)}
                    className={`group p-4 rounded-xl border transition-all space-y-2.5 cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-500/60 bg-zinc-900/90 shadow-md shadow-indigo-950/40'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 shrink-0 mt-0.5">
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
                            handleCopyPath(item.filePath, item.fileId);
                          }}
                          title="Copy Full File Path"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(item);
                          }}
                          title="Quick Preview Extracted Text"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(item.filePath);
                          }}
                          title="Open in Default Application"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevealFile(item.filePath);
                          }}
                          title="Reveal in File Explorer"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Highlighted Snippets if any */}
                    {item.snippets && item.snippets.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/60 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: item.snippets[0].text
                              .replace(/<b>/g, '<mark class="bg-indigo-500/30 text-indigo-200 font-semibold px-1 py-0.5 rounded border border-indigo-500/40">')
                              .replace(/<\/b>/g, '</mark>'),
                          }}
                        />
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div className="flex items-center space-x-4 text-[10px] text-zinc-500 pt-0.5">
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
                );
              })}
            </div>
          )}
        </div>

        {/* Right-Side Quick Preview Drawer */}
        {previewFile && (
          <aside className="w-96 border-l border-zinc-800/80 bg-zinc-900/60 flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 overflow-hidden">
                <h4 className="text-xs font-semibold text-zinc-200 truncate">{previewFile.filename}</h4>
                <p className="text-[10px] text-zinc-500 font-mono">{formatBytes(previewFile.sizeBytes)} • {previewFile.category}</p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="p-3 flex items-center space-x-2 border-b border-zinc-800/60 bg-zinc-950/40">
              <button
                onClick={() => handleOpenFile(previewFile.filePath)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open File</span>
              </button>
              <button
                onClick={() => handleRevealFile(previewFile.filePath)}
                className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Reveal</span>
              </button>
              <button
                onClick={handleCopyPreviewText}
                title="Copy Extracted Content"
                className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Chunk Content */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
              {isLoadingPreview ? (
                <div className="h-32 flex items-center justify-center space-y-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
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
          className="fixed z-50 w-52 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-1 text-xs space-y-0.5 text-zinc-200 animate-in fade-in-50 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleOpenPreview(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick Preview</span>
          </button>
          <button
            onClick={() => {
              handleCopyPath(contextMenu.item.filePath, contextMenu.item.fileId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy Full Path</span>
          </button>
          <button
            onClick={() => {
              handleOpenFile(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open in Default App</span>
          </button>
          <button
            onClick={() => {
              handleRevealFile(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reveal in File Explorer</span>
          </button>
        </div>
      )}
    </div>
  );
}
