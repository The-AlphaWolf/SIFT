// Integration test for Phase 2: SQLite, Migrations, FTS5 triggers, and Queries
// Executed with Electron runtime to ensure exact native ABI compatibility

const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');
const assert = require('assert');

console.log('--- SIFT Phase 2 Integration Test: SQLite & FTS5 ---');

// 1. Initialize In-Memory Database with WAL/performance settings
const db = new Database(':memory:');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// 2. Load sqlite-vec
let hasVec = false;
try {
  sqliteVec.load(db);
  hasVec = true;
  console.log('✓ sqlite-vec loaded successfully');
} catch (e) {
  console.warn('sqlite-vec not loaded:', e);
}

// 3. Run Migrations
// Migration 1: Schema
db.exec(`
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
`);
console.log('✓ Migration 1 applied');

// Migration 2: FTS5 Setup & Triggers (matched columns)
db.exec(`
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
`);
console.log('✓ Migration 2 (FTS5 + Triggers) applied');

// Migration 3: sqlite-vec setup
if (hasVec) {
  db.exec(`
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
  `);
  console.log('✓ Migration 3 (sqlite-vec + map table) applied');
}

// 4. Test Folder Insertion
db.prepare(`
  INSERT INTO indexed_folders (id, folder_path, display_name)
  VALUES ('f1', 'D:\\Documents\\Notes', 'Notes')
`).run();

const folder = db.prepare('SELECT * FROM indexed_folders WHERE id = ?').get('f1');
assert.strictEqual(folder.display_name, 'Notes');
console.log('✓ Folder insertion verified');

// 5. Test File Insertion
db.prepare(`
  INSERT INTO files (
    id, folder_id, relative_path, absolute_path, filename, extension,
    size_bytes, created_at, modified_at, sha256_hash, hash_status, extraction_status, category
  ) VALUES (
    'doc1', 'f1', 'waveguide_notes.pdf', 'D:\\Documents\\Notes\\waveguide_notes.pdf',
    'waveguide_notes.pdf', 'pdf', 1048576, '2026-01-01', '2026-01-02',
    'hash_waveguide_123', 'COMPLETED', 'PENDING', 'Academics'
  )
`).run();

console.log('✓ File record insertion verified');

// 6. Test Content Chunk Insertion & FTS5 Trigger Verification
db.prepare(`
  INSERT INTO file_content (file_id, filename, chunk_index, chunk_text, token_count)
  VALUES ('doc1', 'waveguide_notes.pdf', 0, 'Analysis of electromagnetic wave propagation and TE10 dominant mode in rectangular waveguides.', 15)
`).run();

// Query FTS5 table directly
const ftsMatch = db.prepare(`
  SELECT 
    rowid,
    filename,
    snippet(file_content_fts, 1, '<b>', '</b>', '...', 10) as snip,
    bm25(file_content_fts) as score
  FROM file_content_fts
  WHERE file_content_fts MATCH 'waveguide*'
`).get();

assert.ok(ftsMatch, 'FTS5 match should find waveguide document');
assert.strictEqual(ftsMatch.filename, 'waveguide_notes.pdf');
assert.ok(ftsMatch.snip.includes('<b>waveguides</b>'), 'Snippet should highlight matching term');
console.log('✓ FTS5 INSERT trigger and search matching verified (Snippet: ' + ftsMatch.snip + ')');

// 7. Test FTS5 UPDATE Trigger
db.prepare(`
  UPDATE file_content 
  SET chunk_text = 'Updated text covering cylindrical cavity resonators and optical waveguides.'
  WHERE file_id = 'doc1' AND chunk_index = 0
`).run();

const ftsOldMatch = db.prepare("SELECT * FROM file_content_fts WHERE file_content_fts MATCH 'electromagnetic'").get();
assert.strictEqual(ftsOldMatch, undefined, 'Old token should be deleted from FTS5');

const ftsNewMatch = db.prepare("SELECT * FROM file_content_fts WHERE file_content_fts MATCH 'cylindrical'").get();
assert.ok(ftsNewMatch, 'New token should be indexed in FTS5');
console.log('✓ FTS5 UPDATE trigger verified (Old token removed, new token indexed)');

// 8. Test FTS5 DELETE Trigger
db.prepare("DELETE FROM file_content WHERE file_id = 'doc1'").run();
const ftsAfterDelete = db.prepare("SELECT * FROM file_content_fts WHERE file_content_fts MATCH 'waveguide*'").get();
assert.strictEqual(ftsAfterDelete, undefined, 'Deleted content must be purged from FTS5');
console.log('✓ FTS5 DELETE trigger verified (Purged from virtual index)');

// 9. Test Duplicate Grouping by SHA-256
db.prepare(`
  INSERT INTO files (
    id, folder_id, relative_path, absolute_path, filename, extension,
    size_bytes, created_at, modified_at, sha256_hash, hash_status, extraction_status, category
  ) VALUES 
    ('dup1', 'f1', 'cv_v1.pdf', 'D:\\Documents\\Notes\\cv_v1.pdf', 'cv_v1.pdf', 'pdf', 500000, '2026-01-01', '2026-01-02', 'same_hash_456', 'COMPLETED', 'SUCCESS', 'Personal'),
    ('dup2', 'f1', 'cv_v2_copy.pdf', 'D:\\Documents\\Notes\\cv_v2_copy.pdf', 'cv_v2_copy.pdf', 'pdf', 500000, '2026-01-01', '2026-01-03', 'same_hash_456', 'COMPLETED', 'SUCCESS', 'Personal')
`).run();

const dupSummary = db.prepare(`
  SELECT sha256_hash, size_bytes, COUNT(*) as cnt, (COUNT(*) - 1) * size_bytes as reclaimable
  FROM files
  WHERE sha256_hash IS NOT NULL AND is_deleted = 0
  GROUP BY sha256_hash
  HAVING cnt > 1
`).get();

assert.strictEqual(dupSummary.cnt, 2);
assert.strictEqual(dupSummary.reclaimable, 500000);
console.log('✓ Exact SHA-256 duplicate grouping and reclaimable calculation verified (Reclaimable: 500 KB)');

// 10. Vector Table & Mapping Verification (if sqlite-vec loaded)
if (hasVec) {
  // Re-insert content chunk
  const contentRow = db.prepare(`
    INSERT INTO file_content (file_id, filename, chunk_index, chunk_text, token_count)
    VALUES ('dup1', 'cv_v1.pdf', 0, 'Curriculum Vitae text chunk', 10)
  `).run();

  const dummyVec = new Float32Array(384);
  dummyVec[0] = 0.5;
  dummyVec[1] = 0.8;

  // Insert vector into vec0 with rowid as BigInt (required by sqlite-vec in better-sqlite3)
  const vecInsert = db.prepare('INSERT INTO file_embeddings_vec(rowid, embedding) VALUES (?, ?)').run(BigInt(1), dummyVec);
  db.prepare('INSERT INTO file_embedding_map(rowid, content_id, file_id) VALUES (?, ?, ?)').run(1, Number(contentRow.lastInsertRowid), 'dup1');

  // Query vector
  const vecResult = db.prepare(`
    SELECT m.file_id, v.distance
    FROM file_embeddings_vec v
    JOIN file_embedding_map m ON m.rowid = v.rowid
    WHERE v.embedding MATCH ?
      AND k = 5
  `).get(dummyVec);

  assert.ok(vecResult, 'Vector search should return match');
  assert.strictEqual(vecResult.file_id, 'dup1');
  console.log('✓ sqlite-vec cosine distance query through file_embedding_map verified (Distance: ' + vecResult.distance + ')');
}

console.log('\n========================================');
console.log('🎉 ALL PHASE 2 INTEGRATION TESTS PASSED!');
console.log('========================================\n');
process.exit(0);
