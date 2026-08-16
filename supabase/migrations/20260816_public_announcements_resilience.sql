-- Public announcements resilience: additive, idempotent schema, safe defaults, and read-only public access.
-- This migration preserves the key/value CMS model used by the existing backend while also
-- exposing the requested ticker/deadline and visibility columns for direct public reads.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  ticker_text TEXT,
  ticker_link TEXT,
  deadline_title TEXT,
  deadline_date DATE,
  deadline_time TIME WITHOUT TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ticker_text TEXT,
  ADD COLUMN IF NOT EXISTS ticker_link TEXT,
  ADD COLUMN IF NOT EXISTS deadline_title TEXT,
  ADD COLUMN IF NOT EXISTS deadline_date DATE,
  ADD COLUMN IF NOT EXISTS deadline_time TIME WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  external_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE public.news_posts
SET visibility = CASE WHEN is_visible THEN 'public' ELSE 'private' END
WHERE visibility IS DISTINCT FROM CASE WHEN is_visible THEN 'public' ELSE 'private' END;

CREATE INDEX IF NOT EXISTS idx_news_posts_publication
  ON public.news_posts (visibility, is_visible, published_at DESC);

INSERT INTO public.site_settings (
  setting_key,
  setting_value,
  ticker_text,
  ticker_link,
  is_active,
  updated_at
)
VALUES (
  'top_ticker',
  '{"text":"👉 ដំណឹងអាហារូបករណ៍ ២០០កន្លែង ឆ្នាំសិក្សា២០២៥-២០២៦","link":"https://ksit.edu.kh/category/scholarship/"}'::jsonb,
  '👉 ដំណឹងអាហារូបករណ៍ ២០០កន្លែង ឆ្នាំសិក្សា២០២៥-២០២៦',
  'https://ksit.edu.kh/category/scholarship/',
  TRUE,
  CURRENT_TIMESTAMP
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.site_settings (
  setting_key,
  setting_value,
  deadline_title,
  deadline_date,
  deadline_time,
  is_active,
  updated_at
)
VALUES (
  'registration_deadline',
  '{"title":"📢 សេចក្តីជូនដំណឹងសំខាន់៖ ការទទួលពាក្យសុំស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត ឆ្នាំសិក្សា ២០២៦-២០២៧ នឹងត្រូវផុតកំណត់នៅថ្ងៃទី ៣១ ខែសីហា ឆ្នាំ២០២៦ វេលាម៉ោង ១៧:០០ ជាកំហិត!","deadline_at":"2026-08-31T17:00:00+07:00","action_link":"/login"}'::jsonb,
  '📢 សេចក្តីជូនដំណឹងសំខាន់៖ ការទទួលពាក្យសុំស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត ឆ្នាំសិក្សា ២០២៦-២០២៧ នឹងត្រូវផុតកំណត់នៅថ្ងៃទី ៣១ ខែសីហា ឆ្នាំ២០២៦ វេលាម៉ោង ១៧:០០ ជាកំហិត!',
  DATE '2026-08-31',
  TIME '17:00:00',
  TRUE,
  CURRENT_TIMESTAMP
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active site settings" ON public.site_settings;
CREATE POLICY "Public read active site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read published news posts" ON public.news_posts;
CREATE POLICY "Public read published news posts"
  ON public.news_posts
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

GRANT SELECT ON public.site_settings, public.news_posts TO anon, authenticated;
