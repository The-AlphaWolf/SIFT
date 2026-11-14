import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { CategoryInfo } from '../../shared/types/models';
import { DEFAULT_CATEGORIES } from '../../shared/constants/categories';
import { getDatabase } from '../services/db/connection';

const setCategorySchema = z.object({
  fileId: z.string().min(1),
  category: z.string().min(1).max(50),
});

export function registerCategoryIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_LIST, async (): Promise<CategoryInfo[]> => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        category, 
        COUNT(*) as fileCount, 
        COALESCE(SUM(size_bytes), 0) as totalSizeBytes 
      FROM files 
      WHERE category IS NOT NULL AND is_deleted = 0 
      GROUP BY category
    `).all() as Array<{ category: string; fileCount: number; totalSizeBytes: number }>;

    const countMap = new Map<string, { fileCount: number; totalSizeBytes: number }>();
    for (const row of rows) {
      countMap.set(row.category, {
        fileCount: Number(row.fileCount) || 0,
        totalSizeBytes: Number(row.totalSizeBytes) || 0,
      });
    }

    const defaultNames = new Set<string>(DEFAULT_CATEGORIES.map((c) => c.name));
    const result: CategoryInfo[] = DEFAULT_CATEGORIES.map((cat) => {
      const stats = countMap.get(cat.name);
      return {
        ...cat,
        fileCount: stats?.fileCount || 0,
        totalSizeBytes: stats?.totalSizeBytes || 0,
      };
    });

    for (const row of rows) {
      if (row.category && !defaultNames.has(row.category)) {
        result.push({
          name: row.category,
          isSystem: false,
          colorHex: '#94A3B8',
          fileCount: Number(row.fileCount) || 0,
          totalSizeBytes: Number(row.totalSizeBytes) || 0,
        });
      }
    }

    return result;
  });

  ipcMain.handle(
    IPC_CHANNELS.FILE_SET_CATEGORY,
    async (_event, fileId: unknown, category: unknown): Promise<void> => {
      const parsed = setCategorySchema.parse({ fileId, category });
      const db = getDatabase();
      db.prepare('UPDATE files SET category = ? WHERE id = ?').run(parsed.category, parsed.fileId);
    }
  );
}
