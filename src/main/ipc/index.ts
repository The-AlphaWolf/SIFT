import { registerPingIpc } from './ping-ipc';
import { registerFolderIpc } from './folder-ipc';
import { registerSearchIpc } from './search-ipc';
import { registerAiIpc } from './ai-ipc';
import { registerSettingsIpc } from './settings-ipc';
import { registerDuplicatesIpc } from './duplicates-ipc';
import { registerIndexControlIpc } from './index-ipc';
import { registerCategoryIpc } from './category-ipc';

export function registerAllIpcHandlers(): void {
  registerPingIpc();
  registerFolderIpc();
  registerSearchIpc();
  registerAiIpc();
  registerSettingsIpc();
  registerDuplicatesIpc();
  registerIndexControlIpc();
  registerCategoryIpc();
  console.log('[IPC] All type-safe IPC handlers registered successfully.');
}
