-- 020_media_mime_and_storage_indexes.sql
-- Adds mime_type, checksum, and storage optimization indexes to the media table.

ALTER TABLE media
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;

CREATE INDEX IF NOT EXISTS media_file_path_idx ON media(file_path) WHERE file_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_mime_type_idx ON media(mime_type) WHERE mime_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS slides_owner_idx ON slides(owner_id, article_id);
