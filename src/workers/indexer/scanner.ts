import * as fs from 'fs';
import * as path from 'path';
import { isSupportedExtension } from '../../shared/constants/supported-extensions';

export interface ScannedFileInfo {
  folderId: string;
  relativePath: string;
  absolutePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
}

const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.idea',
  '$recycle.bin',
  'system volume information',
  'appdata',
  'dist',
  'out',
  'build',
]);

/**
 * Recursively walks a directory, collecting supported files.
 * Protects against symlink loops, inaccessible files, and hidden directories.
 */
export async function scanDirectory(
  folderId: string,
  rootPath: string,
  onFileDiscovered?: (file: ScannedFileInfo) => void
): Promise<ScannedFileInfo[]> {
  const discovered: ScannedFileInfo[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`[Scanner] Skipping inaccessible directory: ${currentDir}`, err);
      return;
    }

    for (const entry of entries) {
      const entryName = entry.name;

      // Skip hidden files and directories
      if (entryName.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, entryName);

      // Security Check: strictly ignore symbolic links
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORY_NAMES.has(entryName.toLowerCase())) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entryName).toLowerCase().replace(/^\./, '');

        if (isSupportedExtension(ext)) {
          try {
            const stat = await fs.promises.stat(fullPath);
            const relPath = path.relative(rootPath, fullPath);

            const fileInfo: ScannedFileInfo = {
              folderId,
              relativePath: relPath,
              absolutePath: fullPath,
              filename: entryName,
              extension: ext,
              sizeBytes: stat.size,
              createdAt: stat.birthtime.toISOString(),
              modifiedAt: stat.mtime.toISOString(),
            };

            discovered.push(fileInfo);
            if (onFileDiscovered) {
              onFileDiscovered(fileInfo);
            }
          } catch (statErr) {
            console.warn(`[Scanner] Cannot stat file: ${fullPath}`, statErr);
          }
        }
      }
    }
  }

  await walk(rootPath);
  return discovered;
}
