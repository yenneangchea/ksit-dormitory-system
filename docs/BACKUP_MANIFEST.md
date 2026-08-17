# KSIT Dormitory Database Backup Manifest

| Field | Value |
|---|---|
| Snapshot format | Plain PostgreSQL SQL (public-schema DDL and data) |
| Created (UTC) | 2026-08-17T03:20:22Z |
| File path | backups/supabase_backup_latest.sql |
| SHA-256 | af8b819080b2c11b2f4fb87a365dd185143e5295f75e8b6bfe125ba013d18499 |
| Size | 64999 bytes |
| Schema indicators | 12 CREATE TABLE statements |
| Data indicators | 12 COPY sections |

> The SQL snapshot is intentionally ignored by Git because it may contain personal data and credentials-adjacent application records. It covers the public schema only; Supabase Auth users, Storage objects, Edge Functions, and managed configuration are outside this dump. Store it in approved encrypted backup storage and verify the checksum before restoration.
