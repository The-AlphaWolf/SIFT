import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type {
  AIProviderConfig,
  AIConnectionTestResult,
} from '../../shared/contracts/ipc-api';
import {
  getAiConfig,
  updateAiConfig,
  testConnection,
} from '../services/ai/ai-service';

const aiConfigSchema = z.object({
  provider: z.enum(['ollama', 'lmstudio']),
  baseUrl: z.string().url('Invalid endpoint URL'),
  model: z.string().min(1, 'Model name cannot be empty'),
  timeoutMs: z.number().int().min(1000).max(60000),
});

export function registerAiIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AI_GET_SETTINGS, async (): Promise<AIProviderConfig> => {
    return getAiConfig();
  });

  ipcMain.handle(IPC_CHANNELS.AI_UPDATE_SETTINGS, async (_event, rawConfig: unknown) => {
    const parsed = aiConfigSchema.partial().parse(rawConfig);
    updateAiConfig(parsed);
  });

  ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    async (_event, rawConfig: unknown): Promise<AIConnectionTestResult> => {
      const config = rawConfig ? aiConfigSchema.partial().parse(rawConfig) : undefined;
      return testConnection(config);
    }
  );
}
