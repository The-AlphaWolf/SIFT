-- 001_initial_schema.sql
-- Core SIFT SQLite Schema

-- Schema Version Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watched Root Folders
CREATE TABLE IF NOT EXISTS indexed_folders (
    id TEXT PRIMARY KEY,
    folder_path TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_scanned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core File Metadata
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

-- Extracted Document Content & Chunks
-- Uses INTEGER PRIMARY KEY AUTOINCREMENT so rowid is stable for FTS5 and sqlite-vec
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

-- Categories & Tags
CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    is_system INTEGER NOT NULL DEFAULT 0,
    color_hex TEXT NOT NULL DEFAULT '#64748B'
);

-- Insert Default System Categories
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

-- Application Settings Store
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
