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
];

const partial = [
  'Role permission replacement exists in the backend; this UAT screen lists roles/permissions but does not expose mutation controls.',
  'User and department update APIs exist; UAT pages expose create/delete and visible records, with detailed edit flows left for admin UX hardening.',
  'Attachment download uses authenticated browser fetch on document detail; opening raw download URLs directly still requires an auth header.',
];

const missingBackend = [
  'Approve document',
  'Reject document',
  'Workflow templates',
  'Notification delivery',
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
          controls. The backend APIs exist; the UAT shell exposes at least one
          connected path for each implemented domain.
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
