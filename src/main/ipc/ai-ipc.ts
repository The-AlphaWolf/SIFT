import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type {
  AIProviderConfig,
  AIConnectionTestResult,
} from '../../shared/contracts/ipc-api';

const aiConfigSchema = z.object({
  provider: z.enum(['ollama', 'lmstudio']),
  baseUrl: z.string().url('Invalid endpoint URL'),
  model: z.string().min(1, 'Model name cannot be empty'),
  timeoutMs: z.number().int().min(1000).max(60000),
});

let currentAiConfig: AIProviderConfig = {
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5:3b',
  timeoutMs: 10000,
};

export function registerAiIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AI_GET_SETTINGS, async (): Promise<AIProviderConfig> => {
    return { ...currentAiConfig };
  });

  ipcMain.handle(IPC_CHANNELS.AI_UPDATE_SETTINGS, async (_event, rawConfig: unknown) => {
    const parsed = aiConfigSchema.partial().parse(rawConfig);
    currentAiConfig = { ...currentAiConfig, ...parsed };
  });

  ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    async (_event, rawConfig: unknown): Promise<AIConnectionTestResult> => {
      const config = aiConfigSchema.parse(rawConfig);
      const startTime = performance.now();

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.timeoutMs);

        // Ollama uses /api/tags; LM Studio uses /v1/models
        const endpoint =
          config.provider === 'ollama'
            ? `${config.baseUrl.replace(/\/+$/, '')}/api/tags`
            : `${config.baseUrl.replace(/\/+$/, '')}/v1/models`;

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`Provider returned HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as any;
        const latencyMs = Math.round(performance.now() - startTime);

        let models: string[] = [];
        if (config.provider === 'ollama' && Array.isArray(data?.models)) {
          models = data.models.map((m: any) => m.name || m.model);
        } else if (Array.isArray(data?.data)) {
          models = data.data.map((m: any) => m.id);
        }

        return {
          success: true,
          models,
          latencyMs,
        };
      } catch (err: any) {
        return {
          success: false,
          models: [],
          latencyMs: Math.round(performance.now() - startTime),
          error: err?.message || 'Connection failed or timed out',
        };
      }
    }
  );
}
