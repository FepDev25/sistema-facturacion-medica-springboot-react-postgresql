CREATE TABLE IF NOT EXISTS vector_store (
    id      UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(768)
);

CREATE INDEX IF NOT EXISTS vector_store_hnsw_idx
    ON vector_store USING hnsw (embedding vector_cosine_ops);
