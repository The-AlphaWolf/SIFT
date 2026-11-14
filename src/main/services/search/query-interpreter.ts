import { z } from 'zod';
import type { StructuredQuery } from '../../../shared/contracts/ipc-api';
import type { IAIProvider } from '../ai/base-provider';
import { getQueryInterpretationPrompt } from '../ai/prompt-templates';

const structuredQuerySchema = z.object({
  keywords: z.array(z.string()).default([]),
  extensions: z.array(z.string()).optional(),
  dateAfter: z.string().nullable().optional(),
  dateBefore: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  sortBy: z.enum(['relevance', 'date', 'size', 'name']).optional().default('relevance'),
});

/**
 * Deterministic fallback tokenizer if local AI is unavailable or fails to return JSON.
 */
export function fallbackTokenizeQuery(rawQuery: string): StructuredQuery {
  const clean = rawQuery.trim();
  if (!clean) {
    return {
      rawQuery: '',
      keywords: [],
      sortBy: 'relevance',
    };
  }

  const tokens = clean.split(/\s+/);
  const keywords: string[] = [];
  const extensions: string[] = [];

  for (const token of tokens) {
    const extMatch = token.match(/^(?:ext:|\.)([a-zA-Z0-9]+)$/i);
    if (extMatch) {
      extensions.push(extMatch[1].toLowerCase());
    } else {
      keywords.push(token);
    }
  }

  return {
    rawQuery: clean,
    keywords: keywords.length > 0 ? keywords : [clean],
    extensions: extensions.length > 0 ? extensions : undefined,
    sortBy: 'relevance',
  };
}

/**
 * Converts natural-language search query into a validated StructuredQuery.
 * Uses local AI provider when available, falling back to deterministic tokenization.
 */
export async function interpretNaturalQuery(
  rawQuery: string,
  provider?: IAIProvider
): Promise<StructuredQuery> {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { rawQuery: '', keywords: [], sortBy: 'relevance' };
  }

  // If no provider or interpretation disabled, use fast deterministic tokenization
  if (!provider) {
    return fallbackTokenizeQuery(trimmed);
  }

  try {
    const systemPrompt = getQueryInterpretationPrompt();
    const responseText = await provider.chatCompletion(trimmed, systemPrompt);

    // Clean potential markdown code fences from model response
    const jsonStr = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(jsonStr);
    const validated = structuredQuerySchema.parse(parsed);

    return {
      rawQuery: trimmed,
      keywords: validated.keywords.length > 0 ? validated.keywords : [trimmed],
      extensions: validated.extensions?.map((e) => e.toLowerCase().replace(/^\./, '')),
      dateAfter: validated.dateAfter || undefined,
      dateBefore: validated.dateBefore || undefined,
      category: validated.category || undefined,
      sortBy: validated.sortBy,
    };
  } catch (err) {
    console.warn('[QueryInterpreter] Local AI interpretation failed or timed out. Falling back to keyword tokenizer:', err);
    return fallbackTokenizeQuery(trimmed);
  }
}
