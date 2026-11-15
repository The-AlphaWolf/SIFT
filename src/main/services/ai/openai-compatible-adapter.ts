import type { IAIProvider, ProviderHealth } from './base-provider';
import type { AIProviderType } from '../../../shared/contracts/ipc-api';

const DEFAULT_MODELS_BY_PROVIDER: Record<AIProviderType, string[]> = {
  ollama: ['qwen2.5:3b-instruct', 'llama3.2:3b', 'qwen3:4b-instruct'],
  lmstudio: ['qwen2.5-3b-instruct', 'llama-3.2-3b-instruct', 'phi-3.5-mini'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
  custom: ['llama-3.3-70b-versatile', 'deepseek-chat', 'mistral-large-latest'],
};

export class OpenAICompatibleAdapter implements IAIProvider {
  constructor(
    public readonly name: AIProviderType,
    public readonly baseUrl: string,
    public readonly model: string,
    public readonly apiKey?: string,
    public readonly timeoutMs: number = 10000
  ) {}

  private getNormalizedUrl(): string {
    let clean = this.baseUrl.trim().replace(/\/+$/, '');
    // If user provided root OpenAI domain, append /v1
    if (clean === 'https://api.openai.com') {
      clean = 'https://api.openai.com/v1';
    }
    return clean;
  }

  private getAuthHeaders(includeContentType = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.apiKey && this.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    }
    return headers;
  }

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
      const errMsg = String(err?.message || err);
      let friendlyError = errMsg;
      if (/401/i.test(errMsg)) {
        friendlyError = 'Invalid API key or unauthorized (HTTP 401)';
      } else if (/404/i.test(errMsg)) {
        friendlyError = 'Endpoint not found (HTTP 404). Check the Base URL.';
      } else if (/ECONNREFUSED|fetch failed/i.test(errMsg)) {
        friendlyError =
          this.name === 'lmstudio'
            ? 'Connection refused: Make sure LM Studio local server is running on port 1234.'
            : 'Connection refused: Check your network connection or server endpoint.';
      }

      return {
        alive: false,
        latencyMs: Math.round(performance.now() - start),
        models: [],
        error: friendlyError,
      };
    }
  }

  public async listModels(): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const base = this.getNormalizedUrl();
      const endpoint = `${base}/models`;
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: this.getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('HTTP 401: Unauthorized. Please check your API key.');
        }
        // If /models returns 404 or other non-auth error, fall back to known models
        const defaults = DEFAULT_MODELS_BY_PROVIDER[this.name] || [];
        if (this.model && !defaults.includes(this.model)) {
          return [this.model, ...defaults];
        }
        return defaults;
      }

      const data = (await res.json()) as any;
      if (Array.isArray(data?.data)) {
        const ids = data.data.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) return ids;
      }
      if (Array.isArray(data?.models)) {
        const names = data.models.map((m: any) => m.name || m.id).filter(Boolean);
        if (names.length > 0) return names;
      }

      return DEFAULT_MODELS_BY_PROVIDER[this.name] || [this.model];
    } catch (err: any) {
      if (/401/i.test(String(err?.message))) {
        throw err;
      }
      // If listing models fails on non-fatal error, provide default model options
      const defaults = DEFAULT_MODELS_BY_PROVIDER[this.name] || [];
      return this.model && !defaults.includes(this.model) ? [this.model, ...defaults] : defaults;
    } finally {
      clearTimeout(timer);
    }
  }

  public async chatCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    const base = this.getNormalizedUrl();
    const endpoint = `${base}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Attempt 1: with response_format json_object
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        return data?.choices?.[0]?.message?.content || '';
      }

      // If response_format is unsupported (HTTP 400), retry without response_format
      if (res.status === 400) {
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), this.timeoutMs);
        try {
          const retryRes = await fetch(endpoint, {
            method: 'POST',
            signal: retryController.signal,
            headers: this.getAuthHeaders(true),
            body: JSON.stringify({
              model: this.model,
              messages,
              temperature: 0.1,
            }),
          });
          if (retryRes.ok) {
            const data = (await retryRes.json()) as any;
            return data?.choices?.[0]?.message?.content || '';
          }
        } finally {
          clearTimeout(retryTimer);
        }
      }

      throw new Error(`AI chat completion failed with HTTP ${res.status}: ${res.statusText}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
