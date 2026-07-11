param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required to restore a database backup."
}

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "WARNING: This restores into the database configured by DATABASE_URL."
Write-Host "Use only in a controlled pilot restore environment, not against the only live database."
psql $env:DATABASE_URL --file $BackupFile
Write-Host "Restore complete. Run migrations and verify /health, /api/docs, login, documents, and reports."
