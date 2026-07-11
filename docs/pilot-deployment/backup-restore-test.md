# Backup and Restore Test

Backup and restore verification is required before pilot go-live. Do not trigger backups from the browser.

## Backup dry-run

1. Confirm the stack is running.
2. Run the approved backup script for the host operating system.
3. Confirm a backup file is created.
4. Record file name, location, date, and operator.
5. Store the backup securely according to the pilot organization’s policy.

## Restore dry-run

1. Use a safe non-live restore target.
2. Restore the backup into the safe target.
3. Start the restored stack.
4. Verify API health, Web health, database connection, Redis connection, and Mailpit/SMTP status.
5. Log in and confirm sample documents/users are present.

## Evidence

| Evidence          | Value       |
| ----------------- | ----------- |
| Backup file name  |             |
| Backup date/time  |             |
| Backup operator   |             |
| Restore target    |             |
| Restore date/time |             |
| Restore operator  |             |
| Result            | Pass / Fail |
| Notes             |             |

Mark backup and restore complete in `/pilot/checklist` only after the dry-runs pass.
