import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import { IndexerService } from '../services/indexer/indexer-service';

export function registerIndexControlIpc(): void {
  ipcMain.handle(IPC_CHANNELS.INDEX_PAUSE, async () => {
    IndexerService.getInstance().pause();
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_RESUME, async () => {
    IndexerService.getInstance().resume();
  });

  ipcMain.handle(IPC_CHANNELS.INDEX_CANCEL, async () => {
    IndexerService.getInstance().cancel();
  });
}
