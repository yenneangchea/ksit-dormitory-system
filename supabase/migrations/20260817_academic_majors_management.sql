-- Dynamic KSIT Academic Programs & Majors Management
-- Additive and idempotent: this migration preserves existing accounts, profiles,
-- applications, rooms, and allocations while introducing the configurable catalog.

CREATE TABLE IF NOT EXISTS public.academic_majors (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  academic_level VARCHAR(160) NOT NULL,
  name_khmer VARCHAR(255) NOT NULL,
  name_english VARCHAR(255) NOT NULL,
  available_year_levels INTEGER[] NOT NULL DEFAULT ARRAY[1]::INTEGER[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT academic_majors_level_name_khmer_key UNIQUE (academic_level, name_khmer),
  CONSTRAINT academic_majors_year_levels_not_empty CHECK (cardinality(available_year_levels) > 0),
  CONSTRAINT academic_majors_year_levels_range CHECK (available_year_levels <@ ARRAY[1, 2, 3, 4]::INTEGER[])
);

CREATE INDEX IF NOT EXISTS idx_academic_majors_level_active
  ON public.academic_majors (academic_level, is_active, name_khmer);

ALTER TABLE public.academic_profiles
  ADD COLUMN IF NOT EXISTS academic_level VARCHAR(160),
  ADD COLUMN IF NOT EXISTS academic_major_id UUID REFERENCES public.academic_majors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_academic_profiles_level_major_year
  ON public.academic_profiles (academic_level, academic_major_id, academic_year);

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS assigned_academic_level VARCHAR(160),
  ADD COLUMN IF NOT EXISTS assigned_academic_major_id UUID REFERENCES public.academic_majors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_level_major_year
  ON public.rooms (gender, assigned_academic_level, assigned_academic_major_id, assigned_year);

-- Student accounts may be created by an Administrator or verified Telegram registration
-- before the student completes the official four-part application. The application
-- lifecycle continues to validate these fields before PDF generation/submission.
ALTER TABLE public.academic_profiles
  ALTER COLUMN student_id_card DROP NOT NULL,
  ALTER COLUMN major DROP NOT NULL,
  ALTER COLUMN academic_year DROP NOT NULL,
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN place_of_birth DROP NOT NULL,
  ALTER COLUMN current_address DROP NOT NULL,
  ALTER COLUMN father_name DROP NOT NULL,
  ALTER COLUMN mother_name DROP NOT NULL,
  ALTER COLUMN guarantor_name DROP NOT NULL,
  ALTER COLUMN guarantor_relation DROP NOT NULL,
  ALTER COLUMN guarantor_phone DROP NOT NULL;

INSERT INTO public.academic_majors (academic_level, name_khmer, name_english, available_year_levels, is_active)
VALUES
  ('ផ្នែកអប់រំបច្ចេកទេស (៩+៣)', 'បសុវប្បកម្ម', 'Animal Husbandry', ARRAY[1, 2, 3], TRUE),
  ('ផ្នែកអប់រំបច្ចេកទេស (៩+៣)', 'បច្ចេកវិទ្យាមេកាត្រូនិក', 'Mechatronics Technology', ARRAY[1, 2, 3], TRUE),
  ('កម្រិតបរិញ្ញាបត្ររង', 'វិទ្យាសាស្ត្រដំណាំ', 'Plant Science / Agronomy', ARRAY[1, 2], TRUE),
  ('កម្រិតបរិញ្ញាបត្ររង', 'វិទ្យាសាស្ត្រសត្វ', 'Animal Science / Livestock', ARRAY[1, 2], TRUE),
  ('កម្រិតបរិញ្ញាបត្ររង', 'បច្ចេកវិទ្យាអាហារ', 'Food Technology', ARRAY[1, 2], TRUE),
  ('កម្រិតបរិញ្ញាបត្ររង', 'បច្ចេកវិទ្យាកុំព្យូទ័រ', 'Computer Technology', ARRAY[1, 2], TRUE),
  ('កម្រិតបរិញ្ញាបត្ររង', 'បច្ចេកវិទ្យាអគ្គិសនី', 'Electrical Technology', ARRAY[1, 2], TRUE),
  ('កម្រិតបរិញ្ញាបត្រ', 'វិទ្យាសាស្ត្រដំណាំ', 'Plant Science / Agronomy', ARRAY[1, 2, 3, 4], TRUE),
  ('កម្រិតបរិញ្ញាបត្រ', 'វិទ្យាសាស្ត្រសត្វ', 'Animal Science / Livestock', ARRAY[1, 2, 3, 4], TRUE),
  ('កម្រិតបរិញ្ញាបត្រ', 'បច្ចេកវិទ្យាអាហារ', 'Food Technology', ARRAY[1, 2, 3, 4], TRUE),
  ('កម្រិតបរិញ្ញាបត្រ', 'បច្ចេកវិទ្យាកុំព្យូទ័រ', 'Computer Technology', ARRAY[1, 2, 3, 4], TRUE),
  ('កម្រិតបរិញ្ញាបត្រ', 'បច្ចេកវិទ្យាអគ្គិសនី', 'Electrical Technology', ARRAY[1, 2, 3, 4], TRUE)
ON CONFLICT (academic_level, name_khmer)
DO UPDATE SET
  name_english = EXCLUDED.name_english,
  available_year_levels = EXCLUDED.available_year_levels,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;
