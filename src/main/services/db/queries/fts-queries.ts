import type Database from 'better-sqlite3';
import type { SearchResultItem, StructuredQuery } from '../../../../shared/contracts/ipc-api';

export interface FtsSearchOptions {
  limit?: number;
  offset?: number;
  extensions?: string[];
  category?: string;
  dateAfter?: string;
  dateBefore?: string;
}

export function sanitizeFtsQuery(raw: string): string {
  // Strip special FTS5 operators and punctuation, retain alphanumeric words
  const cleanTokens = raw
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => `"${token}"*`);

  if (cleanTokens.length === 0) {
    return '';
  }

  return cleanTokens.join(' AND ');
}

export function searchFtsQuery(
  db: Database.Database,
  rawSearch: string,
  options: FtsSearchOptions = {}
): { results: SearchResultItem[]; totalCount: number } {
  const ftsMatch = sanitizeFtsQuery(rawSearch);
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  if (!ftsMatch) {
    return { results: [], totalCount: 0 };
  }

  // Build dynamic filter conditions
  const conditions: string[] = ['f.is_deleted = 0', 'file_content_fts MATCH ?'];
  const params: any[] = [ftsMatch];

  if (options.extensions && options.extensions.length > 0) {
    const extPlaceholders = options.extensions.map(() => '?').join(',');
    conditions.push(`f.extension IN (${extPlaceholders})`);
    params.push(...options.extensions.map((e) => e.toLowerCase().replace(/^\./, '')));
  }

  if (options.category) {
    conditions.push('f.category = ?');
    params.push(options.category);
  }

  if (options.dateAfter) {
    conditions.push('f.modified_at >= ?');
    params.push(options.dateAfter);
  }

  if (options.dateBefore) {
    conditions.push('f.modified_at <= ?');
    params.push(options.dateBefore);
  }

  const whereClause = conditions.join(' AND ');

  // Query matching items with FTS5 bm25 ranking and snippet
  const querySql = `
    SELECT 
      f.id as fileId,
      f.absolute_path as filePath,
      f.filename,
      f.extension,
      f.size_bytes as sizeBytes,
      f.modified_at as modifiedAt,
      f.category,
      bm25(file_content_fts, 5.0, 1.0) as bm25Score,
      snippet(file_content_fts, 1, '<mark>', '</mark>', '...', 20) as snippetText,
      fc.id as chunkId
    FROM file_content_fts
    JOIN file_content fc ON fc.id = file_content_fts.rowid
    JOIN files f ON f.id = fc.file_id
    WHERE ${whereClause}
    ORDER BY bm25Score ASC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, limit, offset];
  const rows = db.prepare(querySql).all(...queryParams) as any[];

  // Group multiple chunk matches per file and normalize scores
  const fileMap = new Map<string, SearchResultItem>();

  for (const r of rows) {
    // Invert BM25 score to 0..1 range (SQLite BM25 returns negative numbers, lower is better)
    const rawBm25 = Number(r.bm25Score) || 0;
    const normalizedScore = Number((1 / (1 + Math.abs(rawBm25))).toFixed(4));

    if (!fileMap.has(r.fileId)) {
      fileMap.set(r.fileId, {
        fileId: r.fileId,
        filePath: r.filePath,
        filename: r.filename,
        extension: r.extension,
        sizeBytes: Number(r.sizeBytes),
        modifiedAt: r.modifiedAt,
        category: r.category,
        score: normalizedScore,
        matchType: 'fts',
        snippets: [],
      });
    }

    const item = fileMap.get(r.fileId)!;
    if (r.snippetText && item.snippets.length < 3) {
      item.snippets.push({
        chunkId: r.chunkId,
        text: r.snippetText,
        highlightRanges: [],
      });
    }
  }

  const results = Array.from(fileMap.values());
  return {
    results,
    totalCount: results.length,
  };
}
