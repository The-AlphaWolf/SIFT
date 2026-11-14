-- 002_fts5_setup.sql
-- Full-Text Search (FTS5) Virtual Table & Triggers

CREATE VIRTUAL TABLE IF NOT EXISTS file_content_fts USING fts5(
    filename,
    chunk_text,
    content='file_content',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);

-- AFTER INSERT Trigger: Sync new chunk to FTS5
CREATE TRIGGER IF NOT EXISTS trg_file_content_ai AFTER INSERT ON file_content BEGIN
    INSERT INTO file_content_fts(rowid, filename, chunk_text)
    VALUES (new.id, new.filename, new.chunk_text);
END;

-- AFTER DELETE Trigger: Remove deleted chunk from FTS5
CREATE TRIGGER IF NOT EXISTS trg_file_content_ad AFTER DELETE ON file_content BEGIN
    INSERT INTO file_content_fts(file_content_fts, rowid, filename, chunk_text)
    VALUES('delete', old.id, old.filename, old.chunk_text);
END;

-- AFTER UPDATE Trigger: Update modified chunk in FTS5
CREATE TRIGGER IF NOT EXISTS trg_file_content_au AFTER UPDATE ON file_content BEGIN
    INSERT INTO file_content_fts(file_content_fts, rowid, filename, chunk_text)
    VALUES('delete', old.id, old.filename, old.chunk_text);
    INSERT INTO file_content_fts(rowid, filename, chunk_text)
    VALUES (new.id, new.filename, new.chunk_text);
END;
