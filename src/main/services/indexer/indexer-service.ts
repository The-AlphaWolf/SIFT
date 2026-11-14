import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';
import * as path from 'path';
import { scanDirectory, type ScannedFileInfo } from '../../../workers/indexer/scanner';
import { processFile } from '../../../workers/indexer';
import type { TextChunk } from '../../../workers/indexer/text-chunker';
import { getDatabase } from '../db/connection';
import {
  upsertFileRecord,
  insertFileChunks,
  updateFileHash,
} from '../db/queries/file-queries';
import { updateFolderScanTimestamp } from '../db/queries/folder-queries';
import { generateEmbedding } from '../../../workers/embedder/onnx-runner';
import { insertVectorEmbedding } from '../search/vector-engine';
import { categorizeFile } from '../categorization/rule-categorizer';
import { IPC_CHANNELS, type IndexingProgressEvent } from '../../../shared/contracts/ipc-api';
import type { FileRecord } from '../../../shared/types/models';

export class IndexerService {
  private static instance: IndexerService;
  private isIndexing: boolean = false;
  private isPaused: boolean = false;
  private cancelRequested: boolean = false;

  private constructor() {}

  public static getInstance(): IndexerService {
    if (!IndexerService.instance) {
      IndexerService.instance = new IndexerService();
    }
    return IndexerService.instance;
  }

  public getStatus(): { isIndexing: boolean; isPaused: boolean } {
    return { isIndexing: this.isIndexing, isPaused: this.isPaused };
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public cancel(): void {
    this.cancelRequested = true;
    this.isPaused = false;
    this.isIndexing = false;
  }

  public async indexFolder(folderId: string, folderPath: string): Promise<void> {
    if (this.isIndexing) {
      console.log('[IndexerService] Indexing already in progress. Enqueueing...');
    }

    this.isIndexing = true;
    this.cancelRequested = false;
    this.isPaused = false;

    const db = getDatabase();

    try {
      this.broadcastProgress('scanning', 0, 0, folderPath, false);
      const files = await scanDirectory(folderId, folderPath);
      const total = files.length;

      console.log(`[IndexerService] Discovered ${total} files in ${folderPath}`);

      let processed = 0;

      for (const fileInfo of files) {
        if (this.cancelRequested) {
          console.log('[IndexerService] Indexing cancelled by user');
          break;
        }

        while (this.isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (this.cancelRequested) break;
        }

        this.broadcastProgress('extracting', total, processed, fileInfo.absolutePath, false);

        try {
          // Process file: extract text and chunk
          const result = await processFile(fileInfo);

          // Full deterministic SHA-256 hash of normalized absolute path prevents ID collision
          const normalized = path.normalize(fileInfo.absolutePath).toLowerCase();
          const fileId = `file-${crypto.createHash('sha256').update(normalized).digest('hex')}`;

          const fileRecord: FileRecord = {
            id: fileId,
            folderId: fileInfo.folderId,
            relativePath: fileInfo.relativePath,
            absolutePath: fileInfo.absolutePath,
            filename: fileInfo.filename,
            extension: fileInfo.extension,
            sizeBytes: fileInfo.sizeBytes,
            createdAt: fileInfo.createdAt,
            modifiedAt: fileInfo.modifiedAt,
            indexedAt: new Date().toISOString(),
            sha256Hash: result.sha256Hash,
            hashStatus: result.sha256Hash ? 'COMPLETED' : 'PENDING',
            extractionStatus: result.extractionStatus,
            category: categorizeFile({
              filename: fileInfo.filename,
              extension: fileInfo.extension,
              relativePath: fileInfo.relativePath,
              absolutePath: fileInfo.absolutePath,
            }),
            isDeleted: false,
          };

          const actualFileId = upsertFileRecord(db, fileRecord);

          // If chunks extracted, insert into file_content (which synchronizes FTS5 automatically via triggers)
          if (result.chunks.length > 0) {
            insertFileChunks(
              db,
              actualFileId,
              fileInfo.filename,
              result.chunks.map((c: TextChunk) => ({
                chunkIndex: c.chunkIndex,
                chunkText: c.chunkText,
                tokenCount: c.tokenCount,
              }))
            );

            // Generate embeddings for top chunks to ensure fast indexing
            const chunksToEmbed = result.chunks.slice(0, 5);
            for (const chunk of chunksToEmbed) {
              try {
                const embedding = await generateEmbedding(chunk.chunkText);
                const chunkRow = db
                  .prepare('SELECT id FROM file_content WHERE file_id = ? AND chunk_index = ?')
                  .get(actualFileId, chunk.chunkIndex) as any;
                if (chunkRow?.id) {
                  insertVectorEmbedding(db, chunkRow.id, actualFileId, embedding);
                }
              } catch (vecErr) {
                console.warn('[IndexerService] Vector embedding error for chunk:', vecErr);
              }
            }
          }
        } catch (fileErr) {
          console.warn(`[IndexerService] Error processing file ${fileInfo.absolutePath}:`, fileErr);
        }

        processed++;
      }

      updateFolderScanTimestamp(db, folderId);
      this.broadcastProgress('idle', total, processed, '', false);
      console.log(`[IndexerService] Finished indexing folder ${folderId} (${processed}/${total} processed)`);
    } catch (err) {
      console.error(`[IndexerService] Error indexing folder ${folderPath}:`, err);
      this.broadcastProgress('idle', 0, 0, '', false);
    } finally {
      this.isIndexing = false;
    }
  }

  private broadcastProgress(
    stage: IndexingProgressEvent['stage'],
    totalFiles: number,
    processedFiles: number,
    currentFilePath: string,
    isPaused: boolean
  ): void {
    const payload: IndexingProgressEvent = {
      stage,
      totalFiles,
      processedFiles,
      currentFilePath,
      isPaused,
    };

    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.INDEX_PROGRESS_EVENT, payload);
      }
    }
  }
}
