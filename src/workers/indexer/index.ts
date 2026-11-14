import * as path from 'path';
import { extractPdfText } from './extractors/pdf-extractor';
import { extractDocxText } from './extractors/docx-extractor';
import { extractPlainText } from './extractors/text-extractor';
import { chunkText, type TextChunk } from './text-chunker';
import { computeSha256 } from './hasher';
import type { ScannedFileInfo } from './scanner';
import type { ExtractionStatus } from '../../shared/types/models';

export interface ProcessedFileResult {
  fileInfo: ScannedFileInfo;
  sha256Hash: string | null;
  extractionStatus: ExtractionStatus;
  chunks: TextChunk[];
  errorMessage?: string;
}

/**
 * Extracts text content, breaks it into chunks, and optionally computes inline SHA-256.
 */
export async function processFile(fileInfo: ScannedFileInfo): Promise<ProcessedFileResult> {
  const ext = fileInfo.extension.toLowerCase();
  let rawText = '';
  let extractionStatus: ExtractionStatus = 'SUCCESS';
  let errorMessage: string | undefined;

  // Extract Text by Extension
  try {
    if (ext === 'pdf') {
      const pdfRes = await extractPdfText(fileInfo.absolutePath);
      rawText = pdfRes.text;
    } else if (ext === 'docx') {
      rawText = await extractDocxText(fileInfo.absolutePath);
    } else if (['txt', 'md', 'markdown', 'csv', 'json', 'log', 'rtf'].includes(ext)) {
      rawText = await extractPlainText(fileInfo.absolutePath);
    } else {
      extractionStatus = 'UNSUPPORTED';
    }

    if (extractionStatus === 'SUCCESS' && (!rawText || rawText.trim().length === 0)) {
      extractionStatus = 'EMPTY';
    }
  } catch (err: any) {
    extractionStatus = 'CORRUPT';
    errorMessage = err?.message || String(err);
    console.warn(`[FileProcessor] Failed extraction for ${fileInfo.absolutePath}:`, err);
  }

  // Break text into 256-token chunks
  const chunks = rawText ? chunkText(rawText) : [];

  // Compute inline SHA-256 for small files (< 1MB)
  let sha256Hash: string | null = null;
  if (fileInfo.sizeBytes < 1048576) {
    try {
      sha256Hash = await computeSha256(fileInfo.absolutePath);
    } catch {
      // Hash will be queued for background pass
    }
  }

  return {
    fileInfo,
    sha256Hash,
    extractionStatus,
    chunks,
    errorMessage,
  };
}
