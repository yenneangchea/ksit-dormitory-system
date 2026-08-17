-- The public academic-major catalog is served only through the application API.
-- Enable RLS to prevent direct PostgREST access using an anon or user session.
-- The backend uses the Supabase service-role key, which retains server-side access.
ALTER TABLE public.academic_majors ENABLE ROW LEVEL SECURITY;
