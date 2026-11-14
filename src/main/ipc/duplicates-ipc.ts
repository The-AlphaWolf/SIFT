import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type {
  DuplicateResponse,
  OrganizationResponse,
} from '../../shared/contracts/ipc-api';

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export function registerDuplicatesIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DUPLICATES_LIST,
    async (_event, options: unknown): Promise<DuplicateResponse> => {
      paginationSchema.parse(options || {});
      return {
        groups: [],
        totalGroups: 0,
        totalReclaimableBytes: 0,
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ORGANIZATION_SUGGESTIONS,
    async (_event, options: unknown): Promise<OrganizationResponse> => {
      paginationSchema.parse(options || {});
      return {
        suggestions: [],
        totalCount: 0,
      };
    }
  );
}
