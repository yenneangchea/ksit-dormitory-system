-- Track every administrator change to the configurable academic-major catalog.
CREATE TABLE IF NOT EXISTS public.academic_major_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  major_id uuid REFERENCES public.academic_majors(id) ON DELETE SET NULL,
  admin_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('create', 'update', 'activate', 'deactivate', 'delete', 'bulk_import')),
  source text NOT NULL DEFAULT 'admin_ui' CHECK (source IN ('admin_ui', 'bulk_import', 'system')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_major_audit_logs_major_idx
  ON public.academic_major_audit_logs (major_id, created_at DESC);

CREATE INDEX IF NOT EXISTS academic_major_audit_logs_admin_idx
  ON public.academic_major_audit_logs (admin_user_id, created_at DESC);

ALTER TABLE public.academic_major_audit_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.academic_major_audit_logs IS 'Administrator audit trail for academic-major catalog changes.';
COMMENT ON COLUMN public.academic_major_audit_logs.before_data IS 'Sanitized academic-major snapshot before the change.';
COMMENT ON COLUMN public.academic_major_audit_logs.after_data IS 'Sanitized academic-major snapshot after the change.';

-- Access is intentionally server-side only; the API uses the Supabase service role.
REVOKE ALL ON TABLE public.academic_major_audit_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.academic_major_audit_logs TO service_role;

-- Keep the migration idempotent for staging and production replays.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'academic_major_audit_logs_action_check'
      AND conrelid = 'public.academic_major_audit_logs'::regclass
  ) THEN
    ALTER TABLE public.academic_major_audit_logs
      ADD CONSTRAINT academic_major_audit_logs_action_check
      CHECK (action IN ('create', 'update', 'activate', 'deactivate', 'delete', 'bulk_import'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'academic_major_audit_logs_source_check'
      AND conrelid = 'public.academic_major_audit_logs'::regclass
  ) THEN
    ALTER TABLE public.academic_major_audit_logs
      ADD CONSTRAINT academic_major_audit_logs_source_check
      CHECK (source IN ('admin_ui', 'bulk_import', 'system'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Note: CHECK constraints above are defined inline for new installs; the DO blocks
-- are retained so an existing table can be upgraded safely if this migration is replayed.
