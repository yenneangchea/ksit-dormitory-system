<#
.SYNOPSIS
Restores a KSIT public-schema backup to a PostgreSQL target after explicit confirmation.

.EXAMPLE
$env:TARGET_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
.\scripts\Restore-SupabasePublic.ps1 -BackupFile .\backups\ksit-public-20260812-120000.sql

.EXAMPLE
.\scripts\Restore-SupabasePublic.ps1 -BackupFile .\backups\ksit-public-20260812-120000.sql -DatabaseUrl $env:SUPABASE_DB_URL -CloudRestore
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$DatabaseUrl = $env:TARGET_DB_URL,
    [switch]$CloudRestore
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $BackupFile)) {
    throw "Backup file was not found: $BackupFile"
}
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw 'Provide -DatabaseUrl or set TARGET_DB_URL.'
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    throw 'psql was not found. Install PostgreSQL client tools and add their bin directory to PATH.'
}

$checksumFile = "$BackupFile.sha256"
if (Test-Path $checksumFile) {
    $expectedHash = ((Get-Content $checksumFile -Raw).Trim() -split '\s+')[0]
    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $BackupFile).Hash.ToLower()
    if ($expectedHash.ToLower() -ne $actualHash) {
        throw 'Backup checksum verification failed. Restore cancelled.'
    }
}

if ($CloudRestore) {
    $confirmation = Read-Host 'WARNING: this replaces the cloud public schema. Type RESTORE_CLOUD to continue'
    if ($confirmation -ne 'RESTORE_CLOUD') { Write-Host 'Restore cancelled.'; return }
} else {
    $confirmation = Read-Host 'This replaces the target local public schema. Type RESTORE_LOCAL to continue'
    if ($confirmation -ne 'RESTORE_LOCAL') { Write-Host 'Restore cancelled.'; return }
}

& $psql.Source $DatabaseUrl -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
if ($LASTEXITCODE -ne 0) { throw 'Unable to prepare the target public schema for restore.' }

& $psql.Source $DatabaseUrl -v ON_ERROR_STOP=1 -f $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'Restore failed.' }

Write-Host "Restore completed from: $BackupFile"
