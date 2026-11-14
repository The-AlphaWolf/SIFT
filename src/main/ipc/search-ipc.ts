import { ipcMain, shell } from 'electron';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { SearchResponse } from '../../shared/contracts/ipc-api';

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

// Prohibited executable extensions for security threat model mitigation
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
      searchOptionsSchema.parse(rawOptions || {});

      const startTime = performance.now();

      // Placeholder until Phase 2 & 4 hybrid search integration
      return {
        results: [],
        totalCount: 0,
        queryInterpreted: {
          rawQuery: parsedQuery,
          keywords: parsedQuery ? parsedQuery.split(/\s+/) : [],
          sortBy: 'relevance',
        },
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  );

  ipcMain.handle(IPC_CHANNELS.SEARCH_PREVIEW, async (_event, fileId: unknown) => {
    return {
      content: `Preview for file ${String(fileId)} will be available after indexing.`,
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
