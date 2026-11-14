import { ipcMain, shell } from 'electron';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { SearchResponse } from '../../shared/contracts/ipc-api';
import { getDatabase } from '../services/db/connection';
import { searchFtsQuery } from '../services/db/queries/fts-queries';
import { searchVectorSimilarity } from '../services/search/vector-engine';
import { fuseAndRankResults } from '../services/search/hybrid-ranker';

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
        return {
          results: [],
          totalCount: 0,
          executionTimeMs: 0,
        };
      }

      // 1. Keyword search via SQLite FTS5
      const ftsResult = searchFtsQuery(db, parsedQuery, {
        limit: options.limit,
        offset: options.offset,
        extensions: options.filters?.extensions,
        category: options.filters?.category,
        dateAfter: options.filters?.dateAfter,
        dateBefore: options.filters?.dateBefore,
      });

      // 2. Semantic vector search via sqlite-vec
      let vectorMatches: any[] = [];
      try {
        vectorMatches = await searchVectorSimilarity(db, parsedQuery, 20);
      } catch (vecErr) {
        console.warn('[SearchIPC] Vector search fallback to FTS-only:', vecErr);
      }

      // 3. Hybrid fusion ranking
      const keywords = parsedQuery.split(/\s+/).filter((k) => k.length > 0);
      const rankedResults = fuseAndRankResults(ftsResult.results, vectorMatches, keywords);

      // Apply pagination
      const paginated = rankedResults.slice(options.offset, options.offset + options.limit);

      return {
        results: paginated,
        totalCount: rankedResults.length,
        queryInterpreted: {
          rawQuery: parsedQuery,
          keywords,
          sortBy: 'relevance',
        },
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
