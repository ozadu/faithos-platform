#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to run a database backup." >&2
  exit 1
fi

output_dir="${PILOT_BACKUP_DIR:-./backups}"
mkdir -p "$output_dir"
timestamp="$(date +%Y%m%d-%H%M%S)"
output_file="$output_dir/faithos-db-$timestamp.sql"

echo "Creating PostgreSQL backup at $output_file"
pg_dump "$DATABASE_URL" --file "$output_file"
echo "Backup complete. Treat this as pilot-level backup, not enterprise disaster recovery."
