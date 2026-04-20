-- Add is_read to existing databases (safe to run multiple times)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
