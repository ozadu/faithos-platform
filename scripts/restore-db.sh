#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"
if [[ -z "$backup_file" ]]; then
  echo "Usage: scripts/restore-db.sh <backup-file.sql>" >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to restore a database backup." >&2
  exit 1
fi
if [[ ! -f "$backup_file" ]]; then
  echo "Backup file not found: $backup_file" >&2
  exit 1
fi

echo "WARNING: This restores into the database configured by DATABASE_URL."
echo "Use only in a controlled pilot restore environment, not against the only live database."
psql "$DATABASE_URL" --file "$backup_file"
echo "Restore complete. Run migrations and verify /health, /api/docs, login, documents, and reports."
