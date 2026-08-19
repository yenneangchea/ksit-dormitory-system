# KSIT Google Drive Storage Integration

## Cover

**KSIT Dormitory Application Storage**

Google Drive primary storage with secure Supabase fallback

## Slide 1 — One system, two data responsibilities

Google Drive holds document bytes and generated PDFs. Supabase retains structured application data, lifecycle status, and storage references. The browser never receives a service-account credential.

## Slide 2 — Five-stage applicant journey

The Student completes four official Khmer form sections, uploads reference files, generates a four-page PDF, uploads the signed document, and submits the record for Manager review.

## Slide 3 — Storage architecture

The Student and Manager dashboards call the Express API. The server selects Google Drive only when both Drive environment variables are configured; otherwise it writes to private Supabase Storage. The database stores IDs, metadata, and references—not document bytes.

## Slide 4 — Per-student Drive organization

The root folder is KSIT_Dormitory_Applications_2025_2026. Each applicant receives an academic-year subfolder and a deterministic student-ID plus Khmer-name folder containing five official artifacts.

## Slide 5 — Privacy and access control

Upload and review endpoints enforce Student, Manager, and Admin roles. Drive documents are streamed through authenticated server endpoints, so the browser does not rely on public Drive links. Supabase fallback access remains private and short-lived.

## Slide 6 — Drive-primary with safe fallback

When both Drive configuration variables exist, the adapter creates or reuses the student folder and persists Drive references. When neither exists, it uses private Supabase buckets. A partial configuration produces an explicit server error rather than an unsafe fallback.

## Slide 7 — Database and API changes

The additive migration introduces folder and Drive URL reference fields. The lifecycle controller records provider metadata, exposes document availability, and streams Drive or Supabase documents through one protected API contract.

## Slide 8 — Vercel activation runbook

Enable Google Drive API, create a service account, share the root folder with Editor permission, set two backend secrets, apply the additive migration, redeploy, and run a controlled Student-to-Manager verification.

## Slide 9 — Verification evidence

The credential-free Drive simulation covers five artifacts in one deterministic folder. The suite contains 39 passing backend tests and the Next.js production build succeeds. Real Drive writes activate only after Vercel secrets are set.

## Slide 10 — Operating checklist

Confirm Vercel environment variables, validate the migration, conduct a labeled submission, review documents as Manager, monitor storage usage, and preserve the Supabase fallback until Drive verification is complete.
