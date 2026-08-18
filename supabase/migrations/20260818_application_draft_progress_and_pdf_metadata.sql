-- Additive, idempotent draft-resume metadata for the four-section KSIT dormitory application.
-- No existing application data is deleted or rewritten.

ALTER TABLE public.room_applications
  ADD COLUMN IF NOT EXISTS step_progress INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;

ALTER TABLE public.room_applications
  DROP CONSTRAINT IF EXISTS room_applications_step_progress_range,
  DROP CONSTRAINT IF EXISTS check_step_progress,
  ADD CONSTRAINT check_step_progress CHECK (step_progress BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_room_applications_draft_progress
  ON public.room_applications(user_id, academic_year_applied, step_progress)
  WHERE status IN ('draft', 'correction_needed', 'form_completed', 'pending_signed_doc');
