import { describe, it, expect, vi } from 'vitest';
import {
  fallbackTokenizeQuery,
  interpretNaturalQuery,
} from '../../../src/main/services/search/query-interpreter';
import type { IAIProvider } from '../../../src/main/services/ai/base-provider';

describe('Query Interpreter', () => {
  describe('fallbackTokenizeQuery', () => {
    it('handles empty query', () => {
      const res = fallbackTokenizeQuery('   ');
      expect(res.rawQuery).toBe('');
      expect(res.keywords).toEqual([]);
      expect(res.sortBy).toBe('relevance');
    });

    it('extracts tokens and extensions with ext: prefix or dot prefix', () => {
      const res = fallbackTokenizeQuery('microwave engineering ext:pdf .docx notes');
      expect(res.keywords).toEqual(['microwave', 'engineering', 'notes']);
      expect(res.extensions).toEqual(['pdf', 'docx']);
      expect(res.sortBy).toBe('relevance');
    });

    it('retains single search term if only one token provided', () => {
      const res = fallbackTokenizeQuery('invoice');
      expect(res.keywords).toEqual(['invoice']);
      expect(res.extensions).toBeUndefined();
    });
  });

  describe('interpretNaturalQuery', () => {
    it('uses fallback tokenizer when no provider is passed', async () => {
      const res = await interpretNaturalQuery('quarterly financial report ext:pdf');
      expect(res.keywords).toEqual(['quarterly', 'financial', 'report']);
      expect(res.extensions).toEqual(['pdf']);
    });

    it('successfully parses valid JSON from AI provider', async () => {
      const mockProvider: IAIProvider = {
        name: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'qwen2.5:3b',
        timeoutMs: 5000,
        ping: vi.fn(),
        listModels: vi.fn(),
        chatCompletion: vi.fn().mockResolvedValue(
          JSON.stringify({
            keywords: ['waveguides', 'microwave'],
            extensions: ['pdf'],
            category: 'Academics',
            sortBy: 'relevance',
          })
        ),
      };

      const res = await interpretNaturalQuery('Find my microwave notes on waveguides in pdf', mockProvider);
      expect(res.keywords).toEqual(['waveguides', 'microwave']);
      expect(res.extensions).toEqual(['pdf']);
      expect(res.category).toBe('Academics');
      expect(res.sortBy).toBe('relevance');
    });

    it('strips markdown code blocks from AI provider response', async () => {
      const mockProvider: IAIProvider = {
        name: 'lmstudio',
        baseUrl: 'http://127.0.0.1:1234',
        model: 'qwen2.5-3b-instruct',
        timeoutMs: 5000,
        ping: vi.fn(),
        listModels: vi.fn(),
        chatCompletion: vi.fn().mockResolvedValue(`\`\`\`json
{
  "keywords": ["resume", "cv"],
  "extensions": ["docx"],
  "category": "Work",
  "sortBy": "date"
}
\`\`\``),
      };

      const res = await interpretNaturalQuery('find recent resume docx', mockProvider);
      expect(res.keywords).toEqual(['resume', 'cv']);
      expect(res.extensions).toEqual(['docx']);
      expect(res.category).toBe('Work');
      expect(res.sortBy).toBe('date');
    });

    it('falls back gracefully when AI provider throws or times out', async () => {
      const mockProvider: IAIProvider = {
        name: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'qwen2.5:3b',
        timeoutMs: 5000,
        ping: vi.fn(),
        listModels: vi.fn(),
        chatCompletion: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };

      const res = await interpretNaturalQuery('semiconductor notes ext:pdf', mockProvider);
      expect(res.keywords).toEqual(['semiconductor', 'notes']);
      expect(res.extensions).toEqual(['pdf']);
    });
  });
});
