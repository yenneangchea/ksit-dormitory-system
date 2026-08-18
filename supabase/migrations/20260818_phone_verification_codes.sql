-- Secure, server-managed phone OTP storage for Telegram-delivered sign-in codes.
-- Codes are bcrypt hashes: plaintext OTPs are never stored in Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone varchar(32) NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_verification_codes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone varchar(32),
  ADD COLUMN IF NOT EXISTS code_hash text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS phone_verification_codes_phone_created_at_idx
  ON public.phone_verification_codes (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS phone_verification_codes_expires_at_idx
  ON public.phone_verification_codes (expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS phone_verification_codes_one_active_phone_idx
  ON public.phone_verification_codes (phone)
  WHERE consumed_at IS NULL;

ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages phone verification codes" ON public.phone_verification_codes;
CREATE POLICY "Service role manages phone verification codes"
  ON public.phone_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.phone_verification_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.phone_verification_codes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.phone_verification_codes TO service_role;
