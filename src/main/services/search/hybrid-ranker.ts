import type { SearchResultItem } from '../../../shared/contracts/ipc-api';
import type { VectorMatch } from './vector-engine';

export interface RankerWeights {
  ftsWeight: number;      // default 0.40
  vectorWeight: number;   // default 0.35
  filenameWeight: number; // default 0.15
  recencyWeight: number;  // default 0.10
}

export const DEFAULT_WEIGHTS: RankerWeights = {
  ftsWeight: 0.40,
  vectorWeight: 0.35,
  filenameWeight: 0.15,
  recencyWeight: 0.10,
};

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
 * Combines and ranks candidates from FTS5 and vector similarity search.
 */
export function fuseAndRankResults(
  ftsResults: SearchResultItem[],
  vectorMatches: VectorMatch[],
  keywords: string[],
  weights: RankerWeights = DEFAULT_WEIGHTS
): SearchResultItem[] {
  const mergedMap = new Map<string, {
    item: SearchResultItem;
    ftsScore: number;
    vectorScore: number;
    filenameScore: number;
    recencyScore: number;
    matchedByFts: boolean;
    matchedByVector: boolean;
  }>();

  // 1. Ingest FTS candidates
  for (const fts of ftsResults) {
    const recency = calculateRecencyScore(fts.modifiedAt);
    const fnScore = calculateFilenameMatchScore(fts.filename, keywords);

    mergedMap.set(fts.fileId, {
      item: { ...fts },
      ftsScore: fts.score, // already normalized 0..1
      vectorScore: 0.0,
      filenameScore: fnScore,
      recencyScore: recency,
      matchedByFts: true,
      matchedByVector: false,
    });
  }

  // 2. Ingest Vector candidates
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
        matchedByFts: false,
        matchedByVector: true,
      });
    }
  }

  // 3. Compute Linear Weighted Score
  const rankedItems: SearchResultItem[] = [];

  for (const entry of mergedMap.values()) {
    const totalScore =
      weights.ftsWeight * entry.ftsScore +
      weights.vectorWeight * entry.vectorScore +
      weights.filenameWeight * entry.filenameScore +
      weights.recencyWeight * entry.recencyScore;

    const matchType =
      entry.matchedByFts && entry.matchedByVector
        ? 'hybrid'
        : entry.matchedByFts
        ? 'fts'
        : 'vector';

    entry.item.score = Number(totalScore.toFixed(4));
    entry.item.matchType = matchType;
    rankedItems.push(entry.item);
  }

  // 4. Sort with deterministic tie-breaking (newer modifiedAt first)
  rankedItems.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 1e-4) {
      return scoreDiff;
    }
    // Tie-breaker: modification date
    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
  });

  return rankedItems;
}
