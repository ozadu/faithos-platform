# Backup and Restore Runbook

Run backups before releases, migrations, bulk imports, and nightly during pilot.

PowerShell:

```powershell
pnpm backup:pilot
```

Bash:

```bash
./scripts/backup-pilot.sh
```

Restore process:

1. Restore into a separate database.
2. Run migrations.
3. Start API and web.
4. Verify `/health`, `/api/docs`, login, documents, workflows, and reports.
5. Record restore evidence in `/admin/pilot-issues`.

Do not test restores against the only live pilot database.

Also back up:

- Uploaded files from `UPLOAD_DIR` or `ATTACHMENT_STORAGE_DIR`.
- Environment files in a secure password manager or secret store.
- Docker volume names and host paths, without running destructive volume
  commands casually.

Rollback:

- Use the previous GitHub release tag.
- Restore the matching database backup only after a documented migration plan.
- Verify API, web, Swagger, Mailpit, login, and sample document routing.
