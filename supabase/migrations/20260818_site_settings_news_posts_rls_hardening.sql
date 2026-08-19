-- Harden the CMS tables used by the KSIT public homepage and Admin portal.
--
-- Access model:
--   * Public homepage reads continue through the existing server-side
--     /api/public/announcements handler.
--   * Admin CMS reads and writes continue through the existing authenticated,
--     Admin-only Express routes.
--   * Browser roles receive no direct Data API access to these base tables.
--
-- The server's service-role client remains the only database role granted
-- direct table access. This migration intentionally does not apply itself to
-- any environment; apply it only after staging verification and authorization.

BEGIN;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Remove legacy direct-public-read policies. The public API now controls the
-- selected homepage payload and never exposes the system_settings row.
DROP POLICY IF EXISTS "Public read active site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read published news posts" ON public.news_posts;

-- Keep the service role explicit, even though it bypasses RLS in Supabase.
DROP POLICY IF EXISTS "Service role manages site settings" ON public.site_settings;
CREATE POLICY "Service role manages site settings"
  ON public.site_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages news posts" ON public.news_posts;
CREATE POLICY "Service role manages news posts"
  ON public.news_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Revoke the broad default Data API grants that previously allowed direct
-- anonymous and authenticated access. The server is responsible for all reads
-- and writes visible to the frontend.
REVOKE ALL ON TABLE public.site_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.news_posts FROM PUBLIC;
REVOKE ALL ON TABLE public.site_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.news_posts FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_posts TO service_role;

COMMIT;
