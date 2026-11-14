export type ExtractionStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'CORRUPT'
  | 'EMPTY'
  | 'UNSUPPORTED'
  | 'SKIPPED_LOCKED'
  | 'SKIPPED_LARGE';

export type HashStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface FolderInfo {
  id: string;
  folderPath: string;
  displayName: string;
  isActive: boolean;
  fileCount: number;
  totalSizeBytes: number;
  lastScannedAt: string | null;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  folderId: string;
  relativePath: string;
  absolutePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  indexedAt: string;
  sha256Hash: string | null;
  hashStatus: HashStatus;
  extractionStatus: ExtractionStatus;
  category: string;
  isDeleted: boolean;
}

export interface FileContentChunk {
  id: number;
  fileId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  extractedAt: string;
}

export interface CategoryInfo {
  name: string;
  isSystem: boolean;
  colorHex: string;
}

export interface TagInfo {
  id: string;
  name: string;
}
