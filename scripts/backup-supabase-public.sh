#!/usr/bin/env bash
# Creates a portable PostgreSQL plain-SQL backup of the KSIT application schema and data.
# Usage: SUPABASE_DB_URL='postgresql://...' ./scripts/backup-supabase-public.sh
#    or: ./scripts/backup-supabase-public.sh 'postgresql://...'

set -Eeuo pipefail

DATABASE_URL="${1:-${SUPABASE_DB_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: provide a PostgreSQL connection URL as the first argument or SUPABASE_DB_URL." >&2
  exit 64
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is required. Install PostgreSQL client tools first." >&2
  exit 69
fi

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$BACKUP_DIR/ksit-public-$timestamp.sql"
checksum_file="$backup_file.sha256"

# Supabase's public schema holds the KSIT application tables. Omitting internal Supabase schemas
# keeps the backup portable for local restore and avoids trying to overwrite managed platform data.
PGSSLMODE="${PGSSLMODE:-require}" pg_dump \
  --dbname="$DATABASE_URL" \
  --schema=public \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file="$backup_file"

if [[ ! -s "$backup_file" ]]; then
  echo "Error: pg_dump completed without producing a usable backup file." >&2
  exit 74
fi

sha256sum "$backup_file" > "$checksum_file"
printf 'Backup created: %s\nChecksum file: %s\n' "$backup_file" "$checksum_file"
