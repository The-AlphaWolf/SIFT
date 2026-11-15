import type {
  AIProviderConfig,
  AIConnectionTestResult,
  AIProviderType,
} from '../../../shared/contracts/ipc-api';
import type { IAIProvider } from './base-provider';
import { OllamaAdapter } from './ollama-adapter';
import { LMStudioAdapter } from './lmstudio-adapter';
import { OpenAICompatibleAdapter } from './openai-compatible-adapter';
import { getDatabase } from '../db/connection';

let activeConfig: AIProviderConfig = {
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5:3b-instruct',
  apiKey: '',
  timeoutMs: 10000,
};

let hasLoadedFromDb = false;

export function loadPersistedAiConfig(): void {
  try {
    const db = getDatabase();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = 'ai_config'")
      .get() as { value: string } | undefined;

    if (row?.value) {
      const parsed = JSON.parse(row.value);
      activeConfig = { ...activeConfig, ...parsed };
    }
    hasLoadedFromDb = true;
  } catch {
    // Database might not be initialized yet in unit test contexts
  }
}

export function persistAiConfig(): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES ('ai_config', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(activeConfig));
  } catch {
    // Database unavailable in unit test contexts
  }
}

export function getAiConfig(): AIProviderConfig {
  if (!hasLoadedFromDb) {
    loadPersistedAiConfig();
  }
  return { ...activeConfig };
}

export function updateAiConfig(newConfig: Partial<AIProviderConfig>): void {
  if (!hasLoadedFromDb) {
    loadPersistedAiConfig();
  }
  activeConfig = { ...activeConfig, ...newConfig };
  persistAiConfig();
}

export function createAiProvider(cfg: AIProviderConfig): IAIProvider {
  switch (cfg.provider) {
    case 'ollama':
      return new OllamaAdapter(cfg.baseUrl, cfg.model, cfg.timeoutMs, cfg.apiKey);
    case 'lmstudio':
      return new LMStudioAdapter(cfg.baseUrl, cfg.model, cfg.timeoutMs, cfg.apiKey);
    case 'openai':
      return new OpenAICompatibleAdapter(
        'openai',
        cfg.baseUrl || 'https://api.openai.com/v1',
        cfg.model || 'gpt-4o-mini',
        cfg.apiKey,
        cfg.timeoutMs
      );
    case 'gemini':
      return new OpenAICompatibleAdapter(
        'gemini',
        cfg.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
        cfg.model || 'gemini-1.5-flash',
        cfg.apiKey,
        cfg.timeoutMs
      );
    case 'custom':
    default:
      return new OpenAICompatibleAdapter(
        'custom',
        cfg.baseUrl,
        cfg.model,
        cfg.apiKey,
        cfg.timeoutMs
      );
  }
}

export function getActiveAiProvider(): IAIProvider {
  const cfg = getAiConfig();
  return createAiProvider(cfg);
}

export async function testConnection(
  customConfig?: Partial<AIProviderConfig>
): Promise<AIConnectionTestResult> {
  const current = getAiConfig();
  const cfg: AIProviderConfig = { ...current, ...customConfig };
  const provider = createAiProvider(cfg);

  const health = await provider.ping();
  return {
    success: health.alive,
    models: health.models,
    latencyMs: health.latencyMs,
    error: health.error,
  };
}
