'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { apiBaseUrl, apiFetch } from '../lib/api-client';
import { AuthRequired } from './auth-required';

type PilotChecklistItem = {
  actionLink: string;
  complete: boolean;
  description: string;
  id: string;
  manualAcknowledgement: boolean;
  required: boolean;
  status: string;
  title: string;
};

type PilotChecklist = {
  blockers: PilotChecklistItem[];
  complete: boolean;
  items: PilotChecklistItem[];
  requiredCount: number;
};

type UatFlow = {
  expected: string;
  id: string;
  instructions: string;
  title: string;
};

type UatResult = {
  notes: string;
  status: 'FAIL' | 'PASS' | 'PENDING';
};

type UserOnboarding = {
  inactiveUsers: Array<{ user: PilotUser }>;
  readyUsers: number;
  records: Array<{
    checks: Array<{ complete: boolean; label: string; required: boolean }>;
    demoPasswordRisk: boolean;
    ready: boolean;
    user: PilotUser;
    warnings: string[];
  }>;
  usersWithoutDepartment: Array<{ user: PilotUser }>;
  usersWithoutRole: Array<{ user: PilotUser }>;
};

type PilotUser = {
  department?: { name: string } | null;
  email: string;
  firstName?: string;
  id: string;
  lastLoginAt?: string | null;
  lastName?: string;
  role?: { name: string } | null;
  status: string;
};

type PermissionAudit = {
  roles: Array<{
    excessivePermissionsWarning: string;
    id: string;
    missingRecommendedPermissions: string[];
    name: string;
    permissions: Array<{ code: string; displayName: string; id: string }>;
    sensitivePermissions: Array<{
      code: string;
      displayName: string;
      id: string;
    }>;
    usersCount: number;
  }>;
  sensitiveAreas: string[];
};

type DeploymentReadiness = {
  checks: Array<{ label: string; message: string; status: string }>;
  overallStatus: string;
};

type BackupReadiness = {
  backupDocumentationLink: string;
  backupScriptAvailable: boolean;
  lastBackupTestStatus: string;
  lastRestoreTestStatus: string;
  restoreDocumentationLink: string;
  restoreScriptAvailable: boolean;
  warning: string;
};

const manualChecklistItems = new Set([
  'mailSettingsVerified',
  'backupTested',
  'restoreTested',
  'uatCompleted',
]);

const uatFlows: UatFlow[] = [
  [
    'login',
    'Login',
    'Log in with the assigned pilot admin/staff account.',
    'Dashboard opens without session errors.',
  ],
  [
    'first-admin',
    'First admin setup',
    'Open /setup in a fresh install before admins exist.',
    'The first administrator can be created, then setup disables itself.',
  ],
  [
    'organization',
    'Create organization profile',
    'Open /admin/organization and fill missing contact fields.',
    'Readiness indicators show no missing required profile fields.',
  ],
  [
    'departments',
    'Create departments',
    'Create at least the core pilot departments.',
    'Departments appear in routing and admin lists.',
  ],
  [
    'users',
    'Create users',
    'Create or import pilot users and assign department/role.',
    'Users appear ready on /admin/users/onboarding.',
  ],
  [
    'document',
    'Create document',
    'Open /documents/create and save a document.',
    'Document appears in list or drafts.',
  ],
  [
    'attachment',
    'Upload attachment',
    'Open a document detail page and upload a supported file.',
    'Attachment metadata appears and download works.',
  ],
  [
    'submit',
    'Submit document',
    'Submit a draft document.',
    'Document status changes from DRAFT.',
  ],
  [
    'route',
    'Route document',
    'Forward or route the document to another department.',
    'Inbox/sent state and timeline update.',
  ],
  [
    'workflow-start',
    'Start workflow',
    'Start an assigned workflow for a document.',
    'Workflow task is created.',
  ],
  [
    'workflow-approve',
    'Approve workflow',
    'Approve an available workflow task.',
    'Workflow advances to the next step.',
  ],
  [
    'workflow-return',
    'Return workflow',
    'Return a task with a note.',
    'Workflow history records the return.',
  ],
  [
    'workflow-reject',
    'Reject workflow',
    'Reject a test workflow task.',
    'Workflow state updates to rejected.',
  ],
  [
    'workflow-complete',
    'Complete workflow',
    'Approve all remaining workflow steps.',
    'Workflow completes and document timeline records it.',
  ],
  [
    'notifications',
    'View notifications',
    'Open /notifications.',
    'Unread/read notification state is visible.',
  ],
  [
    'dashboard',
    'View dashboard',
    'Open operational dashboards.',
    'Dashboard cards load without runtime errors.',
  ],
  [
    'reports',
    'View reports',
    'Open /reports and report detail pages.',
    'Report tables load with filters.',
  ],
  [
    'csv-export',
    'Export CSV',
    'Use a CSV export endpoint from reports.',
    'CSV file downloads or endpoint returns CSV.',
  ],
  [
    'feedback',
    'Submit feedback',
    'Submit pilot feedback from /feedback.',
    'Admin can see it at /admin/feedback.',
  ],
  [
    'backup',
    'Backup database',
    'Run the backup helper from terminal using docs.',
    'Backup file is produced and recorded.',
  ],
  [
    'restore',
    'Restore database',
    'Restore into a safe test database using docs.',
    'Restored app passes /health and smoke tests.',
  ],
].map(([id, title, instructions, expected]) => ({
  expected: expected ?? '',
  id: id ?? '',
  instructions: instructions ?? '',
  title: title ?? '',
}));

function statusClass(status: string) {
  return status === 'READY' || status === 'COMPLETE' || status === 'PASS'
    ? 'badge good'
    : status === 'WARNING'
      ? 'badge'
      : 'badge danger';
}

function Hero({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="hero">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{body}</span>
    </header>
  );
}

export function PilotChecklistPage() {
  const [checklist, setChecklist] = useState<PilotChecklist | null>(null);
  const [message, setMessage] = useState('Loading pilot checklist...');

  async function load() {
    const response = await apiFetch<PilotChecklist>('/pilot/checklist');
    setChecklist(response.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function acknowledge(id: string, acknowledged: boolean) {
    await apiFetch(`/pilot/checklist/${id}`, {
      body: JSON.stringify({ acknowledged }),
      method: 'PATCH',
    });
    await load();
  }

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="FaithOS v0.9.0"
          title="Pilot Setup Checklist"
          body="Required setup checks for a controlled real-world pilot in one organization."
        />
        <p>{message}</p>
        {checklist ? (
          <section className="cards">
            <Metric label="Required checks" value={checklist.requiredCount} />
            <Metric label="Blockers" value={checklist.blockers.length} />
            <Metric
              label="Overall"
              value={checklist.complete ? 'Ready' : 'Blocked'}
            />
          </section>
        ) : null}
        <section className="panel stack">
          {checklist?.items.map((item) => (
            <article className="card" key={item.id}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <p>
                <span className={statusClass(item.status)}>{item.status}</span>{' '}
                {item.required ? 'Required before pilot' : 'Recommended'}
              </p>
              <div className="actions">
                <Link className="button" href={item.actionLink}>
                  Open action
                </Link>
                {manualChecklistItems.has(item.id) ? (
                  <button
                    type="button"
                    onClick={() =>
                      void acknowledge(item.id, !item.manualAcknowledgement)
                    }
                  >
                    {item.manualAcknowledgement
                      ? 'Clear acknowledgement'
                      : 'Acknowledge'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function PilotUatRunnerPage() {
  const [results, setResults] = useState<Record<string, UatResult>>({});

  useEffect(() => {
    const stored = window.localStorage.getItem('faithos.v090.uat');
    if (stored) setResults(JSON.parse(stored) as Record<string, UatResult>);
  }, []);

  function save(id: string, patch: Partial<UatResult>) {
    const next = {
      ...results,
      [id]: {
        notes: results[id]?.notes ?? '',
        status: results[id]?.status ?? 'PENDING',
        ...patch,
      },
    };
    setResults(next);
    window.localStorage.setItem('faithos.v090.uat', JSON.stringify(next));
  }

  const summary = useMemo(
    () => ({
      failed: uatFlows.filter((flow) => results[flow.id]?.status === 'FAIL')
        .length,
      passed: uatFlows.filter((flow) => results[flow.id]?.status === 'PASS')
        .length,
      pending: uatFlows.filter(
        (flow) =>
          results[flow.id]?.status !== 'PASS' &&
          results[flow.id]?.status !== 'FAIL',
      ).length,
    }),
    [results],
  );

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Manual UAT"
          title="Pilot UAT Runner"
          body="A browser-based checklist for pilot test flows. Results are stored in local browser state for this sprint."
        />
        <section className="cards">
          <Metric label="Passed" value={summary.passed} />
          <Metric label="Failed" value={summary.failed} />
          <Metric label="Pending" value={summary.pending} />
        </section>
        <section className="panel stack">
          {uatFlows.map((flow) => (
            <article className="card" key={flow.id}>
              <h2>{flow.title}</h2>
              <p>
                <strong>Instructions:</strong> {flow.instructions}
              </p>
              <p>
                <strong>Expected:</strong> {flow.expected}
              </p>
              <div className="actions">
                {(['PASS', 'FAIL', 'PENDING'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => save(flow.id, { status })}
                  >
                    Mark {status.toLowerCase()}
                  </button>
                ))}
              </div>
              <label>
                Notes
                <textarea
                  value={results[flow.id]?.notes ?? ''}
                  onChange={(event) =>
                    save(flow.id, { notes: event.target.value })
                  }
                />
              </label>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function UserOnboardingReadinessPage() {
  const [data, setData] = useState<UserOnboarding | null>(null);
  const [message, setMessage] = useState(
    'Loading user onboarding readiness...',
  );

  useEffect(() => {
    void apiFetch<UserOnboarding>('/admin/user-onboarding')
      .then((response) => {
        setData(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Onboarding"
          title="User Onboarding Readiness"
          body="Find users missing roles, departments, activation, valid email, login activity, or demo-account cleanup."
        />
        <p>{message}</p>
        {data ? (
          <section className="cards">
            <Metric label="Ready users" value={data.readyUsers} />
            <Metric label="Without role" value={data.usersWithoutRole.length} />
            <Metric
              label="Without department"
              value={data.usersWithoutDepartment.length}
            />
            <Metric label="Inactive" value={data.inactiveUsers.length} />
          </section>
        ) : null}
        <section className="panel stack">
          {data?.records.map((record) => (
            <article className="card" key={record.user.id}>
              <h2>
                {record.user.firstName} {record.user.lastName}
              </h2>
              <p>{record.user.email}</p>
              <p>
                {record.user.department?.name ?? 'No department'} ·{' '}
                {record.user.role?.name ?? 'No role'} · {record.user.status}
              </p>
              <p>
                <span
                  className={statusClass(record.ready ? 'READY' : 'BLOCKED')}
                >
                  {record.ready ? 'READY' : 'NEEDS ATTENTION'}
                </span>
              </p>
              <ul>
                {record.checks.map((check) => (
                  <li key={check.label}>
                    {check.complete ? '✓' : '□'} {check.label}
                    {check.required ? '' : ' (recommended)'}
                  </li>
                ))}
                {record.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function PermissionAuditPage() {
  const [data, setData] = useState<PermissionAudit | null>(null);
  const [message, setMessage] = useState('Loading permission audit...');

  useEffect(() => {
    void apiFetch<PermissionAudit>('/admin/permission-audit')
      .then((response) => {
        setData(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Security Review"
          title="Role and Permission Audit"
          body="Readiness view for role permissions, sensitive access, user counts, and obvious gaps."
        />
        <p>{message}</p>
        <section className="panel stack">
          {data?.roles.map((role) => (
            <article className="card" key={role.id}>
              <h2>{role.name}</h2>
              <p>{role.usersCount} user(s) assigned.</p>
              {role.excessivePermissionsWarning ? (
                <p>
                  <span className="badge danger">
                    {role.excessivePermissionsWarning}
                  </span>
                </p>
              ) : null}
              {role.missingRecommendedPermissions.length > 0 ? (
                <p>
                  Missing recommended permissions:{' '}
                  {role.missingRecommendedPermissions.join(', ')}
                </p>
              ) : null}
              <p>
                Sensitive permissions:{' '}
                {role.sensitivePermissions.length || 'None'}
              </p>
              <details>
                <summary>{role.permissions.length} permission(s)</summary>
                <ul>
                  {role.permissions.map((permission) => (
                    <li key={permission.id}>{permission.code}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function BackupReadinessPage() {
  const [data, setData] = useState<BackupReadiness | null>(null);
  const [message, setMessage] = useState('Loading backup readiness...');

  useEffect(() => {
    void apiFetch<BackupReadiness>('/admin/backup-readiness')
      .then((response) => {
        setData(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Recovery"
          title="Backup and Restore Readiness"
          body="Documentation-backed dry-run verification. Backups are not executed from the browser."
        />
        <p>{message}</p>
        {data ? (
          <>
            <section className="cards">
              <Metric
                label="Backup script"
                value={data.backupScriptAvailable ? 'Available' : 'Missing'}
              />
              <Metric
                label="Restore script"
                value={data.restoreScriptAvailable ? 'Available' : 'Missing'}
              />
              <Metric label="Backup test" value={data.lastBackupTestStatus} />
              <Metric label="Restore test" value={data.lastRestoreTestStatus} />
            </section>
            <section className="panel stack">
              <p>{data.warning}</p>
              <div className="actions">
                <Link className="button" href={data.backupDocumentationLink}>
                  Backup documentation
                </Link>
                <Link className="button" href={data.restoreDocumentationLink}>
                  Restore documentation
                </Link>
                <Link className="button" href="/pilot/checklist">
                  Acknowledge dry-run checks
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AuthRequired>
  );
}

export function DeploymentReadinessPage() {
  const [data, setData] = useState<DeploymentReadiness | null>(null);
  const [message, setMessage] = useState('Loading deployment readiness...');

  useEffect(() => {
    void apiFetch<DeploymentReadiness>('/admin/deployment-readiness')
      .then((response) => {
        setData(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Deployment Verification"
          title="Deployment Readiness"
          body="Safe deployment checks for environment, services, first admin, Swagger, UAT, and secret safety without exposing secret values."
        />
        <p>{message}</p>
        {data ? (
          <>
            <section className="cards">
              <Metric label="Overall status" value={data.overallStatus} />
              <Metric
                label="Blocked"
                value={
                  data.checks.filter((check) => check.status === 'BLOCKED')
                    .length
                }
              />
              <Metric
                label="Warnings"
                value={
                  data.checks.filter((check) => check.status === 'WARNING')
                    .length
                }
              />
            </section>
            <section className="panel stack">
              {data.checks.map((check) => (
                <article className="card" key={check.label}>
                  <h2>{check.label}</h2>
                  <p>{check.message}</p>
                  <span className={statusClass(check.status)}>
                    {check.status}
                  </span>
                </article>
              ))}
              <div className="actions">
                <Link
                  className="button"
                  href={`${apiBaseUrl}/api/docs`}
                  target="_blank"
                >
                  Swagger
                </Link>
                <Link className="button" href="/uat">
                  UAT Dashboard
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AuthRequired>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="card metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
