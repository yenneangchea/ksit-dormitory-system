-- Hybrid storage architecture: Supabase Storage is primary; Google Drive holds administrative archives/reports.
-- This migration is safe to run once through the Supabase migration tool.

ALTER TABLE public.room_applications
  ADD COLUMN IF NOT EXISTS drive_archive_url TEXT;

ALTER TABLE public.utility_bills
  ADD COLUMN IF NOT EXISTS drive_report_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('student-documents', 'student-documents', false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('student-avatars', 'student-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png']),
  ('receipts', 'receipts', false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- These policies support direct Supabase Auth clients that use the same UUID as public.users.id.
-- The current browser uses the authenticated Express upload endpoint; its service-role client bypasses these policies.
CREATE OR REPLACE FUNCTION public.is_storage_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_storage_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_storage_staff() TO authenticated;

DROP POLICY IF EXISTS "students_manage_own_student_documents" ON storage.objects;
CREATE POLICY "students_manage_own_student_documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "staff_read_student_documents" ON storage.objects;
CREATE POLICY "staff_read_student_documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-documents' AND public.is_storage_staff());

DROP POLICY IF EXISTS "students_manage_own_avatars" ON storage.objects;
CREATE POLICY "students_manage_own_avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'student-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "staff_read_student_avatars" ON storage.objects;
CREATE POLICY "staff_read_student_avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-avatars' AND public.is_storage_staff());

DROP POLICY IF EXISTS "students_manage_own_receipts" ON storage.objects;
CREATE POLICY "students_manage_own_receipts"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "staff_read_receipts" ON storage.objects;
CREATE POLICY "staff_read_receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND public.is_storage_staff());
