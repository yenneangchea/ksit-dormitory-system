-- Google Drive metadata for the KSIT five-stage application lifecycle.
-- This additive migration stores Drive references only; document bytes remain outside PostgreSQL.

ALTER TABLE room_applications
  ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS prefilled_pdf_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS student_photo_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS national_id_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS family_book_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_application_drive_url TEXT;

CREATE INDEX IF NOT EXISTS idx_room_applications_google_drive_folder
  ON room_applications(google_drive_folder_id)
  WHERE google_drive_folder_id IS NOT NULL;
