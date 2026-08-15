-- KSIT dormitory five-stage application, document verification, and manager-review lifecycle.
-- This migration is additive and idempotent. It intentionally does not delete, rewrite, or reseed existing records.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM (
      'draft', 'form_completed', 'pending_signed_doc', 'under_review',
      'approved', 'rejected', 'correction_needed', 'assigned', 'submitted'
    );
  ELSE
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'form_completed';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_signed_doc';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'correction_needed';
  END IF;
END $$;

ALTER TABLE academic_profiles
  ADD COLUMN IF NOT EXISTS ethnicity VARCHAR(100) DEFAULT 'ខ្មែរ',
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'កម្ពុជា',
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) DEFAULT 'នៅលីវ',
  ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS spouse_occupation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS siblings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE room_applications
  ADD COLUMN IF NOT EXISTS prefilled_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS prefilled_pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS student_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS national_id_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS family_book_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_application_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS document_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS form_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manager_notes TEXT,
  ADD COLUMN IF NOT EXISTS submission_step INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'room_applications_submission_step_range'
  ) THEN
    ALTER TABLE room_applications
      ADD CONSTRAINT room_applications_submission_step_range
      CHECK (submission_step BETWEEN 1 AND 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_user_year ON room_applications(user_id, academic_year_applied);
CREATE INDEX IF NOT EXISTS idx_applications_submission_step ON room_applications(submission_step);

-- Private buckets: application files are served only through server-issued signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('student-references', 'student-references', false),
  ('signed-applications', 'signed-applications', false),
  ('generated-applications', 'generated-applications', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
