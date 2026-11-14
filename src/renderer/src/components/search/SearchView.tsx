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
  X,
  Clock,
  HardDrive,
  Loader2,
  Copy,
  Check,
  ArrowUpDown,
  CornerDownLeft,
} from 'lucide-react';
import type { SearchResultItem, SearchResponse } from '@shared/contracts/ipc-api';
import { formatBytes, formatDate } from '../../lib/utils';
import { useToast } from '../common/Toast';

const EXTENSION_FILTERS = ['All', 'pdf', 'docx', 'txt', 'md', 'png', 'jpg'];
const CATEGORY_FILTERS = ['All', 'Academics', 'Work', 'Projects', 'Finance', 'Personal', 'Images'];

const SUGGESTED_QUERIES = [
  'Waveguides notes',
  'Placement preparation',
  'Resume docx',
  'Tax invoices and receipts',
  'CMOS fabrication',
  'Largest PDF files',
];

const CATEGORY_TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Academics: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  Work: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  Projects: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  Personal: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  Finance: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  Applications: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  Images: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  Miscellaneous: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
};

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

  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  // Preview Drawer State
  const [previewFile, setPreviewFile] = useState<SearchResultItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Global Keyboard Shortcuts (Ctrl+K or / to focus search, Escape to close preview)
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [previewFile]);

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
      toast.error('Search failed', err?.message || 'Error executing search');
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
      toast.info('Opening file', filePath.split(/[/\\]/).pop());
    } catch (err: any) {
      toast.error('Cannot open file', err.message);
    }
  };

  const handleRevealFile = async (filePath: string) => {
    if (!window.api) return;
    try {
      await window.api.revealFileInOS(filePath);
      toast.info('Revealed in Explorer', filePath.split(/[/\\]/).pop());
    } catch (err: any) {
      toast.error('Cannot reveal file', err.message);
    }
  };

  const handleCopyPath = async (filePath: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedFileId(fileId);
      toast.success('Path copied');
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const handleCopyPreviewText = async () => {
    if (!previewContent) return;
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopiedPreview(true);
      toast.success('Text copied');
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

  const getFileVisual = (ext: string) => {
    const lower = ext.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(lower)) {
      return {
        icon: <ImageIcon className="w-4 h-4 text-pink-400" />,
        container: 'bg-pink-500/10 border-pink-500/20',
      };
    }
    if (['ts', 'js', 'py', 'rs', 'go', 'cpp', 'html', 'css', 'json'].includes(lower)) {
      return {
        icon: <FileCode className="w-4 h-4 text-emerald-400" />,
        container: 'bg-emerald-500/10 border-emerald-500/20',
      };
    }
    if (lower === 'pdf') {
      return {
        icon: <FileText className="w-4 h-4 text-rose-400" />,
        container: 'bg-rose-500/10 border-rose-500/20',
      };
    }
    if (['docx', 'doc'].includes(lower)) {
      return {
        icon: <FileText className="w-4 h-4 text-blue-400" />,
        container: 'bg-blue-500/10 border-blue-500/20',
      };
    }
    if (['txt', 'md'].includes(lower)) {
      return {
        icon: <FileText className="w-4 h-4 text-cyan-400" />,
        container: 'bg-cyan-500/10 border-cyan-500/20',
      };
    }
    return {
      icon: <FileIcon className="w-4 h-4 text-[#85858b]" />,
      container: 'bg-white/[0.04] border-white/[0.08]',
    };
  };

  const renderBadge = (matchType: SearchResultItem['matchType'], score: number) => {
    switch (matchType) {
      case 'hybrid':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono tabular-nums bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm">
            Hybrid {(score * 100).toFixed(0)}%
          </span>
        );
      case 'vector':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono tabular-nums bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
            Semantic {(score * 100).toFixed(0)}%
          </span>
        );
      case 'fts':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
            Full-text
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-[#85858b] border border-white/[0.08]">
            Filename
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141415] text-[#ededed]">
      {/* Top Search Controls Bar */}
      <div className="p-4 border-b border-white/[0.08] bg-[#0f0f10] space-y-3">
        {/* Search Input Box */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-indigo-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files or extracted text (e.g. 'microwave engineering waveguides', 'tax invoices')..."
            className="w-full bg-[#19191b] text-[#ededed] placeholder-[#85858b] pl-10 pr-36 py-2.5 rounded-lg border border-white/[0.08] focus:border-indigo-500/50 focus:bg-[#232325] focus:outline-none text-xs transition-colors duration-150"
          />

          <div className="absolute right-2.5 flex items-center space-x-2">
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSearchResponse(null);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded text-[#85858b] hover:text-[#ededed] hover:bg-[#232325] transition-colors"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-[#85858b]">
              Ctrl+K
            </kbd>

            <button
              onClick={() => executeSearch()}
              disabled={isSearching || (!query.trim() && selectedCat === 'All' && selectedExt === 'All')}
              className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors duration-150 flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* AI Toggle */}
            <button
              onClick={() => setUseAi(!useAi)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-colors duration-150 cursor-pointer ${
                useAi
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200 font-medium'
                  : 'bg-[#19191b] border-white/[0.08] text-[#85858b] hover:text-[#a1a1a6]'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${useAi ? 'text-indigo-400' : 'text-[#85858b]'}`} />
              <span>AI query interpreter</span>
            </button>

            {/* Extension Filter Chips */}
            <div className="flex items-center space-x-1 bg-[#19191b] p-1 rounded-lg border border-white/[0.08]">
              <span className="text-[10px] text-[#85858b] px-1 font-normal">Format:</span>
              {EXTENSION_FILTERS.map((ext) => (
                <button
                  key={ext}
                  onClick={() => {
                    setSelectedExt(ext);
                    executeSearch(query, undefined, ext);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors duration-150 cursor-pointer ${
                    selectedExt === ext
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'text-[#85858b] hover:text-[#ededed] border border-transparent'
                  }`}
                >
                  {ext}
                </button>
              ))}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center space-x-1 bg-[#19191b] p-1 rounded-lg border border-white/[0.08]">
              <span className="text-[10px] text-[#85858b] px-1 font-normal">Category:</span>
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCat(cat);
                    executeSearch(query, cat);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors duration-150 cursor-pointer ${
                    selectedCat === cat
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'text-[#85858b] hover:text-[#ededed] border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right Toolbar: Sort & Count */}
          <div className="flex items-center space-x-3 text-[#85858b]">
            <div className="flex items-center space-x-1.5 bg-[#19191b] px-2 py-1 rounded-lg border border-white/[0.08]">
              <ArrowUpDown className="w-3 h-3 text-[#85858b]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[11px] text-[#ededed] focus:outline-none cursor-pointer"
              >
                <option value="relevance" className="bg-[#19191b]">Relevance</option>
                <option value="date" className="bg-[#19191b]">Date modified</option>
                <option value="size" className="bg-[#19191b]">File size</option>
                <option value="name" className="bg-[#19191b]">File name</option>
              </select>
            </div>

            {searchResponse && (
              <div className="text-indigo-300 text-[11px] font-mono tabular-nums bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {searchResponse.totalCount} results ({searchResponse.executionTimeMs} ms)
              </div>
            )}
          </div>
        </div>

        {/* AI Query Interpretation Info */}
        {searchResponse?.queryInterpreted && (
          <div className="px-3.5 py-1.5 rounded-lg bg-indigo-950/20 border border-indigo-500/25 text-[11px] text-[#ededed] flex flex-wrap items-center gap-3">
            <span className="text-indigo-400 font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Interpreter:</span>
            </span>
            <span>Keywords: <strong className="text-white font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">[{searchResponse.queryInterpreted.keywords.join(', ')}]</strong></span>
            {searchResponse.queryInterpreted.category && (
              <span>Category: <strong className="text-indigo-300">{searchResponse.queryInterpreted.category}</strong></span>
            )}
            {searchResponse.queryInterpreted.extensions && (
              <span>Extensions: <strong className="text-cyan-300 font-mono">[{searchResponse.queryInterpreted.extensions.join(', ')}]</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Main Results / Empty State Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isSearching && (
            <div className="h-48 flex flex-col items-center justify-center space-y-2 text-[#85858b]">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <p className="text-xs text-[#a1a1a6]">Searching index with BM25 full-text and vector embeddings...</p>
            </div>
          )}

          {/* Initial Blank State with Suggested Prompts */}
          {!isSearching && !searchResponse && (
            <div className="max-w-xl mx-auto py-16 space-y-6">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-sm shadow-indigo-600/20">
                  <Search className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-[#ededed]">Local Library Search</h3>
                <p className="text-xs text-[#85858b] max-w-sm mx-auto">
                  Search across file names and extracted text using hybrid BM25 full-text matching and MiniLM embeddings
                </p>
              </div>

              {/* Sample Queries Chips */}
              <div className="space-y-2">
                <div className="text-[11px] text-[#85858b] text-center font-medium">
                  Try a sample search:
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {SUGGESTED_QUERIES.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => {
                        setQuery(sq);
                        executeSearch(sq);
                      }}
                      className="px-3 py-1 rounded-lg border border-white/[0.08] bg-[#19191b] hover:bg-indigo-950/20 hover:border-indigo-500/40 text-xs text-[#a1a1a6] hover:text-indigo-200 transition-colors duration-150 cursor-pointer shadow-sm"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Results Fallback State */}
          {!isSearching && searchResponse && searchResponse.results.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-[#85858b]">
              <div className="w-10 h-10 rounded-lg bg-[#19191b] flex items-center justify-center border border-white/[0.08]">
                <FileText className="w-5 h-5 text-[#85858b]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-medium text-[#ededed]">No matching files found</h3>
                <p className="text-xs text-[#85858b] max-w-sm">
                  Try broader keywords or reset the format and category filters
                </p>
              </div>
            </div>
          )}

          {/* Search Result Cards with Color-Coded File Icons and Badges */}
          {!isSearching && searchResponse && searchResponse.results.length > 0 && (
            <div className="space-y-2">
              {searchResponse.results.map((item) => {
                const isCopied = copiedFileId === item.fileId;
                const isSelected = previewFile?.fileId === item.fileId;
                const visual = getFileVisual(item.extension);
                const catTheme = CATEGORY_TAG_COLORS[item.category] || { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' };

                return (
                  <div
                    key={item.fileId}
                    onClick={() => handleOpenPreview(item)}
                    className={`p-3.5 rounded-xl border transition-colors duration-150 space-y-2 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/50 bg-[#232325] shadow-sm'
                        : 'border-white/[0.08] bg-[#19191b] hover:bg-[#232325]/70 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div className={`p-2 rounded-lg border ${visual.container} shrink-0 mt-0.5`}>
                          {visual.icon}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-semibold text-[#ededed] hover:text-indigo-300 transition-colors truncate">
                              {item.filename}
                            </h4>
                            {renderBadge(item.matchType, item.score)}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}>
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#85858b] font-mono truncate max-w-xl">
                            {item.filePath}
                          </p>
                        </div>
                      </div>

                      {/* Quick Hover Action Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPath(item.filePath, item.fileId);
                          }}
                          title="Copy file path"
                          className="p-1 rounded bg-[#232325] hover:bg-indigo-600/20 text-[#85858b] hover:text-indigo-300 border border-white/[0.08] transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(item);
                          }}
                          title="Preview text"
                          className="p-1 rounded bg-[#232325] hover:bg-indigo-600/20 text-[#85858b] hover:text-indigo-300 border border-white/[0.08] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(item.filePath);
                          }}
                          title="Open file"
                          className="p-1 rounded bg-[#232325] hover:bg-indigo-600/20 text-[#85858b] hover:text-indigo-300 border border-white/[0.08] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevealFile(item.filePath);
                          }}
                          title="Reveal in Explorer"
                          className="p-1 rounded bg-[#232325] hover:bg-indigo-600/20 text-[#85858b] hover:text-indigo-300 border border-white/[0.08] transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Highlighted Snippets with Warm Amber Highlighter */}
                    {item.snippets && item.snippets.length > 0 && (
                      <div className="p-2 rounded-lg bg-[#141415] border border-white/[0.06] text-[11px] text-[#a1a1a6] line-clamp-2 leading-relaxed">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: item.snippets[0].text
                              .replace(/<b>/g, '<mark class="bg-amber-400/25 text-amber-200 px-1 py-0.5 rounded font-medium border border-amber-400/30">')
                              .replace(/<\/b>/g, '</mark>'),
                          }}
                        />
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div className="flex items-center space-x-4 text-[10px] text-[#85858b] pt-0.5 font-mono tabular-nums">
                      <span className="flex items-center space-x-1">
                        <HardDrive className="w-3 h-3 text-[#85858b]" />
                        <span>{formatBytes(item.sizeBytes)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[#85858b]" />
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
          <aside className="w-96 border-l border-white/[0.08] bg-[#0f0f10] flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="space-y-0.5 overflow-hidden">
                <h4 className="text-xs font-semibold text-[#ededed] truncate">{previewFile.filename}</h4>
                <p className="text-[10px] text-indigo-300 font-mono tabular-nums">
                  {formatBytes(previewFile.sizeBytes)} • {previewFile.category}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded text-[#85858b] hover:text-[#ededed] hover:bg-[#232325] transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="p-2.5 flex items-center space-x-2 border-b border-white/[0.08] bg-[#141415]">
              <button
                onClick={() => handleOpenFile(previewFile.filePath)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open file</span>
              </button>
              <button
                onClick={() => handleRevealFile(previewFile.filePath)}
                className="py-1.5 px-3 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#ededed] text-xs font-medium border border-white/[0.08] flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reveal</span>
              </button>
            </div>

            {/* Text Preview Box */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-[#85858b]">
                <span className="font-medium text-[#a1a1a6]">Extracted text preview</span>
                <button
                  onClick={handleCopyPreviewText}
                  disabled={!previewContent || isLoadingPreview}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {copiedPreview ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {isLoadingPreview ? (
                <div className="h-40 flex items-center justify-center text-[#85858b] space-x-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Reading document content...</span>
                </div>
              ) : (
                <pre className="p-3 rounded-lg bg-[#141415] border border-white/[0.06] text-xs text-[#a1a1a6] font-mono leading-relaxed whitespace-pre-wrap select-text max-h-[calc(100vh-280px)] overflow-y-auto">
                  {previewContent || 'No extracted text found for this document format.'}
                </pre>
              )}
            </div>

            {/* Path Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-[#141415] text-[10px] font-mono text-[#85858b] break-all">
              {previewFile.filePath}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
