-- 003_vector_setup.sql
-- sqlite-vec Vector Table & Companion Mapping Table

-- sqlite-vec virtual table (integer rowid ONLY — TEXT primary keys are illegal)
CREATE VIRTUAL TABLE IF NOT EXISTS file_embeddings_vec USING vec0(
    embedding float[384] distance_metric=cosine
);

-- Companion table mapping vec0 integer rowids back to content chunks and files
CREATE TABLE IF NOT EXISTS file_embedding_map (
    rowid INTEGER PRIMARY KEY,
    content_id INTEGER NOT NULL,
    file_id TEXT NOT NULL,
    FOREIGN KEY(content_id) REFERENCES file_content(id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embedding_map_content ON file_embedding_map(content_id);
CREATE INDEX IF NOT EXISTS idx_embedding_map_file ON file_embedding_map(file_id);
