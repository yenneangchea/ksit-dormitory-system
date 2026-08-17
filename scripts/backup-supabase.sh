#!/usr/bin/env bash
# Creates a PostgreSQL public-schema DDL-and-data snapshot for the KSIT Dormitory system.
# Required: SUPABASE_DB_URL must point to a Supabase Session Pooler connection.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to a session-pooler PostgreSQL connection URI.}"

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
backup_dir="${BACKUP_DIR:-$repo_root/backups}"
backup_file="$backup_dir/supabase_backup_latest.sql"
manifest_file="${BACKUP_MANIFEST_FILE:-$repo_root/docs/BACKUP_MANIFEST.md}"

mkdir -p "$backup_dir"
umask 077

pg_dump "$SUPABASE_DB_URL" \
  --format=p \
  --no-owner \
  --no-privileges \
  --schema=public \
  --quote-all-identifiers \
  --file="$backup_file"

create_tables=$(grep -c '^CREATE TABLE' "$backup_file" || true)
copy_sections=$(grep -c '^COPY ' "$backup_file" || true)
checksum=$(sha256sum "$backup_file" | awk '{print $1}')
bytes=$(wc -c < "$backup_file" | tr -d ' ')
created_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

cat > "$manifest_file" <<EOF
# KSIT Dormitory Database Backup Manifest

| Field | Value |
|---|---|
| Snapshot format | Plain PostgreSQL SQL (public-schema DDL and data) |
| Created (UTC) | $created_utc |
| File path | backups/supabase_backup_latest.sql |
| SHA-256 | $checksum |
| Size | $bytes bytes |
| Schema indicators | $create_tables CREATE TABLE statements |
| Data indicators | $copy_sections COPY sections |

> The SQL snapshot is intentionally ignored by Git because it may contain personal data and credentials-adjacent application records. It covers the public schema only; Supabase Auth users, Storage objects, Edge Functions, and managed configuration are outside this dump. Store it in approved encrypted backup storage and verify the checksum before restoration.
EOF

printf 'Backup created: %s\nSHA-256: %s\n' "$backup_file" "$checksum"
