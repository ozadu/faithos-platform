# Pilot Trial Plan

## Week 0: Setup and admin training

- Objective: prepare the pilot environment and train administrators.
- Activities: verify Docker, migrations, Swagger, Mailpit, seed data, demo
  credentials, setup pack, backup runbook, and admin onboarding.
- Success indicators: admin can log in, configure records, run health checks,
  and explain the staff workflow.
- Risks: missing SMTP, weak secrets, skipped backup drill, or incomplete setup.
- Recommended owner: Pilot Coordinator and Technical Owner.

## Week 1: Internal admin-only testing

- Objective: prove admin configuration and safety flows.
- Activities: organization settings, departments, users, roles, permissions,
  document types, workflow assignments, audit log, readiness pages, and reports.
- Success indicators: admins can operate without Swagger or direct database work.
- Risks: permission gaps, stale sessions, or incomplete document type coverage.
- Recommended owner: Organization Admin.

## Week 2: Department heads route documents

- Objective: validate DocRoute and Workflow Engine with department leaders.
- Activities: create, submit, receive, approve, forward, return, reject,
  archive, and review timelines.
- Success indicators: routed work reaches the right department and history is
  immutable.
- Risks: incomplete workflow assignments or unclear action ownership.
- Recommended owner: Department Heads.

## Week 3: Staff onboarding and wider routing

- Objective: expand usage to selected staff.
- Activities: staff user guide, notifications, My Work, inbox, attachments,
  reporting, and feedback form.
- Success indicators: staff submit feedback and complete realistic routing
  tasks.
- Risks: training gaps, upload permissions, or notification confusion.
- Recommended owner: Pilot Coordinator.

## Week 4: Feedback review and go/no-go decision

- Objective: decide whether FaithOS is ready for the next release stage.
- Activities: triage feedback, close pilot issues, run restore drill, review
  readiness, and document limitations.
- Success indicators: critical issues resolved or accepted and release owner
  signs off.
- Risks: unresolved critical issues or missing backup evidence.
- Recommended owner: Executive Sponsor.
