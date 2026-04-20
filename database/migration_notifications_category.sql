-- Add optional category for admin broadcasts (e.g. UpcomingMaintenance, General).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(80) NULL;
