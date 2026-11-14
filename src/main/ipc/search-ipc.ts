import { ipcMain, shell } from 'electron';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { SearchResponse, SearchResultItem } from '../../shared/contracts/ipc-api';
import { getDatabase } from '../services/db/connection';
import { searchFtsQuery } from '../services/db/queries/fts-queries';
import { searchVectorSimilarity } from '../services/search/vector-engine';
import { fuseAndRankResults } from '../services/search/hybrid-ranker';
import { interpretNaturalQuery } from '../services/search/query-interpreter';
import { getActiveAiProvider } from '../services/ai/ai-service';

const searchOptionsSchema = z.object({
  useAiInterpretation: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  filters: z
    .object({
      extensions: z.array(z.string().max(10)).max(20).optional(),
      dateAfter: z.string().optional(),
      dateBefore: z.string().optional(),
      category: z.string().max(50).optional(),
    })
    .optional(),
});

const filePathSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .refine((p) => path.isAbsolute(p), 'Path must be absolute')
    .refine((p) => !p.includes('..'), 'Path traversal not allowed'),
});

const PROHIBITED_EXECUTABLE_EXTS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.ps1',
  '.vbs',
  '.msi',
  '.com',
  '.scr',
]);

export function registerSearchIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_EXECUTE,
    async (_event, query: unknown, rawOptions: unknown): Promise<SearchResponse> => {
      const parsedQuery = typeof query === 'string' ? query.trim() : '';
      const options = searchOptionsSchema.parse(rawOptions || {});

      const startTime = performance.now();
      const db = getDatabase();

      if (!parsedQuery) {
        const conditions: string[] = ['is_deleted = 0'];
        const params: any[] = [];

        if (options.filters?.category) {
          conditions.push('category = ?');
          params.push(options.filters.category);
        }

        if (options.filters?.extensions && options.filters.extensions.length > 0) {
          const extPlaceholders = options.filters.extensions.map(() => '?').join(',');
          conditions.push(`extension IN (${extPlaceholders})`);
          params.push(...options.filters.extensions.map((e) => e.toLowerCase().replace(/^\./, '')));
        }

        if (options.filters?.dateAfter) {
          conditions.push('modified_at >= ?');
          params.push(options.filters.dateAfter);
        }

        if (options.filters?.dateBefore) {
          conditions.push('modified_at <= ?');
          params.push(options.filters.dateBefore);
        }

        const whereClause = conditions.join(' AND ');
        const totalCount = (
          db.prepare(`SELECT COUNT(*) as cnt FROM files WHERE ${whereClause}`).get(...params) as any
        )?.cnt || 0;

        const rows = db.prepare(`
          SELECT 
            id as fileId,
            absolute_path as filePath,
            filename,
            extension,
            size_bytes as sizeBytes,
            modified_at as modifiedAt,
            category,
            1.0 as score,
            'filename' as matchType
          FROM files
          WHERE ${whereClause}
          ORDER BY modified_at DESC
          LIMIT ? OFFSET ?
        `).all(...params, options.limit, options.offset) as any[];

        const results: SearchResultItem[] = rows.map((r) => ({
          fileId: r.fileId,
          filePath: r.filePath,
          filename: r.filename,
          extension: r.extension,
          sizeBytes: r.sizeBytes,
          modifiedAt: r.modifiedAt,
          category: r.category,
          score: 1.0,
          matchType: 'filename',
          snippets: [],
        }));

        return {
          results,
          totalCount,
          executionTimeMs: Math.round(performance.now() - startTime),
        };
      }

      // Query interpretation (AI or deterministic fallback)
      const provider = options.useAiInterpretation ? getActiveAiProvider() : undefined;
      const structuredQuery = await interpretNaturalQuery(parsedQuery, provider);

      const activeKeywords =
        structuredQuery.keywords.length > 0 ? structuredQuery.keywords : [parsedQuery];
      const activeQueryStr = activeKeywords.join(' ');

      const effectiveExtensions = options.filters?.extensions?.length
        ? options.filters.extensions
        : structuredQuery.extensions;
      const effectiveCategory = options.filters?.category || structuredQuery.category;
      const effectiveDateAfter = options.filters?.dateAfter || structuredQuery.dateAfter;
      const effectiveDateBefore = options.filters?.dateBefore || structuredQuery.dateBefore;

      // 1. Keyword search via SQLite FTS5
      const ftsResult = searchFtsQuery(db, activeQueryStr, {
        limit: options.limit * 2,
        offset: 0,
        extensions: effectiveExtensions,
        category: effectiveCategory,
        dateAfter: effectiveDateAfter,
        dateBefore: effectiveDateBefore,
      });

      // 2. Semantic vector search via sqlite-vec
      let vectorMatches: any[] = [];
      try {
        vectorMatches = await searchVectorSimilarity(db, activeQueryStr, 30);
      } catch (vecErr) {
        console.warn('[SearchIPC] Vector search fallback to FTS-only:', vecErr);
      }

      // 3. Hybrid fusion ranking
      const rankedResults = fuseAndRankResults(ftsResult.results, vectorMatches, activeKeywords);

      // Apply pagination
      const paginated = rankedResults.slice(options.offset, options.offset + options.limit);

      return {
        results: paginated,
        totalCount: rankedResults.length,
        queryInterpreted: structuredQuery,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  );

  ipcMain.handle(IPC_CHANNELS.SEARCH_PREVIEW, async (_event, fileId: unknown) => {
    const db = getDatabase();
    const row = db
      .prepare('SELECT chunk_text FROM file_content WHERE file_id = ? ORDER BY chunk_index ASC LIMIT 5')
      .all(String(fileId)) as Array<{ chunk_text: string }>;

    if (!row || row.length === 0) {
      return {
        content: 'No extracted text available for this file.',
        mimeType: 'text/plain',
      };
    }

    return {
      content: row.map((r) => r.chunk_text).join('\n\n---\n\n'),
      mimeType: 'text/plain',
    };
  });

  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async (_event, rawPath: unknown) => {
    const { filePath } = filePathSchema.parse({ filePath: rawPath });
    const normalized = path.normalize(filePath);
    const ext = path.extname(normalized).toLowerCase();

    if (PROHIBITED_EXECUTABLE_EXTS.has(ext)) {
      throw new Error(`Security Exception: Direct execution of '${ext}' files is blocked.`);
    }

    if (!fs.existsSync(normalized)) {
      throw new Error(`File does not exist: ${normalized}`);
    }

    const errorMsg = await shell.openPath(normalized);
    if (errorMsg) {
      throw new Error(`Failed to open file: ${errorMsg}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_REVEAL, async (_event, rawPath: unknown) => {
    const { filePath } = filePathSchema.parse({ filePath: rawPath });
    const normalized = path.normalize(filePath);

    if (!fs.existsSync(normalized)) {
      throw new Error(`File does not exist: ${normalized}`);
    }

    shell.showItemInFolder(normalized);
  });
}
