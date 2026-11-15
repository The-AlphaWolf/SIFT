import type { AIProviderType } from '../../../shared/contracts/ipc-api';

export interface ProviderHealth {
  alive: boolean;
  latencyMs: number;
  models: string[];
  error?: string;
}

export interface IAIProvider {
  readonly name: AIProviderType;
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly timeoutMs: number;

  ping(): Promise<ProviderHealth>;
  listModels(): Promise<string[]>;
  chatCompletion(prompt: string, systemPrompt?: string): Promise<string>;
}
