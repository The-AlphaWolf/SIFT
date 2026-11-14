import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type {
  DuplicateResponse,
  OrganizationResponse,
} from '../../shared/contracts/ipc-api';
import { getDatabase } from '../services/db/connection';
import { getDuplicateGroupsQuery } from '../services/db/queries/file-queries';

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export function registerDuplicatesIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DUPLICATES_LIST,
    async (_event, rawOptions: unknown): Promise<DuplicateResponse> => {
      const options = paginationSchema.parse(rawOptions || {});
      const db = getDatabase();
      return getDuplicateGroupsQuery(db, options.limit, options.offset);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ORGANIZATION_SUGGESTIONS,
    async (_event, rawOptions: unknown): Promise<OrganizationResponse> => {
      paginationSchema.parse(rawOptions || {});
      return {
        suggestions: [],
        totalCount: 0,
      };
    }
  );
}
