# Go-Live Checklist

Before controlled pilot go-live:

- `/pilot/checklist` has no required blockers.
- `/pilot/uat` flows are passed or explicitly accepted with notes.
- Organization profile includes name, slug, email, phone, address, country, and
  timezone.
- Every active user has a role, department, valid email, and active status.
- Demo seed is disabled in production-like pilot environments.
- Demo credentials are hidden or removed.
- `/admin/permission-audit` has no unexpected sensitive access.
- `/admin/deployment-readiness` is Ready or accepted with documented warnings.
- Backup and restore dry-runs are verified outside the browser.
- Staff know how to submit feedback.
- A rollback/support owner is assigned for the first pilot week.
