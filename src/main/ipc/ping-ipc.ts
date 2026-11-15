import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { SystemStats, HardwareProfile } from '../../shared/contracts/ipc-api';
import { getDatabase } from '../services/db/connection';
import { getSystemStatsQuery } from '../services/db/queries/file-queries';
import { getHardwareProfile } from '../services/system/hardware-service';

export function registerPingIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_PING, async () => {
    return `pong-${Date.now()}`;
  });

  ipcMain.handle(
    IPC_CHANNELS.SYSTEM_GET_HARDWARE_PROFILE,
    async (): Promise<HardwareProfile> => {
      return getHardwareProfile();
    }
  );

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_STATS, async (): Promise<SystemStats> => {
    try {
      const db = getDatabase();
      return getSystemStatsQuery(db);
    } catch {
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        totalFolders: 0,
        duplicateCount: 0,
        reclaimableBytes: 0,
        categoryCounts: {},
        extensionCounts: {},
      };
    }
  });
}
