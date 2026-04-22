-- Channel credentials previously stored in localStorage per project.
-- Moving to DB so they sync across browsers/devices.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS wp_credentials JSONB,
  ADD COLUMN IF NOT EXISTS meta_credentials JSONB;
