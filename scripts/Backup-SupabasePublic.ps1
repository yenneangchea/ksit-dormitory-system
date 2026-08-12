<#
.SYNOPSIS
Creates a timestamped plain-SQL backup of the KSIT public schema and data.

.EXAMPLE
$env:SUPABASE_DB_URL = 'postgresql://postgres:...'
.\scripts\Backup-SupabasePublic.ps1

.EXAMPLE
.\scripts\Backup-SupabasePublic.ps1 -DatabaseUrl 'postgresql://postgres:...' -BackupDirectory 'D:\KSIT-Backups'
#>
[CmdletBinding()]
param(
    [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
    [string]$BackupDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw 'Provide -DatabaseUrl or set SUPABASE_DB_URL. Do not hard-code credentials in this script.'
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    throw 'pg_dump was not found. Install PostgreSQL client tools and add their bin directory to PATH.'
}

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $BackupDirectory "ksit-public-$timestamp.sql"
$checksumFile = "$backupFile.sha256"

& $pgDump.Source --dbname=$DatabaseUrl --schema=public --format=plain --no-owner --no-privileges --file=$backupFile
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -eq 0) {
    throw 'pg_dump failed or did not create a usable backup file.'
}

$hash = Get-FileHash -Algorithm SHA256 -Path $backupFile
"$($hash.Hash.ToLower())  $(Split-Path -Leaf $backupFile)" | Set-Content -Encoding ascii -Path $checksumFile
Write-Host "Backup created: $backupFile"
Write-Host "Checksum file: $checksumFile"
