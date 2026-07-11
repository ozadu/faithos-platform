# FaithOS Pilot Deployment Pack

FaithOS v0.9.0 is a controlled pilot release candidate for one church or organization. This pack helps a technical installer deploy FaithOS, configure the first pilot organization, onboard users, run UAT, collect feedback, and prepare a pilot report.

## Pilot objective

Prove that FaithOS can support real document routing, workflow approvals, notifications, reporting, feedback, and recovery procedures with a small group of trained staff before any wider production rollout.

## Primary audiences

- Technical installer/admin
- Church administrator
- Office secretary
- Department heads
- Pilot support owner

## Recommended sequence

1. Complete the installation and environment checklists.
2. Start the Docker stack and verify Web, API, PostgreSQL, Redis, Mailpit, and Swagger.
3. Create the first administrator.
4. Complete organization, department, user, role, permission, workflow, and document type setup.
5. Disable demo seed for the pilot environment.
6. Run backup and restore dry-runs.
7. Execute the pilot UAT script with real users.
8. Review feedback and issue logs daily.
9. Prepare the pilot final report and go/no-go recommendation.

## Pilot boundary

This pack does not turn v0.9.0 into a broad public SaaS release. It is for supervised pilot deployment with known operators, a support owner, backup/restore practice, and an agreed rollback path.
