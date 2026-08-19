# KSIT Dormitory Management System: Security Architecture, Automated Alerting & Session Management Guide

**Author:** Manus AI  
**Scope:** Production Security Audit, Supabase RLS Hardening, Automated Alerting, and Session Management Best Practices  
**Target Architecture:** Next.js 15 Frontend + Node.js/Express Backend (Vercel) + Supabase PostgreSQL (Staging & Production)

---

## Executive Summary

Following the detection of public table exposure warnings across Supabase project instances, the KSIT Dormitory Management System has been fully hardened. All **16 public tables** across both production (`KSIT-dorm-DB`, `ukdpgzbzrzosbxvsxifc`) and staging (`iegshgtjsnoqbgdioonr`) now enforce **Row-Level Security (RLS)**, with direct Data API table grants revoked for anonymous and authenticated web visitors. 

All application reads and writes are mediated exclusively by the Express backend running with service-role privileges, enforcing strict role-based access control (RBAC) for Admin, Manager, Teacher, and Student portals.

---

## 1. Automated Security Alerting for Supabase RLS

To ensure that any accidental modification, newly created table without RLS, or modified security policy triggers an immediate notification, implement the following alerting mechanisms using available native tools and webhook integrations:

### A. Supabase Database Linter & Security Advisor
Supabase provides built-in database linters that check for security anomalies:
- **Unprotected Tables:** Tables where `rowsecurity` is false or where `anon`/`authenticated` roles retain direct table privileges.
- **Definer Functions:** Functions executing with `SECURITY DEFINER` without a secure `search_path`.

### B. Scheduled Health-Check Function (Daily Audit Trigger)
You can create a scheduled PostgreSQL function in Supabase that logs a security warning or sends a webhook notification if any public table lacks RLS:

```sql
CREATE OR REPLACE FUNCTION public.audit_rls_compliance()
RETURNS TABLE (unsecured_table text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.relname::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### C. Webhook / Telegram Alert Integration
You can pair this audit query with a scheduled cron job (or GitHub Action running daily) that queries your database and sends an immediate alert to your Telegram admin chat if `unsecured_table` returns any rows.

---

## 2. Best Practices for User Authentication Tokens & Session Management

With the hybrid Next.js frontend and Express backend architecture hosted on Vercel, session management adheres to the following secure architecture standards:

### A. Stateless JWT & Cookie Separation
- **HttpOnly Cookies:** Authentication tokens are issued as signed JWTs stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies or managed via secure authorization headers (`Bearer token`), preventing cross-site scripting (XSS) extraction.
- **Short-Lived Access Tokens:** JWT session tokens expire after 24 hours of inactivity, requiring re-authentication or silent token refresh.
- **Bcrypt Password Hashing:** All user passwords are salted and hashed using `bcryptjs` with robust work factors. Plaintext passwords are never stored or logged.

### B. Telegram Mini App & WebApp Security
- **InitData Verification:** Telegram Mini App sessions are never trusted based on client-passed user IDs. The backend validates `window.Telegram.WebApp.initData` cryptographically using HMAC-SHA-256 with the bot token (`TELEGRAM_BOT_TOKEN`) and enforces a strict max-age timestamp window (default 24 hours).
- **Cross-Account Collision Prevention:** Linking a Telegram chat ID to an existing account verifies the active bearer session first and blocks duplicate bindings across different user profiles.

### C. Environment Variable Isolation (Vercel)
- **`SUPABASE_SERVICE_ROLE_KEY`**: Restricted exclusively to Vercel Serverless Backend environment variables (`server/_core/` and Express backend). It is **never** prefixed with `NEXT_PUBLIC_` and never exposed to the browser.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Used solely for public client-side subscriptions where RLS safely restricts rows to the authenticated user.

---

## 3. Security Audit Architecture Summary

| Layer | Component | Security Control | Status |
| --- | --- | --- | --- |
| **Database** | Supabase PostgreSQL (`ukdpgzbzrzosbxvsxifc`) | Row-Level Security (RLS) enabled on all 16 public tables | **Enforced** |
| **Data API** | Supabase PostgREST | Direct `anon` / `authenticated` table grants revoked | **Secured** |
| **Backend** | Node.js / Express (Vercel) | Service role bypass with programmatic RBAC middleware | **Active** |
| **Auth** | Email/Password, Phone OTP, Telegram | Bcrypt hashing + HMAC-SHA-256 InitData verification | **Verified** |
| **Transport** | Vercel Edge & HTTPS | TLS 1.3, Strict-Transport-Security, HttpOnly cookies | **Configured** |

---

## References
- Supabase Security & RLS Documentation: [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Vercel Security Best Practices: [https://vercel.com/docs/security](https://vercel.com/docs/security)
- Telegram WebApp Data Validation: [https://core.telegram.org/bots/webapps#validating-data-received-from-web-apps](https://core.telegram.org/bots/webapps#validating-data-received-from-web-apps)
