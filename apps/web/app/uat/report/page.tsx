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
];

const partial = [
  'Role permission replacement exists in the backend; this UAT screen lists roles/permissions but does not expose mutation controls.',
  'User and department update APIs exist; UAT pages expose create/delete and visible records, with detailed edit flows left for admin UX hardening.',
  'Attachment download uses authenticated browser fetch on document detail; opening raw download URLs directly still requires an auth header.',
  'Workflow Builder exposes practical step/version editing but not a drag-and-drop visual canvas.',
  'Email notifications are development SMTP/Mailpit only; production provider delivery is future infrastructure.',
  'Dashboard metrics are operational summaries, not a historical analytics warehouse.',
];

const missingBackend = [
  'SMS, WhatsApp, and push notification delivery',
  'Drag-and-drop workflow rule authoring',
  'Production object storage',
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
          This report includes Sprint 4 Notifications & Dashboard exposure.
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
        <h2>Broken links, runtime errors, API errors</h2>
        <p>
          Manual browser verification completed against the Docker stack. No
          broken local UAT routes, runtime errors, browser console errors, or
          API error markers were found.
        </p>
      </section>
    </section>
  );
}
