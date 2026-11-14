import type Database from 'better-sqlite3';
import { generateEmbedding } from '../../../workers/embedder/onnx-runner';
import type { SearchResultItem } from '../../../shared/contracts/ipc-api';
import { isVecExtensionAvailable } from '../db/connection';

export interface VectorMatch {
  fileId: string;
  filePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  category: string;
  distance: number;
  similarity: number;
  chunkId: number;
  chunkText: string;
}

/**
 * Inserts vector embeddings into file_embeddings_vec and links them in file_embedding_map.
 * Note: rowid MUST be passed as BigInt to better-sqlite3 for vec0 compatibility.
 */
export function insertVectorEmbedding(
  db: Database.Database,
  contentId: number,
  fileId: string,
  embedding: Float32Array
): void {
  if (!isVecExtensionAvailable()) {
    return;
  }

  const insertVec = db.prepare('INSERT INTO file_embeddings_vec (rowid, embedding) VALUES (?, ?)');
  const insertMap = db.prepare('INSERT INTO file_embedding_map (rowid, content_id, file_id) VALUES (?, ?, ?)');

  // Use contentId as the integer rowid
  const rowidBigInt = BigInt(contentId);

  const tx = db.transaction(() => {
    // Delete any existing vector for this chunk
    db.prepare('DELETE FROM file_embeddings_vec WHERE rowid = ?').run(rowidBigInt);
    db.prepare('DELETE FROM file_embedding_map WHERE rowid = ?').run(rowidBigInt);

    insertVec.run(rowidBigInt, embedding);
    insertMap.run(rowidBigInt, contentId, fileId);
  });

  tx();
}

/**
 * Executes K-Nearest Neighbor (KNN) vector cosine similarity search.
 */
export async function searchVectorSimilarity(
  db: Database.Database,
  queryText: string,
  k: number = 20
): Promise<VectorMatch[]> {
  if (!isVecExtensionAvailable() || !queryText.trim()) {
    return [];
  }

  const queryVector = await generateEmbedding(queryText);

  const stmt = db.prepare(`
    SELECT 
      m.file_id as fileId,
      m.content_id as chunkId,
      f.absolute_path as filePath,
      f.filename,
      f.extension,
      f.size_bytes as sizeBytes,
      f.modified_at as modifiedAt,
      f.category,
      fc.chunk_text as chunkText,
      v.distance
    FROM file_embeddings_vec v
    JOIN file_embedding_map m ON m.rowid = v.rowid
    JOIN file_content fc ON fc.id = m.content_id
    JOIN files f ON f.id = m.file_id
    WHERE v.embedding MATCH ?
      AND k = ?
      AND f.is_deleted = 0
    ORDER BY v.distance ASC
  `);

  const rows = stmt.all(queryVector, k) as any[];

  return rows.map((r) => {
    const rawDist = Number(r.distance) || 0;
    // Cosine distance in sqlite-vec: 0 is exact match, 2 is opposite
    const similarity = Math.max(0, Math.min(1, 1 - rawDist));

    return {
      fileId: r.fileId,
      filePath: r.filePath,
      filename: r.filename,
      extension: r.extension,
      sizeBytes: Number(r.sizeBytes),
      modifiedAt: r.modifiedAt,
      category: r.category,
      distance: rawDist,
      similarity: Number(similarity.toFixed(4)),
      chunkId: Number(r.chunkId),
      chunkText: r.chunkText,
    };
  });
}
