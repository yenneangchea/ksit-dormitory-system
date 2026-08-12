# Local Supabase Backup and Recovery Guide

This guide creates a **portable, timestamped SQL backup** of the KSIT application database, restores it to a local Supabase Docker stack for offline work, and documents a deliberate cloud recovery procedure. The supplied scripts back up the `public` schema, which contains the KSIT users, profiles, buildings, rooms, assignments, bills, attendance, and maintenance data.

> **Important:** A database backup contains personal and operational data. Keep the `backups/` directory outside public sync folders, encrypt it when practical, and never commit generated `.sql` files or connection URLs to Git.

## What the included scripts protect

| Included artifact | Purpose |
| --- | --- |
| `scripts/backup-supabase-public.sh` | Bash backup for macOS, Linux, WSL, or Git Bash. |
| `scripts/Backup-SupabasePublic.ps1` | PowerShell backup for Windows. |
| `scripts/restore-supabase-public.sh` | Confirmed restore for a local target or a deliberate cloud public-schema recovery. |
| `scripts/Restore-SupabasePublic.ps1` | Confirmed PowerShell restore for a local target or a deliberate cloud public-schema recovery. |
| `backups/ksit-public-YYYYMMDD-HHMMSS.sql` | Timestamped, plain-SQL dump containing both `public` schema objects and data. |
| `backups/*.sha256` | SHA-256 integrity check for the matching SQL dump. |

The scripts use `pg_dump --schema=public --format=plain`, then strip ownership and platform-specific privileges. That makes the backup practical for the KSIT application tables and easy to restore locally. It does **not** export Supabase Auth users, Storage objects, Edge Functions, Vault secrets, or managed Supabase configuration. If those services are added later, follow Supabase’s full logical migration workflow described under [Complete platform migration](#complete-platform-migration).

## One-time prerequisites on the Windows computer

Install the following components before creating a backup. Supabase’s local stack requires a Docker-compatible container runtime, and Supabase recommends Docker Desktop for Windows. [1]

| Component | Required for | Installation guidance |
| --- | --- | --- |
| PostgreSQL client tools | `pg_dump` and `psql` | Install PostgreSQL for Windows, then add its `bin` directory to `PATH`. |
| Docker Desktop | Local Supabase Docker stack | Install and start [Docker Desktop](https://docs.docker.com/desktop/). |
| Node.js 20+ | Running `npx supabase` | Install the current LTS release. |
| Supabase CLI | Local stack commands | Use `npm install --save-dev supabase`, then run it with `npx supabase`. [1] |

Open **PowerShell** in the repository root after installation. Confirm the dependencies:

```powershell
pg_dump --version
psql --version
docker version
npx supabase --version
```

## Create a portable cloud backup

Use the **Session pooler** connection string from the Supabase Dashboard **Connect** panel whenever possible. Supabase documents the session pooler as the default option; direct database connections may require IPv6 support or an IPv4 add-on. [2]

Set the database URL for the current PowerShell session. Do not save the connection URL in a script or commit it.

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@YOUR_POOLER_HOST:5432/postgres'
```

Run the Windows backup script:

```powershell
.\scripts\Backup-SupabasePublic.ps1
```

The script writes a pair of files under `backups/`, for example:

```text
backups\ksit-public-20260812-143000.sql
backups\ksit-public-20260812-143000.sql.sha256
```

For WSL, macOS, Linux, or Git Bash, use the Bash script instead:

```bash
export SUPABASE_DB_URL='postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@YOUR_POOLER_HOST:5432/postgres'
chmod +x scripts/backup-supabase-public.sh scripts/restore-supabase-public.sh
./scripts/backup-supabase-public.sh
```

> Run a backup before importing new building or personnel data, after large changes, and on a regular schedule. Copy verified backups to an encrypted external drive or another protected location.

## Start Supabase locally with Docker for offline work

The first local startup requires internet access to download the CLI and Docker images. Once those images are present, the Docker stack can be started while offline. The official local-development workflow is `npx supabase init`, followed by `npx supabase start`; local Studio is available at `http://localhost:54323`, and the default local PostgreSQL database listens on port `54322`. [1]

From the repository root:

```powershell
npm install --save-dev supabase
npx supabase init
npx supabase start
npx supabase status
```

If `supabase/config.toml` already exists, the initialization command can be skipped. The status output provides the local database URL. By default it is:

```text
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Open local Studio at `http://localhost:54323` to inspect data. Keep the local stack private to the computer; Supabase advises against exposing local development services publicly. [1]

## Restore a backup locally

Set the local restore target and execute the PowerShell restore script. The script verifies the SHA-256 file when present, requires a typed confirmation, replaces the **local** `public` schema, then imports the SQL backup.

```powershell
$env:TARGET_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
.\scripts\Restore-SupabasePublic.ps1 -BackupFile .\backups\ksit-public-20260812-143000.sql
```

When prompted, type `RESTORE_LOCAL`. Then open `http://localhost:54323` and inspect the `public` schema. The sample data can be removed locally by restoring a clean backup or by resetting the local database.

The equivalent Bash command is:

```bash
export TARGET_DB_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
./scripts/restore-supabase-public.sh backups/ksit-public-20260812-143000.sql
```

## Work against the local database

For offline frontend/backend work, use the local values displayed by `npx supabase status`. Create local-only environment files; do not overwrite the cloud configuration.

```env
# backend/.env.local-backup (example only; keep ignored)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=LOCAL_SERVICE_ROLE_KEY_FROM_SUPABASE_STATUS
```

Because the current KSIT backend reads `backend/.env`, either temporarily swap a locally ignored environment file into place or extend the startup command to load your local file. Keep cloud and local environment files separate so a test run cannot accidentally write demo data into the hosted project.

## Restore the public-schema backup to the cloud

> **Destructive action:** The included restore scripts drop and recreate the target `public` schema. Do not restore directly over a live cloud project without first creating a fresh backup and verifying it locally. Prefer restoring to a new Supabase project or a branch first.

1. Create a **new cloud backup** of the current project using the backup script.
2. Restore the selected recovery SQL file to the local Supabase stack and verify rooms, people, bills, and relationships in local Studio.
3. Obtain a **session pooler** connection URL for the intended cloud destination from Supabase Dashboard **Connect**. [2]
4. Set the target only for the current shell session:

```powershell
$env:TARGET_DB_URL = 'postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@YOUR_POOLER_HOST:5432/postgres'
```

5. Run the guarded cloud restore:

```powershell
.\scripts\Restore-SupabasePublic.ps1 -BackupFile .\backups\ksit-public-20260812-143000.sql -CloudRestore
```

6. Type `RESTORE_CLOUD` only after verifying the target project and backup filename. Recheck the restored data in the Supabase dashboard and run the KSIT application smoke tests.

For Bash environments:

```bash
export TARGET_DB_URL='postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@YOUR_POOLER_HOST:5432/postgres'
./scripts/restore-supabase-public.sh backups/ksit-public-20260812-143000.sql --cloud
```

## Complete platform migration

The single-file scripts are intentionally focused on the KSIT `public` schema. If the project later relies on Supabase Auth data, Storage objects, custom roles, Edge Functions, or changes in `auth` and `storage`, use the official multi-file logical migration process. Supabase documents separate dumps for roles, schema, and data, plus additional handling for storage and Auth-related changes. [2]

```powershell
npx supabase db dump --db-url $env:SUPABASE_DB_URL -f roles.sql --role-only
npx supabase db dump --db-url $env:SUPABASE_DB_URL -f schema.sql
npx supabase db dump --db-url $env:SUPABASE_DB_URL -f data.sql --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
```

To restore those full logical dumps to a **new** project, follow Supabase’s documented order: roles, schema, then data, using a single transaction and `ON_ERROR_STOP`. [2] Do not substitute that workflow for the simpler `public`-schema recovery scripts without first testing in a local or new cloud project.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `pg_dump` or `psql` is not recognized | Install PostgreSQL client tools and restart PowerShell so `PATH` is refreshed. |
| Direct Supabase database host cannot connect | Use the Session pooler URL from **Connect**; it avoids many IPv6/direct-connect restrictions. [2] |
| `npx supabase start` fails | Ensure Docker Desktop is running and virtualization/WSL 2 is enabled. Run `docker version` before retrying. |
| Restore checksum fails | Do not restore. Retrieve another copy of the SQL backup and checksum. |
| Local Studio is unavailable | Run `npx supabase status`, then use the displayed Studio URL and check `docker ps` for local Supabase containers. |

## References

[1] [Supabase Docs — Local Development & CLI](https://supabase.com/docs/guides/local-development)

[2] [Supabase Docs — Backup and Restore Using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

[3] [Supabase Docs — Restoring a Downloaded Backup Locally](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup)
