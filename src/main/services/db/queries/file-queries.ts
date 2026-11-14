import type Database from 'better-sqlite3';
import type { FileRecord } from '../../../../shared/types/models';
import type { DuplicateGroup, SystemStats } from '../../../../shared/contracts/ipc-api';

export function upsertFileRecord(db: Database.Database, file: FileRecord): string {
  // Check if file already exists with this absolute_path
  const existing = db
    .prepare('SELECT id FROM files WHERE absolute_path = ?')
    .get(file.absolutePath) as { id: string } | undefined;

  const activeId = existing?.id || file.id;

  const stmt = db.prepare(`
    INSERT INTO files (
      id, folder_id, relative_path, absolute_path, filename, extension,
      size_bytes, created_at, modified_at, indexed_at, sha256_hash,
      hash_status, extraction_status, category, is_deleted
    ) VALUES (
      @id, @folderId, @relativePath, @absolutePath, @filename, @extension,
      @sizeBytes, @createdAt, @modifiedAt, @indexedAt, @sha256Hash,
      @hashStatus, @extractionStatus, @category, @isDeleted
    )
    ON CONFLICT(absolute_path) DO UPDATE SET
      filename = excluded.filename,
      extension = excluded.extension,
      size_bytes = excluded.size_bytes,
      modified_at = excluded.modified_at,
      indexed_at = CURRENT_TIMESTAMP,
      sha256_hash = COALESCE(excluded.sha256_hash, files.sha256_hash),
      hash_status = excluded.hash_status,
      extraction_status = excluded.extraction_status,
      category = excluded.category,
      is_deleted = 0
  `);

  stmt.run({
    id: activeId,
    folderId: file.folderId,
    relativePath: file.relativePath,
    absolutePath: file.absolutePath,
    filename: file.filename,
    extension: file.extension.toLowerCase().replace(/^\./, ''),
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt,
    modifiedAt: file.modifiedAt,
    indexedAt: file.indexedAt || new Date().toISOString(),
    sha256Hash: file.sha256Hash,
    hashStatus: file.hashStatus || 'PENDING',
    extractionStatus: file.extractionStatus || 'PENDING',
    category: file.category || 'Miscellaneous',
    isDeleted: file.isDeleted ? 1 : 0,
  });

  return activeId;
}

export function markFileDeleted(db: Database.Database, absolutePath: string): void {
  const stmt = db.prepare(`
    UPDATE files 
    SET is_deleted = 1 
    WHERE absolute_path = ?
  `);
  stmt.run(absolutePath);
}

export function updateFileHash(
  db: Database.Database,
  fileId: string,
  sha256Hash: string
): void {
  const stmt = db.prepare(`
    UPDATE files 
    SET sha256_hash = ?, hash_status = 'COMPLETED' 
    WHERE id = ?
  `);
  stmt.run(sha256Hash, fileId);
}

export function insertFileChunks(
  db: Database.Database,
  fileId: string,
  filename: string,
  chunks: Array<{ chunkIndex: number; chunkText: string; tokenCount: number }>
): void {
  // Use a transaction: delete old chunks first so triggers clean FTS5, then insert new chunks
  const tx = db.transaction(() => {
    // Delete old content chunks (FTS5 trg_file_content_ad handles deletion)
    db.prepare('DELETE FROM file_content WHERE file_id = ?').run(fileId);

    const insertStmt = db.prepare(`
      INSERT INTO file_content (file_id, filename, chunk_index, chunk_text, token_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const chunk of chunks) {
      insertStmt.run(fileId, filename, chunk.chunkIndex, chunk.chunkText, chunk.tokenCount);
    }

    db.prepare(`
      UPDATE files 
      SET extraction_status = 'SUCCESS' 
      WHERE id = ?
    `).run(fileId);
  });

  tx();
}

export function getDuplicateGroupsQuery(
  db: Database.Database,
  limit: number = 50,
  offset: number = 0
): { groups: DuplicateGroup[]; totalGroups: number; totalReclaimableBytes: number } {
  // Find hashes with more than 1 file
  const summaryStmt = db.prepare(`
    SELECT 
      COUNT(DISTINCT sha256_hash) as totalGroups,
      COALESCE(SUM((cnt - 1) * size_bytes), 0) as totalReclaimable
    FROM (
      SELECT sha256_hash, size_bytes, COUNT(*) as cnt
      FROM files
      WHERE sha256_hash IS NOT NULL AND is_deleted = 0
      GROUP BY sha256_hash
      HAVING cnt > 1
    )
  `);

  const summary = (summaryStmt.get() as any) || { totalGroups: 0, totalReclaimable: 0 };

  const groupsStmt = db.prepare(`
    SELECT sha256_hash, size_bytes, COUNT(*) as fileCount
    FROM files
    WHERE sha256_hash IS NOT NULL AND is_deleted = 0
    GROUP BY sha256_hash
    HAVING fileCount > 1
    ORDER BY (fileCount * size_bytes) DESC
    LIMIT ? OFFSET ?
  `);

  const rawGroups = groupsStmt.all(limit, offset) as any[];

  const filesForHashStmt = db.prepare(`
    SELECT id, absolute_path as filePath, modified_at as modifiedAt, size_bytes as sizeBytes
    FROM files
    WHERE sha256_hash = ? AND is_deleted = 0
    ORDER BY modified_at DESC
  `);

  const groups: DuplicateGroup[] = rawGroups.map((g) => {
    const files = filesForHashStmt.all(g.sha256_hash) as any[];
    return {
      sha256Hash: g.sha256_hash,
      sizeBytes: g.size_bytes,
      fileCount: g.fileCount,
      reclaimableBytes: (g.fileCount - 1) * g.size_bytes,
      files,
    };
  });

  return {
    groups,
    totalGroups: Number(summary.totalGroups) || 0,
    totalReclaimableBytes: Number(summary.totalReclaimable) || 0,
  };
}

export function getSystemStatsQuery(db: Database.Database): SystemStats {
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as totalFiles,
      COALESCE(SUM(size_bytes), 0) as totalSizeBytes
    FROM files
    WHERE is_deleted = 0
  `).get() as any;

  const totalFolders = (db.prepare('SELECT COUNT(*) as cnt FROM indexed_folders').get() as any)?.cnt || 0;

  const duplicates = db.prepare(`
    SELECT 
      COALESCE(SUM(cnt - 1), 0) as duplicateCount,
      COALESCE(SUM((cnt - 1) * size_bytes), 0) as reclaimableBytes
    FROM (
      SELECT size_bytes, COUNT(*) as cnt
      FROM files
      WHERE sha256_hash IS NOT NULL AND is_deleted = 0
      GROUP BY sha256_hash
      HAVING cnt > 1
    )
  `).get() as any;

  const catRows = db.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM files
    WHERE is_deleted = 0
    GROUP BY category
  `).all() as any[];

  const categoryCounts: Record<string, number> = {};
  for (const row of catRows) {
    categoryCounts[row.category] = row.cnt;
  }

  const extRows = db.prepare(`
    SELECT extension, COUNT(*) as cnt
    FROM files
    WHERE is_deleted = 0
    GROUP BY extension
  `).all() as any[];

  const extensionCounts: Record<string, number> = {};
  for (const row of extRows) {
    extensionCounts[row.extension] = row.cnt;
  }

  return {
    totalFiles: Number(totals?.totalFiles) || 0,
    totalSizeBytes: Number(totals?.totalSizeBytes) || 0,
    totalFolders: Number(totalFolders) || 0,
    duplicateCount: Number(duplicates?.duplicateCount) || 0,
    reclaimableBytes: Number(duplicates?.reclaimableBytes) || 0,
    categoryCounts,
    extensionCounts,
  };
}
