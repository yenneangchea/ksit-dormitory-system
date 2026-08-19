-- Additive repair for the Google Drive-aware application lifecycle.
-- This migration does not modify or delete existing records.
ALTER TABLE public.room_applications
  ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS student_photo_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS national_id_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS family_book_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS prefilled_pdf_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_application_drive_url TEXT;
