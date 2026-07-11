# Pilot Success Criteria

## Measurable success criteria

- Users can log in successfully.
- Documents can be routed without paper.
- Attachments upload and download correctly.
- Workflows complete successfully.
- Notifications are visible to the right users.
- Reports give useful management insight.
- Backup/restore process is understood and dry-run verified.
- Admin can onboard users without developer help.
- Users can submit feedback.
- No critical blocker remains unresolved.

## Issue severity

| Severity | Definition                                                    | Example                                                      |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Critical | Blocks pilot usage, data safety, login, routing, or recovery. | Users cannot log in; documents cannot submit; restore fails. |
| High     | Major workflow interruption with workaround possible.         | Approvals work only for admins; CSV export fails.            |
| Medium   | Usability or reporting issue that slows staff.                | Confusing label; missing empty-state guidance.               |
| Low      | Cosmetic or minor documentation issue.                        | Typo, spacing, optional wording improvement.                 |

## Go/no-go toward v1.0.0

Go toward v1.0.0 planning only if:

- All critical issues are resolved.
- High issues have fixes or accepted mitigations.
- Backup and restore dry-runs passed.
- Pilot owner accepts documented limitations.
- Staff can complete core routing and workflow tasks.
- Admin can onboard users and review feedback.

No-go if any critical issue remains open, restore is unproven, security-sensitive configuration is incomplete, or staff cannot perform core document routing.
