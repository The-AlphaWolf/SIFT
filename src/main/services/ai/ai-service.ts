import type { AIProviderConfig, AIConnectionTestResult } from '../../../shared/contracts/ipc-api';
import type { IAIProvider } from './base-provider';
import { OllamaAdapter } from './ollama-adapter';
import { LMStudioAdapter } from './lmstudio-adapter';

let activeConfig: AIProviderConfig = {
  provider: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5:3b',
  timeoutMs: 10000,
};

export function getAiConfig(): AIProviderConfig {
  return { ...activeConfig };
}

export function updateAiConfig(newConfig: Partial<AIProviderConfig>): void {
  activeConfig = { ...activeConfig, ...newConfig };
}

export function getActiveAiProvider(): IAIProvider {
  if (activeConfig.provider === 'lmstudio') {
    return new LMStudioAdapter(activeConfig.baseUrl, activeConfig.model, activeConfig.timeoutMs);
  }
  return new OllamaAdapter(activeConfig.baseUrl, activeConfig.model, activeConfig.timeoutMs);
}

export async function testConnection(customConfig?: Partial<AIProviderConfig>): Promise<AIConnectionTestResult> {
  const cfg = { ...activeConfig, ...customConfig };
  const provider =
    cfg.provider === 'lmstudio'
      ? new LMStudioAdapter(cfg.baseUrl, cfg.model, cfg.timeoutMs)
      : new OllamaAdapter(cfg.baseUrl, cfg.model, cfg.timeoutMs);

  const health = await provider.ping();
  return {
    success: health.alive,
    models: health.models,
    latencyMs: health.latencyMs,
    error: health.error,
  };
}
