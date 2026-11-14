export interface ProviderHealth {
  alive: boolean;
  latencyMs: number;
  models: string[];
  error?: string;
}

export interface IAIProvider {
  readonly name: 'ollama' | 'lmstudio';
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;

  ping(): Promise<ProviderHealth>;
  listModels(): Promise<string[]>;
  chatCompletion(prompt: string, systemPrompt?: string): Promise<string>;
}
