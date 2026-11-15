import type { FolderInfo, CategoryInfo } from '../types/models';
export type { FolderInfo, CategoryInfo };

export interface StructuredQuery {
  rawQuery: string;
  keywords: string[];
  extensions?: string[];
  dateAfter?: string; // ISO date string
  dateBefore?: string; // ISO date string
  minSizeBytes?: number;
  maxSizeBytes?: number;
  category?: string;
  isCategoryIntent?: boolean;
  sortBy?: 'relevance' | 'date' | 'size' | 'name';
}

export interface SearchSnippet {
  chunkId: number;
  text: string;
  highlightRanges: Array<[number, number]>;
}

export interface SearchResultItem {
  fileId: string;
  filePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  category: string;
  score: number;
  matchType: 'fts' | 'vector' | 'hybrid' | 'filename';
  snippets: SearchSnippet[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  queryInterpreted?: StructuredQuery;
  executionTimeMs: number;
}

export interface DuplicateFileEntry {
  id: string;
  filePath: string;
  modifiedAt: string;
  sizeBytes: number;
}

export interface DuplicateGroup {
  sha256Hash: string;
  sizeBytes: number;
  fileCount: number;
  reclaimableBytes: number;
  files: DuplicateFileEntry[];
}

export interface DuplicateResponse {
  groups: DuplicateGroup[];
  totalGroups: number;
  totalReclaimableBytes: number;
}

export interface OrganizationSuggestion {
  fileId: string;
  currentPath: string;
  suggestedFilename: string;
  suggestedCategory: string;
  reason: string;
}

export interface OrganizationResponse {
  suggestions: OrganizationSuggestion[];
  totalCount: number;
}

export type AIProviderType = 'ollama' | 'lmstudio' | 'openai' | 'gemini' | 'custom';

export interface AIProviderConfig {
  provider: AIProviderType;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface AIConnectionTestResult {
  success: boolean;
  models: string[];
  latencyMs: number;
  error?: string;
}

export interface IndexingProgressEvent {
  stage: 'scanning' | 'extracting' | 'embedding' | 'hashing' | 'idle';
  totalFiles: number;
  processedFiles: number;
  currentFilePath: string;
  isPaused: boolean;
}

export interface HardwareProfile {
  cpuModel: string;
  cpuCores: number;
  totalRamGb: number;
  freeRamGb: number;
  gpuName: string;
  osPlatform: string;
  osRelease: string;
  summaryBadge: string;
  ramBadge: string;
}

export interface SystemStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalFolders: number;
  duplicateCount: number;
  reclaimableBytes: number;
  categoryCounts: Record<string, number>;
  extensionCounts: Record<string, number>;
}

// Complete Type-Safe IPC Bridge interface exposed to window.api
export interface SiftIpcBridge {
  // System & Lifecycle
  ping: () => Promise<string>;
  getSystemStats: () => Promise<SystemStats>;
  getHardwareProfile: () => Promise<HardwareProfile>;

  // Folder Operations
  selectDirectoryDialog: () => Promise<string | null>;
  addFolder: (folderPath: string) => Promise<FolderInfo>;
  removeFolder: (folderId: string) => Promise<void>;
  listFolders: () => Promise<FolderInfo[]>;
  triggerReindex: (folderId?: string) => Promise<void>;

  // Indexing Control
  pauseIndexing: () => Promise<void>;
  resumeIndexing: () => Promise<void>;
  cancelIndexing: () => Promise<void>;

  // Search Operations
  search: (
    query: string,
    options?: {
      useAiInterpretation?: boolean;
      filters?: Partial<StructuredQuery>;
      limit?: number;
      offset?: number;
    }
  ) => Promise<SearchResponse>;
  getFilePreview: (
    fileId: string
  ) => Promise<{ content: string; mimeType: string }>;
  openFileInOS: (filePath: string) => Promise<void>;
  revealFileInOS: (filePath: string) => Promise<void>;

  // Duplicates & Organization
  getDuplicateGroups: (options?: {
    limit?: number;
    offset?: number;
  }) => Promise<DuplicateResponse>;
  getOrganizationSuggestions: (options?: {
    limit?: number;
    offset?: number;
  }) => Promise<OrganizationResponse>;

  // Categories
  listCategories: () => Promise<CategoryInfo[]>;
  setFileCategory: (fileId: string, category: string) => Promise<void>;

  // AI Provider & Settings
  getAiSettings: () => Promise<AIProviderConfig>;
  updateAiSettings: (config: Partial<AIProviderConfig>) => Promise<void>;
  testAiConnection: (
    config: AIProviderConfig
  ) => Promise<AIConnectionTestResult>;
  getAppSettings: () => Promise<Record<string, string>>;
  updateAppSettings: (key: string, value: string) => Promise<void>;

  // Event Subscriptions
  onIndexingProgress: (
    callback: (progress: IndexingProgressEvent) => void
  ) => () => void;
}

// IPC Channel String Constants
export const IPC_CHANNELS = {
  // System
  SYSTEM_PING: 'system:ping',
  SYSTEM_GET_STATS: 'system:get-stats',
  SYSTEM_GET_HARDWARE_PROFILE: 'system:get-hardware-profile',

  // Folders
  FOLDER_SELECT_DIALOG: 'folder:select-dialog',
  FOLDER_ADD: 'folder:add',
  FOLDER_REMOVE: 'folder:remove',
  FOLDER_LIST: 'folder:list',
  FOLDER_REINDEX: 'folder:reindex',

  // Indexing Control
  INDEX_PAUSE: 'index:pause',
  INDEX_RESUME: 'index:resume',
  INDEX_CANCEL: 'index:cancel',
  INDEX_PROGRESS_EVENT: 'index:progress-event',

  // Search
  SEARCH_EXECUTE: 'search:execute',
  SEARCH_PREVIEW: 'search:preview',
  FILE_OPEN: 'file:open',
  FILE_REVEAL: 'file:reveal',

  // Duplicates & Organization
  DUPLICATES_LIST: 'duplicates:list',
  ORGANIZATION_SUGGESTIONS: 'organization:suggestions',

  // Categories
  CATEGORIES_LIST: 'categories:list',
  FILE_SET_CATEGORY: 'file:set-category',

  // AI & Settings
  AI_GET_SETTINGS: 'ai:get-settings',
  AI_UPDATE_SETTINGS: 'ai:update-settings',
  AI_TEST_CONNECTION: 'ai:test-connection',
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
} as const;
