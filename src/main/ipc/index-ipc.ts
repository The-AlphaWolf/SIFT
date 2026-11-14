import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import { DEFAULT_CATEGORIES } from '../../shared/constants/categories';
import type { CategoryInfo } from '../../shared/types/models';

export function registerIndexControlIpc(): void {
  ipcMain.handle(IPC_CHANNELS.INDEX_PAUSE, async () => {
    console.log('[IndexControl] Indexing paused');
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_RESUME, async () => {
    console.log('[IndexControl] Indexing resumed');
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_CANCEL, async () => {
    console.log('[IndexControl] Indexing cancelled');
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_LIST, async (): Promise<CategoryInfo[]> => {
    return [...DEFAULT_CATEGORIES];
  });

  ipcMain.handle(
    IPC_CHANNELS.FILE_SET_CATEGORY,
    async (_event, fileId: unknown, category: unknown) => {
      console.log(`[Category] File ${fileId} set to category: ${category}`);
    }
  );
}
