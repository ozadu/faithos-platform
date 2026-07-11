param(
  [string]$OutputDir = $env:PILOT_BACKUP_DIR
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required to run a database backup."
}

if (-not $OutputDir) {
  $OutputDir = Join-Path (Get-Location) "backups"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $OutputDir "faithos-db-$timestamp.sql"

Write-Host "Creating PostgreSQL backup at $outputFile"
pg_dump $env:DATABASE_URL --file $outputFile
Write-Host "Backup complete. Treat this as pilot-level backup, not enterprise disaster recovery."
