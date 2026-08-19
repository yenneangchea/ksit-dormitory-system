-- KSIT Dormitory Comprehensive RLS Hardening Migration
-- Secures all database tables with Row Level Security while ensuring the Express
-- backend (running via service_role) retains full operational capability.

BEGIN;

-- 1. Enable RLS on all active project tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.utility_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.academic_majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.academic_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- 2. Revoke broad public/anon/authenticated Data API table grants so that direct
-- frontend Supabase queries cannot bypass the Express backend controllers.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 3. Grant full table privileges solely to the server-side service role.
-- The Express backend uses SUPABASE_SERVICE_ROLE_KEY and automatically bypasses RLS,
-- but revoking anon/authenticated grants blocks direct public access.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Create explicit service_role bypass policies for audit completeness
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access buildings" ON public.buildings;
CREATE POLICY "Service role full access buildings" ON public.buildings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access rooms" ON public.rooms;
CREATE POLICY "Service role full access rooms" ON public.rooms FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access room applications" ON public.room_applications;
CREATE POLICY "Service role full access room applications" ON public.room_applications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access room assignments" ON public.room_assignments;
CREATE POLICY "Service role full access room assignments" ON public.room_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access attendance" ON public.attendance_roster;
CREATE POLICY "Service role full access attendance" ON public.attendance_roster FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access leave" ON public.leave_requests;
CREATE POLICY "Service role full access leave" ON public.leave_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access maintenance" ON public.maintenance_tickets;
CREATE POLICY "Service role full access maintenance" ON public.maintenance_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access bills" ON public.utility_bills;
CREATE POLICY "Service role full access bills" ON public.utility_bills FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access majors" ON public.academic_majors;
CREATE POLICY "Service role full access majors" ON public.academic_majors FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access audit" ON public.academic_audit_log;
CREATE POLICY "Service role full access audit" ON public.academic_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access settings" ON public.site_settings;
CREATE POLICY "Service role full access settings" ON public.site_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access news" ON public.news_posts;
CREATE POLICY "Service role full access news" ON public.news_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access phone codes" ON public.phone_verification_codes;
CREATE POLICY "Service role full access phone codes" ON public.phone_verification_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
