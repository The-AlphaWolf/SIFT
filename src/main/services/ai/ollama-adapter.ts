import type { IAIProvider, ProviderHealth } from './base-provider';

export class OllamaAdapter implements IAIProvider {
  public readonly name = 'ollama';

  constructor(
    public readonly baseUrl: string = 'http://127.0.0.1:11434',
    public readonly model: string = 'qwen2.5:3b',
    public readonly timeoutMs: number = 10000
  ) {}

  public async ping(): Promise<ProviderHealth> {
    const start = performance.now();
    try {
      const models = await this.listModels();
      return {
        alive: true,
        latencyMs: Math.round(performance.now() - start),
        models,
      };
    } catch (err: any) {
      return {
        alive: false,
        latencyMs: Math.round(performance.now() - start),
        models: [],
        error: err?.message || 'Ollama connection failed',
      };
    }
  }

  public async listModels(): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/api/tags`;
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      if (Array.isArray(data?.models)) {
        return data.models.map((m: any) => m.name || m.model);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  public async chatCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama chat completion failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      return data?.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timer);
    }
  }
}
