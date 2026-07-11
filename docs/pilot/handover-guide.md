# Handover Guide

Sprint 8 provides a pilot deployment control pack, not a production launch.

## What FaithOS does

FaithOS supports identity, document routing, workflow approvals, notifications,
dashboards, reporting, and admin configuration for controlled organization
pilots.

## What has been implemented

- Identity Foundation
- DocRoute Core
- Workflow Engine
- Notifications & Dashboard
- Reporting & Analytics
- Admin Configuration & Pilot Readiness
- Pilot Hardening & Onboarding
- Pilot Deployment & Real-World Trial Pack

## What is not yet implemented

- SMS, WhatsApp, or push delivery
- Production SMTP provider integration
- Automated backup scheduler
- Production object storage
- Public SaaS billing
- Finance, HR, payroll, assets, or inventory modules

## Admin responsibilities

- Maintain users, roles, departments, document types, and workflow assignments.
- Review readiness, system health, audit log, reports, feedback, and issues.
- Run backups and restore drills.

## Staff responsibilities

- Use browser workflows rather than Swagger.
- Route real trial documents carefully.
- Report issues and submit feedback promptly.

## Daily operating routine

- Check system health.
- Review inboxes, workflow queues, and notifications.
- Triage feedback and open pilot issues.

## Weekly review routine

- Review reports, audit log, readiness checklists, backup evidence, unresolved
  issues, and training gaps.

## Backup routine

- Run `pnpm backup:pilot` or the shell script.
- Protect `.env` separately.
- Back up uploaded files.
- Test restore in a separate environment.

## Support and escalation

Record symptom, owner, severity, command output, and fix status at
`/admin/pilot-issues` before escalation.

## Go/no-go criteria

- No unresolved critical pilot issues.
- Restore drill completed.
- Demo credentials rotated or removed.
- Readiness accepted.
- Human release owner approval recorded.

Handover artifacts:

- `/admin/pilot-deployment`
- `/admin/pilot-setup-pack`
- `/admin/demo-credentials`
- `/admin/feedback`
- `/admin/pilot-issues`
- `/admin/backup-runbook`
- `/admin/onboarding-checklist`
- `/uat/report`

Known limitations:

- Mailpit/dev email only.
- No SMS, WhatsApp, or push.
- No automated backup scheduler.
- No production object storage.
- Feedback screenshot support stores URLs only.
