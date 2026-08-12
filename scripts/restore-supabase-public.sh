#!/usr/bin/env bash
# Restores a backup created by backup-supabase-public.sh.
# Usage: TARGET_DB_URL='postgresql://...' ./scripts/restore-supabase-public.sh backups/ksit-public-YYYYMMDD-HHMMSS.sql
# The target database is changed destructively. Use a local database by default and pass --cloud only after review.

set -Eeuo pipefail

backup_file="${1:-}"
target_url="${TARGET_DB_URL:-}"
allow_cloud="${2:-}"

if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Error: provide an existing .sql backup file as the first argument." >&2
  exit 64
fi
if [[ -z "$target_url" ]]; then
  echo "Error: set TARGET_DB_URL for the restore destination." >&2
  exit 64
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required. Install PostgreSQL client tools first." >&2
  exit 69
fi

if [[ -f "$backup_file.sha256" ]]; then
  (cd "$(dirname "$backup_file")" && sha256sum --check "$(basename "$backup_file").sha256")
fi

if [[ "$allow_cloud" != "--cloud" ]]; then
  echo "Restore target: ${target_url%%@*}@…"
  read -r -p "Type RESTORE_LOCAL to replace the target public schema: " confirmation
  [[ "$confirmation" == "RESTORE_LOCAL" ]] || { echo "Restore cancelled."; exit 0; }
else
  echo "WARNING: cloud restore selected. This replaces the target public schema."
  read -r -p "Type RESTORE_CLOUD to continue: " confirmation
  [[ "$confirmation" == "RESTORE_CLOUD" ]] || { echo "Restore cancelled."; exit 0; }
fi

# Plain SQL backups do not include destructive schema cleanup by design. Resetting public first
# prevents table/constraint conflicts and should be used only for a known disposable/local target.
psql "$target_url" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
psql "$target_url" -v ON_ERROR_STOP=1 -f "$backup_file"
printf 'Restore completed from: %s\n' "$backup_file"
