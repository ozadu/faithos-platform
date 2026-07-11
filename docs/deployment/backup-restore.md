# Backup and Restore

These scripts are pilot helpers, not a complete enterprise disaster recovery
platform.

Backup:

```bash
pnpm backup:db
# or
./scripts/backup-db.sh
```

Restore into a controlled restore environment:

```powershell
pnpm restore:db -- -BackupFile .\backups\faithos-db-YYYYMMDD-HHMMSS.sql
```

```bash
./scripts/restore-db.sh ./backups/faithos-db-YYYYMMDD-HHMMSS.sql
```

Recommended pilot cadence:

- Nightly database backup.
- Backup before every release, migration, and bulk import.
- Weekly restore drill into a separate environment.
- Record restore evidence in `/admin/pilot-issues`.

Also back up uploaded files and deployment secrets separately.
