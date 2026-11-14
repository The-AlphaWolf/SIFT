import { contextBridge, ipcRenderer } from 'electron';
import type {
  SiftIpcBridge,
  FolderInfo,
  CategoryInfo,
  StructuredQuery,
  SearchResponse,
  DuplicateResponse,
  OrganizationResponse,
  AIProviderConfig,
  AIConnectionTestResult,
  IndexingProgressEvent,
  SystemStats,
} from '../shared/contracts/ipc-api';
import { IPC_CHANNELS } from '../shared/contracts/ipc-api';

const api: SiftIpcBridge = {
  // System
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_PING),
  getSystemStats: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_STATS),

  // Folders
  selectDirectoryDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_SELECT_DIALOG),
  addFolder: (folderPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_ADD, folderPath),
  removeFolder: (folderId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_REMOVE, folderId),
  listFolders: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_LIST),
  triggerReindex: (folderId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_REINDEX, folderId),

  // Indexing Control
  pauseIndexing: () => ipcRenderer.invoke(IPC_CHANNELS.INDEX_PAUSE),
  resumeIndexing: () => ipcRenderer.invoke(IPC_CHANNELS.INDEX_RESUME),
  cancelIndexing: () => ipcRenderer.invoke(IPC_CHANNELS.INDEX_CANCEL),

  // Search
  search: (
    query: string,
    options?: {
      useAiInterpretation?: boolean;
      filters?: Partial<StructuredQuery>;
      limit?: number;
      offset?: number;
    }
  ) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_EXECUTE, query, options),
  getFilePreview: (fileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PREVIEW, fileId),
  openFileInOS: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, filePath),
  revealFileInOS: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_REVEAL, filePath),

  // Duplicates & Organization
  getDuplicateGroups: (options?: { limit?: number; offset?: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.DUPLICATES_LIST, options),
  getOrganizationSuggestions: (options?: { limit?: number; offset?: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZATION_SUGGESTIONS, options),

  // Categories
  listCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_LIST),
  setFileCategory: (fileId: string, category: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SET_CATEGORY, fileId, category),

  // AI & Settings
  getAiSettings: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_SETTINGS),
  updateAiSettings: (config: Partial<AIProviderConfig>) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_UPDATE_SETTINGS, config),
  testAiConnection: (config: AIProviderConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, config),
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  updateAppSettings: (key: string, value: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, key, value),

  // Events
  onIndexingProgress: (
    callback: (progress: IndexingProgressEvent) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: IndexingProgressEvent
    ): void => {
      callback(progress);
    };
    ipcRenderer.on(IPC_CHANNELS.INDEX_PROGRESS_EVENT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.INDEX_PROGRESS_EVENT, handler);
    };
  },
};

// Use contextBridge to safely expose api to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error('Failed to expose api in contextBridge:', error);
  }
} else {
  // @ts-ignore
  window.api = api;
}
