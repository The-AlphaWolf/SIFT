import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface DatabaseServiceOptions {
  dbPath?: string;
  inMemory?: boolean;
}

let dbInstance: Database.Database | null = null;
let vecExtensionLoaded = false;

export function getDatabasePath(): string {
  // Use Electron's userData directory in runtime, or a local dev folder
  const userDataPath = app?.getPath ? app.getPath('userData') : process.cwd();
  const dbDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'sift.db');
}

export function initializeDatabase(options: DatabaseServiceOptions = {}): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbTarget = options.inMemory ? ':memory:' : (options.dbPath || getDatabasePath());
  
  const db = new Database(dbTarget, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Optimize SQLite PRAGMAs for Windows performance & concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -64000'); // 64 MB
  db.pragma('mmap_size = 268435456'); // 256 MB

  // Load sqlite-vec extension with graceful fallback
  try {
    sqliteVec.load(db);
    vecExtensionLoaded = true;
    console.log('[Database] sqlite-vec extension successfully loaded.');
  } catch (error) {
    vecExtensionLoaded = false;
    console.warn('[Database] Warning: sqlite-vec native extension could not be loaded. Vector search will use in-memory fallback.', error);
  }

  dbInstance = db;
  return dbInstance;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase();
  }
  return dbInstance;
}

export function isVecExtensionAvailable(): boolean {
  return vecExtensionLoaded;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.error('[Database] Error closing database:', e);
    }
    dbInstance = null;
    vecExtensionLoaded = false;
  }
}
