import { OpenAICompatibleAdapter } from './openai-compatible-adapter';

export class LMStudioAdapter extends OpenAICompatibleAdapter {
  constructor(
    baseUrl: string = 'http://127.0.0.1:1234',
    model: string = 'qwen2.5-3b-instruct',
    timeoutMs: number = 10000,
    apiKey?: string
  ) {
    const cleanUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/v1`;
    super('lmstudio', cleanUrl, model, apiKey, timeoutMs);
  }
}
