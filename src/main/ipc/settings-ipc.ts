import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const inMemorySettings: Record<string, string> = {
  theme: 'dark',
  closeBehavior: 'minimizeToTray',
  embeddingBatchSize: '8',
  maxExtractionSizeBytes: '52428800', // 50MB
};

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    return { ...inMemorySettings };
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, key: unknown, value: unknown) => {
      const parsed = updateSettingSchema.parse({ key, value });
      inMemorySettings[parsed.key] = parsed.value;
    }
  );
}
