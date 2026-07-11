#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to run a pilot backup." >&2
  exit 1
fi

output_dir="${PILOT_BACKUP_DIR:-./backups}"
mkdir -p "$output_dir"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_folder="$output_dir/faithos-pilot-$timestamp"
mkdir -p "$backup_folder"
output_file="$backup_folder/database.sql"
uploads_path="${UPLOAD_DIR:-${ATTACHMENT_STORAGE_DIR:-./storage/attachments}}"

echo "Creating PostgreSQL pilot backup at $output_file"
pg_dump "$DATABASE_URL" --file "$output_file"
echo "Upload files path to back up separately: $uploads_path"
echo "Securely back up the environment file separately. Never commit .env files or database dumps."
echo "Docker volumes persist outside containers; document any volume copy/remove command before running it."
echo "Restore note: restore database into a separate environment first, restore uploaded files, run migrations, then verify health and Swagger."
echo "Backup complete. Store this file securely and outside the application host."
