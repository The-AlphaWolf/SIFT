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

interface CategoryHeuristic {
  category: string;
  pattern: RegExp;
  intentPattern: RegExp;
}

export const CATEGORY_HEURISTICS: CategoryHeuristic[] = [
  {
    category: 'Academics',
    pattern: /\b(stud(?:y|ies)|materials?|notes?|lecture[s]?|courses?|assignments?|homework|exams?|syllabus|textbooks?|lab[s]?|curriculum|semesters?|sem\b|admit[\s_-]*cards?|transcripts?)\b/i,
    intentPattern: /\b(stud(?:y|ies)(?:\s+materials?)?|lecture\s+notes?|class\s+notes?|course\s+materials?|syllabus|assignments?|homework|exam\s+papers?|academic\s+papers?)\b/i,
  },
  {
    category: 'Finance',
    pattern: /\b(receipts?|invoices?|bills?|taxes?|tax|salary|payslips?|expenses?|statements?)\b/i,
    intentPattern: /\b(receipts?|invoices?|bills?|tax\s+documents?|expenses?|payslips?)\b/i,
  },
  {
    category: 'Work',
    pattern: /\b(resumes?|cv\b|curriculum\s+vitae|cover\s*letters?|offer\s*letters?|portfolios?|job\s*applications?)\b/i,
    intentPattern: /\b(resumes?|cv\b|cover\s*letters?|offer\s*letters?|portfolios?)\b/i,
  },
  {
    category: 'Personal',
    pattern: /\b(passports?|visas?|licenses?|aadhar|prescriptions?|medical|insurances?)\b/i,
    intentPattern: /\b(passports?|visas?|licenses?|medical\s*records?|insurance\s*polic(?:y|ies))\b/i,
  },
  {
    category: 'Images',
    pattern: /\b(photos?|pictures?|screenshots?|wallpapers?|images?)\b/i,
    intentPattern: /\b(photos?|pictures?|screenshots?|wallpapers?|images?)\b/i,
  },
  {
    category: 'Applications',
    pattern: /\b(installers?|executables?|setup|apps?|applications?)\b/i,
    intentPattern: /\b(installers?|setups?|applications?)\b/i,
  },
];

export function detectCategoryFromQuery(query: string): { category?: string; isCategoryIntent?: boolean } {
  for (const h of CATEGORY_HEURISTICS) {
    if (h.intentPattern.test(query)) {
      return { category: h.category, isCategoryIntent: true };
    }
  }
  for (const h of CATEGORY_HEURISTICS) {
    if (h.pattern.test(query)) {
      return { category: h.category, isCategoryIntent: false };
    }
  }
  return {};
}

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

  const detected = detectCategoryFromQuery(clean);

  return {
    rawQuery: clean,
    keywords: keywords.length > 0 ? keywords : [clean],
    extensions: extensions.length > 0 ? extensions : undefined,
    category: detected.category,
    isCategoryIntent: detected.isCategoryIntent,
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

    const detected = detectCategoryFromQuery(trimmed);
    const finalCategory = validated.category || detected.category || undefined;
    const isCategoryIntent =
      detected.isCategoryIntent ||
      (finalCategory !== undefined && /\b(materials?|all|show|find|list|get|notes?)\b/i.test(trimmed));

    return {
      rawQuery: trimmed,
      keywords: validated.keywords.length > 0 ? validated.keywords : [trimmed],
      extensions: validated.extensions?.map((e) => e.toLowerCase().replace(/^\./, '')),
      dateAfter: validated.dateAfter || undefined,
      dateBefore: validated.dateBefore || undefined,
      category: finalCategory,
      isCategoryIntent,
      sortBy: validated.sortBy,
    };
  } catch (err) {
    console.warn('[QueryInterpreter] Local AI interpretation failed or timed out. Falling back to keyword tokenizer:', err);
    return fallbackTokenizeQuery(trimmed);
  }
}
