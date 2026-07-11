import { PlannedBadge } from '../../components/planned-badge';

const working = [
  'Login and JWT-backed browser session',
  'Dashboard navigation',
  'Document list, drafts, inbox, sent, archive, and search',
  'Create draft document',
  'Document detail, routing history, and timeline',
  'Submit, forward, return, and receive document actions',
  'Attachment upload, download, and delete',
  'User profile',
  'Organization view/update',
  'Users list/create/delete',
  'Departments list/create/delete',
  'Roles and permissions catalog',
  'Health check, Swagger, and Mailpit links',
  'Workflow template list/create/details',
  'Workflow builder versioning and conditional route fields',
  'Document type workflow assignment',
  'Pending approvals and my task action queues',
  'Workflow approve, reject, return, forward, receive, complete, and cancel APIs',
  'Workflow immutable history timeline',
  'Workflow SLA overdue evaluator',
  'Temporary delegation records',
  'Workflow notification records',
  'Notification Center list, filters, read/read-all, delete, and record links',
  'Mailpit-backed development email delivery for workflow/document events',
  'Operational dashboard widgets and quick actions',
  'Executive dashboard metrics',
  'Department dashboard filtered to the current user department',
  'My Work aggregation for tasks, approvals, returns, overdue items, and completed tasks',
  'Navigation badge counts for Inbox, My Tasks, Notifications, and Pending Approvals',
  'Reporting dashboard summary metrics for documents, workflows, users, departments, overdue work, and activity',
  'Document, workflow, department, user, overdue, turnaround, and activity report pages',
  'Report filters for date range, department, user, status, priority, document type, and workflow where supported',
  'CSV exports for document, workflow, overdue, and activity reports',
  'Reporting links on operational, executive, and department dashboards',
  'Admin dashboard summary with users, departments, roles, document types, workflow assignments, checklist gaps, and recent activity',
  'Organization settings view/update through /admin/organization',
  'Department create, update, deactivate, head assignment, user count, and pending count views',
  'User search, filter, create, update, activate, deactivate, role assignment, and department assignment APIs',
  'Role create, update, activation state, user counts, and permission assignment',
  'Grouped permissions catalog and role-permission matrix',
  'Document type create/update, active flag, defaults, reference prefixes, and workflow assignment',
  'Workflow assignment configuration coverage view for active document types',
  'Safe system settings view/update without exposing secrets',
  'Administrative audit log for Sprint 6 admin actions',
  'Pilot readiness checklist with linked remediation pages',
  'First-run setup wizard with setup status and reviewed-step tracking',
  'Friendly expired-session handling with refresh attempt and login redirect',
  'Logout action that revokes refresh token session and clears browser auth state',
  'Forgot/reset password flow using secure hashed reset tokens and Mailpit/dev email',
  'Admin user temporary password email through Mailpit when configured',
  'CSV user import template, preview validation, duplicate skipping, import, and audit records',
  'Production readiness checklist with safe boolean configuration checks',
  'Backup and restore documentation page',
  'Deployment guide page',
  'Pilot user manual/help page',
  'System health page with safe API, database, Redis, Mailpit, environment, and version status',
  'Sprint 7 navigation and UAT links',
  'Pilot deployment control page with setup, readiness, feedback, and issue summary',
  'Demo credentials handover page for seeded local pilot accounts',
  'Pilot setup pack readiness checklist',
  'Authenticated staff pilot feedback submission form',
  'Admin feedback triage list with reviewed/resolved status updates',
  'Pilot issue tracker with create and status update actions',
  'Admin onboarding checklist with completion tracking',
  'Browser-accessible backup runbook, pilot docs, trial timeline, troubleshooting, and handover guide',
  'Sprint 8 Prisma migration, seed data, and permissions for pilot trial records',
  'Sprint 8 UAT dashboard links',
  'Production readiness section on /uat',
  'First-admin setup endpoint and guarded setup page behavior',
  'Production environment validation for required variables and unsafe demo JWT values',
  'Demo seed and demo credential display controlled by environment flags',
  'Pilot database backup and restore helper scripts',
  'Improved /health response with database and Redis status',
  'v0.9.0 pilot setup checklist with derived readiness and manual acknowledgements',
  'v0.9.0 pilot UAT runner with local browser pass/fail notes',
  'Organization profile readiness indicators for pilot-required fields',
  'User onboarding readiness view for role, department, status, email, and login checks',
  'Role and permission audit view with sensitive permission warnings',
  'Deployment readiness page with safe environment and service checks',
  'Backup readiness page linking dry-run instructions without browser-triggered backup execution',
  'Admin feedback triage filters for category, severity, and expanded status values',
];

const partial = [
  'Role permission replacement exists in the backend; this UAT screen lists roles/permissions but does not expose mutation controls.',
  'User and department update APIs exist; UAT pages expose create/delete and visible records, with detailed edit flows left for admin UX hardening.',
  'Attachment download uses authenticated browser fetch on document detail; opening raw download URLs directly still requires an auth header.',
  'Workflow Builder exposes practical step/version editing but not a drag-and-drop visual canvas.',
  'Email notifications are development SMTP/Mailpit only; production provider delivery is future infrastructure.',
  'Dashboard metrics are operational summaries, not a historical analytics warehouse.',
  'Sprint 5 charts are lightweight in-app summary bars and tables; no advanced BI visualization dependency was introduced.',
  'CSV export is implemented; PDF export remains intentionally out of scope for this sprint.',
  'Sprint 6 admin pages are form-based pilot configuration screens, not a polished enterprise admin console.',
  'Maintenance mode is stored as a safe placeholder setting; enforcement is planned for a later operational hardening sprint.',
  'System settings intentionally exclude JWT, SMTP passwords, database URLs, and other secrets.',
  'Password reset and temporary password email delivery use development SMTP/Mailpit only.',
  'CSV user import reads the file in the browser and sends CSV text to the API; no production bulk-import worker exists yet.',
  'Production readiness checks are boolean/placeholder pilot checks, not a full compliance engine.',
  'System health uses lightweight TCP/database checks and does not include external monitoring integration yet.',
  'Sprint 8 feedback accepts screenshot URLs only; binary screenshot upload is not implemented.',
  'Pilot issue tracker is intentionally lightweight and does not replace a full external support desk.',
  'Backup runbook scripts are operator-triggered helpers; automated backup scheduling is future work.',
  'Demo credential display is limited to seeded local pilot accounts and must be removed or rotated before production.',
  'First-admin setup is intentionally simple and self-disables after an active administrator exists.',
  'Backup and restore scripts remain pilot helpers and should be wrapped by organization-specific disaster recovery procedures before production.',
  'v0.9.0 UAT runner results are stored in local browser state for this sprint rather than a shared database table.',
  'Pilot checklist manual acknowledgements are lightweight system settings, not a compliance evidence repository.',
];

const missingBackend = [
  'SMS, WhatsApp, and push notification delivery',
  'Drag-and-drop workflow rule authoring',
  'Production object storage',
  'Automated backup scheduler',
  'Production email provider integration',
  'OCR and full-text indexing',
];

export default function UatReportPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Lead QA</p>
        <h1>UAT Report</h1>
        <p>
          Current browser-testability status for implemented FaithOS features.
          This report includes Sprint 6 Admin Configuration & Pilot Readiness
          exposure, Sprint 7 pilot hardening, and Sprint 8 pilot deployment
          trial-pack exposure.
        </p>
      </div>
      <section className="panel">
        <h2>Working features</h2>
        <ul>
          {working.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Partially implemented features</h2>
        <ul>
          {partial.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Missing UI only</h2>
        <p>
          Detailed edit forms for users/departments and role-permission mutation
          controls. A visual workflow canvas is also UI-only future polish; the
          underlying workflow template/version/condition APIs are exposed.
        </p>
      </section>
      <section className="panel">
        <h2>Missing backend</h2>
        <ul>
          {missingBackend.map((item) => (
            <li key={item}>
              {item} <PlannedBadge />
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Sprint 5 manual test instructions</h2>
        <ol>
          <li>Log in with the demo administrator account from /uat.</li>
          <li>
            Open /reports and confirm summary cards and bar summaries load.
          </li>
          <li>
            Open every /reports/* page and verify loading, empty/error states,
            and tables.
          </li>
          <li>
            Apply date, status, priority, department, user, and document type
            filters where relevant.
          </li>
          <li>
            Export CSV from document, workflow, overdue, and activity reports.
          </li>
          <li>
            Confirm reporting links are present on /dashboard,
            /dashboard/executive, and /dashboard/department.
          </li>
          <li>
            Open Swagger and confirm all /api/v1/reports endpoints are
            documented.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Sprint 6 manual test instructions</h2>
        <ol>
          <li>Log in with the demo administrator account from /uat.</li>
          <li>Open /admin and confirm summary cards and admin links load.</li>
          <li>
            Open /admin/organization and update a non-secret profile field.
          </li>
          <li>Create and deactivate a department from /admin/departments.</li>
          <li>
            Search/filter users and create a pilot user from /admin/users.
          </li>
          <li>Create a role and assign permissions from /admin/roles.</li>
          <li>Review grouped permissions at /admin/permissions.</li>
          <li>Create a document type and assign a workflow.</li>
          <li>Update safe settings at /admin/system-settings.</li>
          <li>Confirm admin actions appear at /admin/audit-log.</li>
          <li>Open /admin/pilot-readiness and review every checklist item.</li>
          <li>
            Open Swagger and confirm /api/v1/admin endpoints are documented.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Sprint 7 manual test instructions</h2>
        <ol>
          <li>Log in with the demo administrator account from /uat.</li>
          <li>Open /setup and confirm setup status loads.</li>
          <li>
            Update organization setup fields and mark review steps complete.
          </li>
          <li>Open /forgot-password and submit the demo admin email.</li>
          <li>Open Mailpit and copy the reset link or token.</li>
          <li>
            Open /reset-password and confirm valid/invalid token behavior.
          </li>
          <li>
            Use Logout and verify the browser returns to /login with a friendly
            message.
          </li>
          <li>Open /admin/users/import and download the CSV template.</li>
          <li>
            Preview a valid CSV, preview an invalid CSV, then import valid
            users.
          </li>
          <li>
            Confirm duplicate emails are skipped and audit entries are recorded.
          </li>
          <li>Open /admin/production-readiness and review incomplete items.</li>
          <li>Open /admin/backup-restore and /admin/deployment-guide.</li>
          <li>Open /help and confirm staff guidance is readable.</li>
          <li>
            Open /admin/system-health and confirm safe health statuses load.
          </li>
          <li>
            Open Swagger and confirm setup, auth reset, admin import, production
            readiness, and system health endpoints are documented.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Sprint 7 known limitations and dev-only warnings</h2>
        <ul>
          <li>Development email uses Mailpit only.</li>
          <li>Password reset tokens expire after 60 minutes.</li>
          <li>No SMS, WhatsApp, or push notification recovery flow exists.</li>
          <li>
            No destructive demo reset API or production UI button was added.
          </li>
          <li>
            Maintenance mode remains a stored placeholder setting; enforcement
            is future work.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>Sprint 8 manual test instructions</h2>
        <ol>
          <li>Log in with the demo administrator account from /uat.</li>
          <li>
            Open /admin/pilot-deployment and confirm release, readiness, demo
            data, feedback, and issue summary cards load.
          </li>
          <li>
            Open /admin/demo-credentials and confirm seeded demo accounts are
            visible with the production warning.
          </li>
          <li>
            Open /admin/pilot-setup-pack and verify each readiness link is
            clickable.
          </li>
          <li>
            Open /feedback, submit pilot feedback, then verify it appears at
            /admin/feedback.
          </li>
          <li>
            Mark feedback reviewed/resolved and verify the status changes.
          </li>
          <li>
            Open /admin/pilot-issues, create an issue, and move it through In
            Review, Fixed, and Closed.
          </li>
          <li>
            Open /admin/onboarding-checklist and mark at least one manual item
            complete.
          </li>
          <li>
            Open /admin/backup-runbook, /admin/pilot-docs,
            /admin/trial-timeline, /admin/troubleshooting, and
            /admin/handover-guide.
          </li>
          <li>
            Open Swagger and confirm /api/v1/feedback and new /api/v1/admin
            pilot endpoints are documented.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Sprint 8 known limitations and dev-only warnings</h2>
        <ul>
          <li>No production email provider was added.</li>
          <li>No SMS, WhatsApp, or push notification flow was added.</li>
          <li>
            Backup and health scripts are helpers; automated backup scheduling
            is future work.
          </li>
          <li>
            Feedback screenshot support stores a URL only; direct binary
            screenshot upload is future work.
          </li>
          <li>
            Demo credentials are for local pilot/testing only and must be
            rotated or removed before production use.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>Production readiness checklist</h2>
        <ul>
          <li>
            Demo seed disabled in production-like environments with{' '}
            <code>ENABLE_DEMO_SEED=false</code>.
          </li>
          <li>
            Demo credentials hidden with{' '}
            <code>NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS=false</code>.
          </li>
          <li>
            Production validation requires database, Redis, JWT, app URL, and
            SMTP configuration when email is enabled.
          </li>
          <li>
            First admin setup is available only when no active administrator
            exists.
          </li>
          <li>
            Backup/restore scripts and documentation exist for pilot database
            operations.
          </li>
          <li>Pilot feedback submission and admin listing are available.</li>
          <li>
            Health endpoint reports API, database, Redis, status, and timestamp
            without exposing secrets.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>v0.8.1 known pilot limitations</h2>
        <ul>
          <li>
            Feedback remains pilot-level and is not a full customer support
            system.
          </li>
          <li>
            Backup scripts are helpers, not a full automated backup platform.
          </li>
          <li>
            Production email provider selection and external monitoring remain
            deployment responsibilities.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>v0.9.0 release-candidate checklist</h2>
        <ul>
          <li>Open /pilot/checklist and clear all required blockers.</li>
          <li>Complete /pilot/uat flows and record pass/fail notes.</li>
          <li>
            Verify /admin/users/onboarding shows no unassigned pilot users.
          </li>
          <li>Review /admin/permission-audit for sensitive permissions.</li>
          <li>Verify /admin/deployment-readiness exposes no secret values.</li>
          <li>Run backup and restore dry-runs using documented scripts.</li>
          <li>Confirm /admin/feedback filters and status updates work.</li>
        </ul>
      </section>
      <section className="panel">
        <h2>Pilot readiness status</h2>
        <p>
          FaithOS is ready for controlled pilot testing only after all required
          checklist blockers are cleared, UAT has passed, and backup/restore
          dry-runs have been verified by the technical installer.
        </p>
      </section>
      <section className="panel">
        <h2>Required blockers and warnings</h2>
        <ul>
          <li>
            Blocked: missing first admin, organization profile, users, roles,
            departments, backup test, restore test, or UAT completion.
          </li>
          <li>
            Warning: SMTP/Mailpit unreachable, users not logged in, demo account
            risk, or non-admin roles with sensitive permissions.
          </li>
          <li>
            Next action: use /pilot/checklist as the single pilot launch gate.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>v0.9.0 known pilot limitations</h2>
        <ul>
          <li>UAT runner storage is local to the browser.</li>
          <li>
            Backup/restore verification is documentation-backed and
            operator-run.
          </li>
          <li>
            Permission audit highlights obvious risks; it is not a formal
            governance engine.
          </li>
          <li>Feedback remains pilot-level triage, not a full support desk.</li>
        </ul>
      </section>
      <section className="panel">
        <h2>Broken links, runtime errors, API errors</h2>
        <p>
          Manual browser verification should cover every route linked from /uat,
          especially the Sprint 8 pilot deployment, feedback, issue tracker,
          onboarding, and documentation pages. Any broken route, runtime error,
          browser console error, or API error should be recorded here before
          release.
        </p>
      </section>
    </section>
  );
}
