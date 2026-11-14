import type Database from 'better-sqlite3';
import { isVecExtensionAvailable } from './connection';

export interface Migration {
  version: number;
  name: string;
  sql: string;
  requiresVec?: boolean;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS indexed_folders (
          id TEXT PRIMARY KEY,
          folder_path TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          last_scanned_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          folder_id TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          absolute_path TEXT NOT NULL UNIQUE,
          filename TEXT NOT NULL,
          extension TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL,
          modified_at TIMESTAMP NOT NULL,
          indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sha256_hash TEXT,
          hash_status TEXT CHECK(hash_status IN ('PENDING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
          extraction_status TEXT CHECK(extraction_status IN
              ('PENDING', 'SUCCESS', 'CORRUPT', 'EMPTY', 'UNSUPPORTED', 'SKIPPED_LOCKED', 'SKIPPED_LARGE'))
              DEFAULT 'PENDING',
          category TEXT DEFAULT 'Miscellaneous',
          is_deleted INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY(folder_id) REFERENCES indexed_folders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
      CREATE INDEX IF NOT EXISTS idx_files_modified_at ON files(modified_at DESC);
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(sha256_hash) WHERE sha256_hash IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
      CREATE INDEX IF NOT EXISTS idx_files_extraction_status ON files(extraction_status);

      CREATE TABLE IF NOT EXISTS file_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          chunk_text TEXT NOT NULL,
          token_count INTEGER NOT NULL,
          extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_file_content_file_id ON file_content(file_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_file_content_unique ON file_content(file_id, chunk_index);

      CREATE TABLE IF NOT EXISTS categories (
          name TEXT PRIMARY KEY,
          is_system INTEGER NOT NULL DEFAULT 0,
          color_hex TEXT NOT NULL DEFAULT '#64748B'
      );

      INSERT OR IGNORE INTO categories (name, is_system, color_hex) VALUES
      ('Academics', 1, '#3B82F6'),
      ('Work', 1, '#10B981'),
      ('Projects', 1, '#8B5CF6'),
      ('Personal', 1, '#EC4899'),
      ('Finance', 1, '#F59E0B'),
      ('Applications', 1, '#06B6D4'),
      ('Images', 1, '#6366F1'),
      ('Miscellaneous', 1, '#64748B');

      CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS file_tags (
          file_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY(file_id, tag_id),
          FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    version: 2,
    name: '002_fts5_setup',
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS file_content_fts USING fts5(
          filename,
          chunk_text,
          content='file_content',
          content_rowid='id',
          tokenize='unicode61 remove_diacritics 2'
      );

      CREATE TRIGGER IF NOT EXISTS trg_file_content_ai AFTER INSERT ON file_content BEGIN
          INSERT INTO file_content_fts(rowid, filename, chunk_text)
          VALUES (new.id, new.filename, new.chunk_text);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_file_content_ad AFTER DELETE ON file_content BEGIN
          INSERT INTO file_content_fts(file_content_fts, rowid, filename, chunk_text)
          VALUES('delete', old.id, old.filename, old.chunk_text);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_file_content_au AFTER UPDATE ON file_content BEGIN
          INSERT INTO file_content_fts(file_content_fts, rowid, filename, chunk_text)
          VALUES('delete', old.id, old.filename, old.chunk_text);
          INSERT INTO file_content_fts(rowid, filename, chunk_text)
          VALUES (new.id, new.filename, new.chunk_text);
      END;
    `,
  },
  {
    version: 3,
    name: '003_vector_setup',
    requiresVec: true,
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS file_embeddings_vec USING vec0(
          embedding float[384] distance_metric=cosine
      );

      CREATE TABLE IF NOT EXISTS file_embedding_map (
          rowid INTEGER PRIMARY KEY,
          content_id INTEGER NOT NULL,
          file_id TEXT NOT NULL,
          FOREIGN KEY(content_id) REFERENCES file_content(id) ON DELETE CASCADE,
          FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_embedding_map_content ON file_embedding_map(content_id);
      CREATE INDEX IF NOT EXISTS idx_embedding_map_file ON file_embedding_map(file_id);
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  // Ensure schema_migrations exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>;
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  const insertMigration = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');

  const hasVec = isVecExtensionAvailable();

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    if (migration.requiresVec && !hasVec) {
      console.warn(`[Migrator] Skipping migration ${migration.version} (${migration.name}): sqlite-vec not loaded.`);
      continue;
    }

    console.log(`[Migrator] Applying migration ${migration.version}: ${migration.name}`);

    const applyTx = db.transaction(() => {
      db.exec(migration.sql);
      insertMigration.run(migration.version, migration.name);
    });

    applyTx();
    console.log(`[Migrator] Successfully applied migration ${migration.version}.`);
  }

  // Ensure FTS5 index is synchronized
  try {
    db.exec("INSERT INTO file_content_fts(file_content_fts) VALUES('rebuild');");
  } catch (e) {
    // Rebuild is safe to ignore on empty database
  }
}
