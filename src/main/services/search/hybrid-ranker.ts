import type { SearchResultItem } from '../../../shared/contracts/ipc-api';
import type { VectorMatch } from './vector-engine';

export interface RankerWeights {
  ftsWeight: number;      // default 0.35
  vectorWeight: number;   // default 0.30
  categoryWeight: number; // default 0.20
  filenameWeight: number; // default 0.10
  recencyWeight: number;  // default 0.05
}

export const DEFAULT_WEIGHTS: RankerWeights = {
  ftsWeight: 0.35,
  vectorWeight: 0.30,
  categoryWeight: 0.20,
  filenameWeight: 0.10,
  recencyWeight: 0.05,
};

export interface RankerOptions {
  weights?: RankerWeights;
  targetCategory?: string;
  isCategoryIntent?: boolean;
}

/**
 * Computes category relevance score.
 * When targetCategory matches: 1.0
 * When neutral (no target category): 0.5
 * When mismatched during category intent: -0.5
 */
export function calculateCategoryScore(
  itemCategory: string,
  targetCategory?: string,
  isCategoryIntent?: boolean
): number {
  if (!targetCategory) {
    return 0.5;
  }
  const match = itemCategory.toLowerCase() === targetCategory.toLowerCase();
  if (match) {
    return 1.0;
  }
  return isCategoryIntent ? -0.5 : 0.0;
}

/**
 * Computes exponential recency decay: exp(-days / 90)
 */
export function calculateRecencyScore(modifiedAtIso: string): number {
  try {
    const modTime = new Date(modifiedAtIso).getTime();
    const now = Date.now();
    const diffDays = Math.max(0, (now - modTime) / (1000 * 60 * 60 * 24));
    return Math.exp(-diffDays / 90);
  } catch {
    return 0.5;
  }
}

/**
 * Computes filename match bonus: 1.0 if any keyword is a substring of the filename.
 */
export function calculateFilenameMatchScore(filename: string, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 0;
  const lowerName = filename.toLowerCase();
  for (const kw of keywords) {
    const cleanKw = kw.toLowerCase().trim();
    if (cleanKw.length > 1 && lowerName.includes(cleanKw)) {
      return 1.0;
    }
  }
  return 0.0;
}

/**
 * Combines and ranks candidates from FTS5, vector similarity search, and direct candidates.
 */
export function fuseAndRankResults(
  ftsResults: SearchResultItem[],
  vectorMatches: VectorMatch[],
  keywords: string[],
  optionsOrWeights: RankerWeights | RankerOptions = DEFAULT_WEIGHTS,
  additionalCandidates: SearchResultItem[] = []
): SearchResultItem[] {
  let weights = DEFAULT_WEIGHTS;
  let targetCategory: string | undefined;
  let isCategoryIntent = false;

  if (optionsOrWeights) {
    if (
      'targetCategory' in optionsOrWeights ||
      'isCategoryIntent' in optionsOrWeights ||
      'weights' in optionsOrWeights
    ) {
      const opts = optionsOrWeights as RankerOptions;
      if (opts.weights) weights = opts.weights;
      targetCategory = opts.targetCategory;
      isCategoryIntent = !!opts.isCategoryIntent;
    } else {
      weights = optionsOrWeights as RankerWeights;
    }
  }

  const mergedMap = new Map<
    string,
    {
      item: SearchResultItem;
      ftsScore: number;
      vectorScore: number;
      filenameScore: number;
      recencyScore: number;
      categoryScore: number;
      matchedByFts: boolean;
      matchedByVector: boolean;
      matchedByDirect: boolean;
    }
  >();

  // 1. Ingest additional candidates (e.g. category matches or filename matches from files table)
  for (const cand of additionalCandidates) {
    const recency = calculateRecencyScore(cand.modifiedAt);
    const fnScore = calculateFilenameMatchScore(cand.filename, keywords);
    const catScore = calculateCategoryScore(cand.category, targetCategory, isCategoryIntent);

    mergedMap.set(cand.fileId, {
      item: { ...cand },
      ftsScore: 0.0,
      vectorScore: 0.0,
      filenameScore: fnScore,
      recencyScore: recency,
      categoryScore: catScore,
      matchedByFts: false,
      matchedByVector: false,
      matchedByDirect: true,
    });
  }

  // 2. Ingest FTS candidates
  for (const fts of ftsResults) {
    const recency = calculateRecencyScore(fts.modifiedAt);
    const fnScore = calculateFilenameMatchScore(fts.filename, keywords);
    const catScore = calculateCategoryScore(fts.category, targetCategory, isCategoryIntent);

    const existing = mergedMap.get(fts.fileId);
    if (existing) {
      existing.ftsScore = Math.max(existing.ftsScore, fts.score);
      existing.matchedByFts = true;
      if (existing.item.snippets.length === 0 && fts.snippets.length > 0) {
        existing.item.snippets = [...fts.snippets];
      }
    } else {
      mergedMap.set(fts.fileId, {
        item: { ...fts },
        ftsScore: fts.score, // already normalized 0..1
        vectorScore: 0.0,
        filenameScore: fnScore,
        recencyScore: recency,
        categoryScore: catScore,
        matchedByFts: true,
        matchedByVector: false,
        matchedByDirect: false,
      });
    }
  }

  // 3. Ingest Vector candidates
  for (const vec of vectorMatches) {
    const existing = mergedMap.get(vec.fileId);

    if (existing) {
      existing.vectorScore = Math.max(existing.vectorScore, vec.similarity);
      existing.matchedByVector = true;

      // Add vector snippet if not already present
      if (existing.item.snippets.length === 0) {
        existing.item.snippets.push({
          chunkId: vec.chunkId,
          text: vec.chunkText,
          highlightRanges: [],
        });
      }
    } else {
      const recency = calculateRecencyScore(vec.modifiedAt);
      const fnScore = calculateFilenameMatchScore(vec.filename, keywords);
      const catScore = calculateCategoryScore(vec.category, targetCategory, isCategoryIntent);

      mergedMap.set(vec.fileId, {
        item: {
          fileId: vec.fileId,
          filePath: vec.filePath,
          filename: vec.filename,
          extension: vec.extension,
          sizeBytes: vec.sizeBytes,
          modifiedAt: vec.modifiedAt,
          category: vec.category,
          score: 0,
          matchType: 'vector',
          snippets: [
            {
              chunkId: vec.chunkId,
              text: vec.chunkText,
              highlightRanges: [],
            },
          ],
        },
        ftsScore: 0.0,
        vectorScore: vec.similarity,
        filenameScore: fnScore,
        recencyScore: recency,
        categoryScore: catScore,
        matchedByFts: false,
        matchedByVector: true,
        matchedByDirect: false,
      });
    }
  }

  // 4. Compute Linear Weighted Score with category bonuses and penalties
  const rankedItems: SearchResultItem[] = [];

  for (const entry of mergedMap.values()) {
    const catWeight = weights.categoryWeight ?? 0.20;
    const effectiveCatScore = Math.max(0, entry.categoryScore);

    // Bonus for matching category when searching with category intent (+0.15)
    const categoryIntentBonus =
      isCategoryIntent && entry.categoryScore === 1.0 ? 0.15 : 0.0;

    // Strong penalty for non-matching category when searching with category intent (-0.35)
    const categoryMismatchPenalty =
      isCategoryIntent && entry.categoryScore < 0 ? -0.35 : 0.0;

    const rawTotalScore =
      weights.ftsWeight * entry.ftsScore +
      weights.vectorWeight * entry.vectorScore +
      catWeight * effectiveCatScore +
      weights.filenameWeight * entry.filenameScore +
      weights.recencyWeight * entry.recencyScore +
      categoryIntentBonus +
      categoryMismatchPenalty;

    const totalScore = Math.max(0.01, Math.min(1.0, rawTotalScore));

    const matchType =
      entry.matchedByFts && entry.matchedByVector
        ? 'hybrid'
        : entry.matchedByFts
        ? 'fts'
        : entry.matchedByVector
        ? 'vector'
        : 'filename';

    entry.item.score = Number(totalScore.toFixed(4));
    entry.item.matchType = matchType;
    rankedItems.push(entry.item);
  }

  // 5. Sort with deterministic tie-breaking (higher score first, newer modifiedAt second)
  rankedItems.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 1e-4) {
      return scoreDiff;
    }
    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
  });

  return rankedItems;
}
