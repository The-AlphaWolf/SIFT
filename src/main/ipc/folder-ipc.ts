import { ipcMain, dialog, BrowserWindow } from 'electron';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../../shared/contracts/ipc-api';
import type { FolderInfo } from '../../shared/types/models';

const addFolderSchema = z.object({
  folderPath: z
    .string()
    .min(1, 'Folder path cannot be empty')
    .refine((p) => path.isAbsolute(p), 'Must be an absolute path')
    .refine((p) => !p.includes('..'), 'Path traversal sequences not allowed'),
});

const removeFolderSchema = z.object({
  folderId: z.string().min(1, 'Folder ID cannot be empty'),
});

// In-memory placeholder store until Phase 2 SQLite integration
let inMemoryFolders: FolderInfo[] = [];

export function registerFolderIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FOLDER_SELECT_DIALOG, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win ?? undefined as any, {
      properties: ['openDirectory', 'dontAddToRecent'],
      title: 'Select Directory to Index with SIFT',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_ADD, async (_event, rawPath: unknown) => {
    const { folderPath } = addFolderSchema.parse({ folderPath: rawPath });
    const normalizedPath = path.normalize(folderPath);

    // Verify folder actually exists
    if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isDirectory()) {
      throw new Error(`Directory does not exist or is not accessible: ${normalizedPath}`);
    }

    // Check duplicate
    const existing = inMemoryFolders.find((f) => f.folderPath.toLowerCase() === normalizedPath.toLowerCase());
    if (existing) {
      return existing;
    }

    const newFolder: FolderInfo = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      folderPath: normalizedPath,
      displayName: path.basename(normalizedPath) || normalizedPath,
      isActive: true,
      fileCount: 0,
      totalSizeBytes: 0,
      lastScannedAt: null,
      createdAt: new Date().toISOString(),
    };

    inMemoryFolders.push(newFolder);
    return newFolder;
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_REMOVE, async (_event, rawId: unknown) => {
    const { folderId } = removeFolderSchema.parse({ folderId: rawId });
    inMemoryFolders = inMemoryFolders.filter((f) => f.id !== folderId);
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_LIST, async () => {
    return inMemoryFolders;
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_REINDEX, async (_event, folderId?: unknown) => {
    console.log(`[FolderIPC] Reindex requested for folderId: ${folderId || 'ALL'}`);
  });
}
