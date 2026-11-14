import type Database from 'better-sqlite3';
import type { FolderInfo } from '../../../../shared/types/models';

export function insertFolder(db: Database.Database, folder: FolderInfo): void {
  const stmt = db.prepare(`
    INSERT INTO indexed_folders (id, folder_path, display_name, is_active, last_scanned_at, created_at)
    VALUES (@id, @folderPath, @displayName, @isActive, @lastScannedAt, @createdAt)
    ON CONFLICT(folder_path) DO UPDATE SET
      display_name = excluded.display_name,
      is_active = excluded.is_active
  `);

  stmt.run({
    id: folder.id,
    folderPath: folder.folderPath,
    displayName: folder.displayName,
    isActive: folder.isActive ? 1 : 0,
    lastScannedAt: folder.lastScannedAt,
    createdAt: folder.createdAt,
  });
}

export function deleteFolder(db: Database.Database, folderId: string): void {
  const stmt = db.prepare('DELETE FROM indexed_folders WHERE id = ?');
  stmt.run(folderId);
}

export function getAllFolders(db: Database.Database): FolderInfo[] {
  const stmt = db.prepare(`
    SELECT 
      f.id,
      f.folder_path as folderPath,
      f.display_name as displayName,
      f.is_active as isActive,
      f.last_scanned_at as lastScannedAt,
      f.created_at as createdAt,
      COUNT(DISTINCT fi.id) as fileCount,
      COALESCE(SUM(fi.size_bytes), 0) as totalSizeBytes
    FROM indexed_folders f
    LEFT JOIN files fi ON fi.folder_id = f.id AND fi.is_deleted = 0
    GROUP BY f.id
    ORDER BY f.created_at ASC
  `);

  const rows = stmt.all() as any[];
  return rows.map((r) => ({
    id: r.id,
    folderPath: r.folderPath,
    displayName: r.displayName,
    isActive: Boolean(r.isActive),
    fileCount: Number(r.fileCount) || 0,
    totalSizeBytes: Number(r.totalSizeBytes) || 0,
    lastScannedAt: r.lastScannedAt,
    createdAt: r.createdAt,
  }));
}

export function updateFolderScanTimestamp(db: Database.Database, folderId: string): void {
  const stmt = db.prepare(`
    UPDATE indexed_folders 
    SET last_scanned_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  stmt.run(folderId);
}
