param(
  [string]$OutputDir = $env:PILOT_BACKUP_DIR
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required to run a pilot backup."
}

if (-not $OutputDir) {
  $OutputDir = Join-Path (Get-Location) "backups"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFolder = Join-Path $OutputDir "faithos-pilot-$timestamp"
New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
$outputFile = Join-Path $backupFolder "database.sql"
$uploadsPath = if ($env:UPLOAD_DIR) { $env:UPLOAD_DIR } elseif ($env:ATTACHMENT_STORAGE_DIR) { $env:ATTACHMENT_STORAGE_DIR } else { "./storage/attachments" }

Write-Host "Creating PostgreSQL pilot backup at $outputFile"
pg_dump $env:DATABASE_URL --file $outputFile
Write-Host "Upload files path to back up separately: $uploadsPath"
Write-Host "Securely back up the environment file separately. Never commit .env files or database dumps."
Write-Host "Docker volumes persist outside containers; document any volume copy/remove command before running it."
Write-Host "Restore note: restore database into a separate environment first, restore uploaded files, run migrations, then verify health and Swagger."
Write-Host "Backup complete. Store this file securely and outside the application host."
