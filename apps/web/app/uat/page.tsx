import Link from 'next/link';

import { PlannedBadge } from '../components/planned-badge';
import { apiBaseUrl, demoCredentials } from '../lib/api-client';

const featureLinks = [
  ['Login', '/login', 'Real API login using seeded admin account'],
  ['Dashboard', '/', 'DocRoute overview'],
  ['Document List', '/documents', 'GET /documents'],
  ['Draft Documents', '/drafts', 'GET /drafts'],
  ['Inbox', '/inbox', 'GET /inbox'],
  ['Sent', '/sent', 'GET /sent'],
  ['Archive', '/archive', 'GET /archive'],
  ['Search', '/search', 'GET /documents with query filters'],
  ['Create Document', '/documents/create', 'POST /documents'],
  ['Document Details', '/documents', 'Open any document row'],
  ['Submit Document', '/documents', 'Open a draft and use the action panel'],
  ['Forward Document', '/documents', 'Open a submitted/routed document'],
  ['Return Document', '/documents', 'Open a submitted/routed document'],
  ['Receive Document', '/documents', 'Open an inbox item'],
  ['Routing Timeline', '/documents', 'Open any document detail'],
  ['Attachments Upload', '/documents', 'Open any document detail'],
  ['Attachments Download', '/documents', 'Open a document with attachments'],
  ['Attachments Delete', '/documents', 'Open a document with attachments'],
  ['User Profile', '/profile', 'GET /auth/me'],
  ['Organization', '/organization', 'GET/PATCH /organizations/current'],
  ['Users', '/users', 'GET/POST/PATCH/DELETE /users'],
  ['Departments', '/departments', 'GET/POST/PATCH/DELETE /departments'],
  ['Roles', '/roles', 'GET /roles'],
  ['Permissions', '/permissions', 'GET /permissions'],
  ['Health Check', '/health-check', 'Web and API health probes'],
  ['Swagger Documentation', `${apiBaseUrl}/api/docs`, 'External API docs'],
  ['Mailpit', 'http://localhost:8025', 'External SMTP test UI'],
  ['UAT Report', '/uat/report', 'QA status summary'],
] as const;

export default function UatDashboardPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Lead QA Dashboard</p>
        <h1>FaithOS UAT Dashboard</h1>
        <p>
          One clickable surface for manually testing every implemented FaithOS
          feature in Sprint 1 and Sprint 2.
        </p>
      </div>

      <section className="panel">
        <h2>Demo administrator</h2>
        <dl className="credentials">
          <div>
            <dt>Email</dt>
            <dd>
              <code>{demoCredentials.email}</code>
            </dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>
              <code>{demoCredentials.password}</code>
            </dd>
          </div>
        </dl>
        <Link className="button" href="/login">
          Login with demo account
        </Link>
      </section>

      <section className="panel">
        <h2>Implemented feature links</h2>
        <div className="uat-grid">
          {featureLinks.map(([label, href, description]) => {
            const external = href.startsWith('http');
            return (
              <Link
                className="uat-link"
                href={href}
                key={label}
                target={external ? '_blank' : undefined}
              >
                <strong>{label}</strong>
                <span>{description}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="panel stack">
        <h2>Planned / not implemented yet</h2>
        <p>
          Approval, rejection, workflow templates, notification delivery, OCR,
          full text indexing, and production object storage are not implemented
          in the backend yet.
        </p>
        <PlannedBadge />
      </section>
    </section>
  );
}
