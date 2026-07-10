import Link from 'next/link';

import { PlannedBadge } from '../components/planned-badge';
import { apiBaseUrl, demoCredentials } from '../lib/api-client';

const featureLinks = [
  ['Login', '/login', 'Real API login using seeded admin account'],
  ['Dashboard', '/dashboard', 'Sprint 4 operational workspace'],
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

const workflowLinks = [
  ['Workflow Templates', '/workflow-templates', 'CRUD for reusable templates'],
  ['Workflow Builder', '/workflow-builder', 'Create versioned step chains'],
  ['Workflow Details', '/workflow-templates', 'Open a template details page'],
  [
    'Workflow Assignment',
    '/workflow-assignment',
    'Map document types to workflows',
  ],
  ['Pending Approvals', '/pending-approvals', 'Approval work queue'],
  ['My Tasks', '/my-tasks', 'Receive/approve/reject/return/forward/cancel'],
  ['Workflow History', '/workflow-history', 'Immutable audit timeline'],
  [
    'Workflow Notifications',
    '/workflow-notifications',
    'Database notification records',
  ],
  ['Delegation', '/workflow-delegations', 'Temporary task delegation'],
  ['SLA Engine', '/workflow-sla', 'Mark overdue tasks and escalate'],
] as const;

const sprint4Links = [
  ['Operational Dashboard', '/dashboard', 'Pending work and status overview'],
  ['Executive Dashboard', '/dashboard/executive', 'Leadership metrics'],
  ['Department Dashboard', '/dashboard/department', 'Current department load'],
  ['Notification Center', '/notifications', 'Read/delete/filter notifications'],
  ['My Work', '/my-work', 'Tasks, approvals, returns, overdue items'],
  ['Pending Approvals', '/pending-approvals', 'Approval queue'],
  ['Workflow Notifications', '/workflow-notifications', 'Legacy records view'],
  ['Mailpit', 'http://localhost:8025', 'Verify dev SMTP emails'],
] as const;

const sprint5Links = [
  ['Reports Dashboard', '/reports', 'Management reporting overview'],
  ['Document Reports', '/reports/documents', 'Document filters and CSV export'],
  ['Workflow Reports', '/reports/workflows', 'Workflow SLA and duration table'],
  [
    'Department Reports',
    '/reports/departments',
    'Department workload analytics',
  ],
  ['User Activity Reports', '/reports/users', 'User productivity summaries'],
  ['Overdue Reports', '/reports/overdue', 'Overdue tasks and CSV export'],
  ['Turnaround Reports', '/reports/turnaround', 'Processing duration analysis'],
  [
    'Activity Reports',
    '/reports/activity',
    'Timeline and audit activity export',
  ],
  ['Executive Dashboard', '/dashboard/executive', 'Reporting links added'],
  ['Department Dashboard', '/dashboard/department', 'Reporting links added'],
  ['Swagger Documentation', `${apiBaseUrl}/api/docs`, 'Report endpoint docs'],
] as const;

const sprint6Links = [
  ['Admin Dashboard', '/admin', 'Admin summary and configuration links'],
  [
    'Organization Settings',
    '/admin/organization',
    'GET/PATCH /admin/organization',
  ],
  ['Departments', '/admin/departments', 'Department create/update/deactivate'],
  ['Users', '/admin/users', 'User search/filter/create/activate/deactivate'],
  ['Roles', '/admin/roles', 'Role create/update/permission assignment'],
  ['Permissions', '/admin/permissions', 'Grouped permissions and matrix'],
  [
    'Document Types',
    '/admin/document-types',
    'Document type defaults and workflow assignment',
  ],
  [
    'Workflow Assignments',
    '/admin/workflow-assignments',
    'Workflow coverage by document type',
  ],
  ['System Settings', '/admin/system-settings', 'Safe pilot settings'],
  ['Audit Log', '/admin/audit-log', 'Administrative audit entries'],
  ['Pilot Readiness', '/admin/pilot-readiness', 'Pilot launch checklist'],
  ['Swagger Documentation', `${apiBaseUrl}/api/docs`, 'Admin endpoint docs'],
] as const;

export default function UatDashboardPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Lead QA Dashboard</p>
        <h1>FaithOS UAT Dashboard</h1>
        <p>
          One clickable surface for manually testing every implemented FaithOS
          feature through Sprint 6.
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

      <section className="panel">
        <h2>Workflow Engine</h2>
        <div className="uat-grid">
          {workflowLinks.map(([label, href, description]) => (
            <Link className="uat-link" href={href} key={label}>
              <strong>{label}</strong>
              <span>{description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Sprint 4 Notifications & Dashboard</h2>
        <div className="uat-grid">
          {sprint4Links.map(([label, href, description]) => {
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

      <section className="panel">
        <h2>Sprint 5 Reporting & Analytics</h2>
        <div className="uat-grid">
          {sprint5Links.map(([label, href, description]) => {
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

      <section className="panel">
        <h2>Sprint 6 Admin Configuration & Pilot Readiness</h2>
        <div className="uat-grid">
          {sprint6Links.map(([label, href, description]) => {
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
          SMS/WhatsApp/push delivery, OCR, full text indexing, production object
          storage, and advanced visual rule authoring are planned for future
          sprints.
        </p>
        <PlannedBadge />
      </section>
    </section>
  );
}
