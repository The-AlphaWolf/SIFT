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
      SELECT DISTINCT category FROM files WHERE category IS NOT NULL AND is_deleted = 0
    `).all() as Array<{ category: string }>;

    const defaultNames = new Set<string>(DEFAULT_CATEGORIES.map((c) => c.name));
    const result: CategoryInfo[] = [...DEFAULT_CATEGORIES];

    for (const row of rows) {
      if (row.category && !defaultNames.has(row.category)) {
        result.push({
          name: row.category,
          isSystem: false,
          colorHex: '#94A3B8',
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
