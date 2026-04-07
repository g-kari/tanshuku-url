CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  name       TEXT,
  picture    TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

ALTER TABLE urls ADD COLUMN created_by TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_urls_created_by ON urls(created_by);
