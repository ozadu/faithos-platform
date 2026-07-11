'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import {
  apiBaseUrl,
  apiFetch,
  demoCredentials,
  demoCredentialsEnabled,
  exportCsv,
  type AdminOrganization,
} from '../lib/api-client';
import { AuthRequired } from './auth-required';

type ChecklistItem = {
  complete: boolean;
  explanation: string;
  href: string;
  label: string;
};

type SetupStatus = {
  departmentsConfigured: boolean;
  documentTypesConfigured: boolean;
  organizationConfigured: boolean;
  pilotReadinessReviewed: boolean;
  setupComplete: boolean;
  systemSettingsReviewed: boolean;
  usersConfigured: boolean;
  workflowAssignmentsConfigured: boolean;
};

type FirstAdminStatus = {
  available: boolean;
  reason: string;
};

type UserImportPreview = {
  errors: Array<{ message: string; rowNumber: number }>;
  rows: Array<Record<string, unknown>>;
  summary: { duplicates: number; invalid: number; valid: number };
};

type UserImportResult = {
  created: Array<{
    email: string;
    temporaryPassword: string;
    userId: string;
  }>;
  skipped: Array<{ email: string; reason: string }>;
};

type SystemHealth = Record<
  string,
  | string
  | unknown[]
  | { healthy?: boolean; message?: string }
  | Record<string, unknown>
>;

const setupSteps: Array<[keyof SetupStatus, string, string, string]> = [
  [
    'organizationConfigured',
    'Organization profile',
    'Confirm the organization name, email, address, phone, and timezone.',
    '/admin/organization',
  ],
  [
    'departmentsConfigured',
    'Departments',
    'Create the departments that will send and receive routed documents.',
    '/admin/departments',
  ],
  [
    'usersConfigured',
    'Admin user confirmation',
    'Confirm at least one active administrator or pilot user exists.',
    '/admin/users',
  ],
  [
    'documentTypesConfigured',
    'Document types',
    'Configure Memo, Purchase Request, Leave Request, and other pilot document types.',
    '/admin/document-types',
  ],
  [
    'workflowAssignmentsConfigured',
    'Workflow assignments',
    'Assign workflows to active document types before pilot testing.',
    '/admin/workflow-assignments',
  ],
  [
    'systemSettingsReviewed',
    'System settings review',
    'Review safe pilot settings such as branding, attachment limits, and email flags.',
    '/admin/system-settings',
  ],
  [
    'pilotReadinessReviewed',
    'Pilot readiness checklist',
    'Review the Sprint 6 pilot checklist before handoff.',
    '/admin/pilot-readiness',
  ],
];

export function SetupWizardPage() {
  const [firstAdminStatus, setFirstAdminStatus] =
    useState<FirstAdminStatus | null>(null);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [organization, setOrganization] = useState<AdminOrganization | null>(
    null,
  );
  const [message, setMessage] = useState('Loading setup status...');

  async function load() {
    const [statusResponse, organizationResponse] = await Promise.all([
      apiFetch<SetupStatus>('/setup/status'),
      apiFetch<AdminOrganization>('/admin/organization'),
    ]);
    setStatus(statusResponse.data);
    setOrganization(organizationResponse.data);
    setMessage(
      statusResponse.data.setupComplete
        ? 'Setup is complete for pilot use.'
        : 'Continue the remaining setup steps below.',
    );
  }

  useEffect(() => {
    void apiFetch<FirstAdminStatus>('/setup/first-admin/status')
      .then((response) => {
        setFirstAdminStatus(response.data);
        if (!response.data.available) {
          return load();
        }
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  if (!firstAdminStatus) return <p>Checking first-admin setup status...</p>;

  if (firstAdminStatus?.available) {
    return <FirstAdminSetupPage reason={firstAdminStatus.reason} />;
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiFetch('/setup/organization', {
      body: JSON.stringify(Object.fromEntries(form.entries())),
      method: 'PATCH',
    });
    await completeStep('organization');
  }

  async function completeStep(step: string) {
    const response = await apiFetch<SetupStatus>('/setup/complete-step', {
      body: JSON.stringify({ step }),
      method: 'POST',
    });
    setStatus(response.data);
    setMessage(`${step} step marked as reviewed.`);
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Sprint 7</p>
          <h1>First-Run Setup Wizard</h1>
          <p>
            A guided path for a new organization administrator to finish the
            minimum pilot setup without needing Swagger or database access.
          </p>
        </div>
        <p>{message}</p>
        {status ? (
          <section className="cards">
            <Metric
              label="Setup Complete"
              value={status.setupComplete ? 'Yes' : 'No'}
            />
            <Metric
              label="Configured Steps"
              value={String(
                setupSteps.filter(([key]) => Boolean(status[key])).length,
              )}
            />
            <Metric label="Total Steps" value={String(setupSteps.length)} />
          </section>
        ) : null}
        {organization ? (
          <form className="panel form-grid" onSubmit={saveOrganization}>
            <h2 className="full">Organization profile</h2>
            {[
              ['name', 'Organization name'],
              ['address', 'Address'],
              ['phone', 'Phone'],
              ['website', 'Website'],
              ['timezone', 'Timezone'],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  defaultValue={String(
                    organization[name as keyof AdminOrganization] ?? '',
                  )}
                  name={name}
                />
              </label>
            ))}
            <div className="full actions">
              <button type="submit">Save profile and continue</button>
            </div>
          </form>
        ) : null}
        <section className="panel">
          <h2>Setup checklist</h2>
          <div className="uat-grid">
            {setupSteps.map(([key, label, description, href]) => (
              <div className="card" key={key}>
                <span className={status?.[key] ? 'badge good' : 'badge'}>
                  {status?.[key] ? 'Complete' : 'Needs review'}
                </span>
                <h3>{label}</h3>
                <p>{description}</p>
                <div className="actions">
                  <Link className="button secondary" href={href}>
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      completeStep(
                        key === 'systemSettingsReviewed'
                          ? 'systemSettings'
                          : key === 'pilotReadinessReviewed'
                            ? 'pilotReadiness'
                            : key === 'usersConfigured'
                              ? 'adminUser'
                              : key.replace('Configured', ''),
                      )
                    }
                  >
                    Mark reviewed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AuthRequired>
  );
}

function FirstAdminSetupPage({ reason }: { reason: string }) {
  const [message, setMessage] = useState(reason);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/setup/first-admin', {
        body: JSON.stringify(Object.fromEntries(form.entries())),
        method: 'POST',
      });
      setMessage(
        'First administrator created. You can now log in with the account you created.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Setup failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">First-Time Setup</p>
        <h1>Create the first administrator</h1>
        <p>
          This setup path is available only while no active administrator
          exists. It disables itself after the first admin account is created.
        </p>
      </div>
      <p>{message}</p>
      <form className="panel form-grid" onSubmit={submit}>
        <label>
          Organization name
          <input name="organizationName" required />
        </label>
        <label>
          Organization email
          <input name="organizationEmail" type="email" />
        </label>
        <label>
          First name
          <input name="firstName" required />
        </label>
        <label>
          Last name
          <input name="lastName" required />
        </label>
        <label>
          Admin email
          <input name="email" required type="email" />
        </label>
        <label>
          Password
          <input minLength={12} name="password" required type="password" />
        </label>
        <p className="full">
          Password must be at least 12 characters and include uppercase,
          lowercase, number, and symbol characters.
        </p>
        <div className="full actions">
          <button disabled={busy} type="submit">
            {busy ? 'Creating admin...' : 'Create first administrator'}
          </button>
          <Link className="button secondary" href="/login">
            Go to login
          </Link>
        </div>
      </form>
    </section>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(
    demoCredentialsEnabled ? demoCredentials.email : '',
  );
  const [message, setMessage] = useState(
    'Enter your email. If an active account exists, Mailpit will receive reset instructions.',
  );
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/auth/forgot-password', {
        body: JSON.stringify({ email }),
        method: 'POST',
      });
      setMessage(
        'If an active account exists, reset instructions were sent to Mailpit.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Account Recovery</p>
        <h1>Forgot Password</h1>
        <p>
          Development email uses Mailpit only. This page does not reveal whether
          an email address exists.
        </p>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label className="full">
          Email
          <input
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <div className="full actions">
          <button disabled={busy} type="submit">
            {busy ? 'Sending...' : 'Send reset email'}
          </button>
          <Link className="button secondary" href="http://localhost:8025">
            Open Mailpit
          </Link>
        </div>
        <p className="full">{message}</p>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(
    'Paste the reset token from Mailpit, or open the reset link from the email.',
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/auth/reset-password', {
        body: JSON.stringify({ password, token }),
        method: 'POST',
      });
      setMessage('Password reset successful. You can log in now.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Account Recovery</p>
        <h1>Reset Password</h1>
        <p>Use the Mailpit reset token before it expires.</p>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label className="full">
          Reset token
          <textarea
            onChange={(event) => setToken(event.target.value)}
            rows={3}
            value={token}
          />
        </label>
        <label className="full">
          New password
          <input
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <div className="full actions">
          <button disabled={busy} type="submit">
            {busy ? 'Resetting...' : 'Reset password'}
          </button>
          <Link className="button secondary" href="/login">
            Back to login
          </Link>
        </div>
        <p className="full">{message}</p>
      </form>
    </section>
  );
}

export function UserImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UserImportPreview | null>(null);
  const [result, setResult] = useState<UserImportResult | null>(null);
  const [message, setMessage] = useState(
    'Upload a CSV to preview pilot users before import.',
  );

  async function csvPayload() {
    if (!file) throw new Error('Choose a CSV file first.');
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Only .csv files are supported.');
    }
    if (file.size > 1024 * 1024) {
      throw new Error('CSV file must be 1 MB or smaller.');
    }
    return {
      csvText: await file.text(),
      fileName: file.name,
      sizeBytes: file.size,
    };
  }

  async function previewImport() {
    try {
      const response = await apiFetch<UserImportPreview>(
        '/admin/users/import-preview',
        {
          body: JSON.stringify(await csvPayload()),
          method: 'POST',
        },
      );
      setPreview(response.data);
      setResult(null);
      setMessage('Preview generated. Fix invalid rows before importing.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preview failed.');
    }
  }

  async function importUsers() {
    try {
      const response = await apiFetch<UserImportResult>('/admin/users/import', {
        body: JSON.stringify(await csvPayload()),
        method: 'POST',
      });
      setResult(response.data);
      setMessage('Import completed. Temporary passwords are shown once below.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Pilot Onboarding</p>
          <h1>CSV User Import</h1>
          <p>
            Import pilot users with department and role matching. Development
            email uses Mailpit only.
          </p>
        </div>
        <section className="panel stack">
          <div className="actions">
            <input
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <button type="button" onClick={previewImport}>
              Preview import
            </button>
            <button
              disabled={!preview || preview.summary.invalid > 0}
              type="button"
              onClick={importUsers}
            >
              Import valid users
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() =>
                exportCsv(
                  '/admin/users/import-template.csv',
                  'faithos-user-import-template.csv',
                )
              }
            >
              Download template
            </button>
          </div>
          <p>{message}</p>
        </section>
        {preview ? (
          <section className="panel">
            <h2>Preview</h2>
            <p>
              Valid: {preview.summary.valid} · Duplicates:{' '}
              {preview.summary.duplicates} · Invalid: {preview.summary.invalid}
            </p>
            {preview.errors.length > 0 ? (
              <ul className="error">
                {preview.errors.map((error) => (
                  <li key={`${error.rowNumber}-${error.message}`}>
                    Row {error.rowNumber}: {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <pre>{JSON.stringify(preview.rows, null, 2)}</pre>
          </section>
        ) : null}
        {result ? (
          <section className="panel">
            <h2>Created users</h2>
            <p>
              Copy temporary passwords now. They are returned for pilot
              onboarding and also sent through Mailpit when configured.
            </p>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </section>
    </AuthRequired>
  );
}

export function ProductionReadinessPage() {
  return (
    <ReadinessPage
      endpoint="/admin/production-readiness"
      eyebrow="Sprint 7"
      title="Production Readiness"
      description="Safe boolean checks for production handoff. Secret values are never displayed."
    />
  );
}

export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [message, setMessage] = useState('Loading system health...');

  useEffect(() => {
    void apiFetch<SystemHealth>('/admin/system-health')
      .then((response) => {
        setHealth(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Operations</p>
          <h1>System Health</h1>
          <p>
            Safe operational status for web, API, database, Redis, Mailpit,
            environment, and version. No secrets are shown.
          </p>
        </div>
        <p>{message}</p>
        {health ? (
          <section className="panel">
            <pre>{JSON.stringify(health, null, 2)}</pre>
          </section>
        ) : null}
      </section>
    </AuthRequired>
  );
}

function ReadinessPage({
  description,
  endpoint,
  eyebrow,
  title,
}: {
  description: string;
  endpoint: string;
  eyebrow: string;
  title: string;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState('Loading checklist...');

  useEffect(() => {
    void apiFetch<{ complete: boolean; items: ChecklistItem[] }>(endpoint)
      .then((response) => {
        setItems(response.data.items);
        setComplete(response.data.complete);
        setMessage(
          response.data.complete
            ? 'Checklist complete.'
            : 'Review incomplete items.',
        );
      })
      .catch((error: Error) => setMessage(error.message));
  }, [endpoint]);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <p>{message}</p>
        <Metric label="Overall status" value={complete ? 'Ready' : 'Review'} />
        <section className="panel">
          <div className="uat-grid">
            {items.map((item) => (
              <Link className="uat-link" href={item.href} key={item.label}>
                <strong>{item.label}</strong>
                <span className={item.complete ? 'badge good' : 'badge'}>
                  {item.complete ? 'Complete' : 'Needs review'}
                </span>
                <span>{item.explanation}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </AuthRequired>
  );
}

export function BackupRestorePage() {
  return (
    <DocumentationPage
      eyebrow="Pilot Operations"
      title="Backup & Restore Guide"
      sections={[
        [
          'PostgreSQL backup',
          'Use pg_dump against the production database before releases, configuration changes, and weekly during pilot. Store encrypted backups away from the Docker host.',
        ],
        [
          'PostgreSQL restore',
          'Restore into a new database first, run migrations, smoke-test API health, then cut over. Never test restore commands against the only live database.',
        ],
        [
          'Uploaded files backup',
          'Back up the local upload directory or Docker volume alongside the database so attachment metadata and files remain aligned.',
        ],
        [
          'Environment file backup',
          'Back up .env securely. It may contain secrets; never commit it to Git.',
        ],
        [
          'Release rollback',
          'Use GitHub release tags and Docker images/builds from the last known-good release. Roll back code and database only with a documented migration plan.',
        ],
        [
          'Docker volume warning',
          'Docker volumes persist outside containers. Removing volumes can destroy pilot data; document every destructive command before running it.',
        ],
        [
          'Recommended pilot frequency',
          'Nightly database backup, weekly restore drill, and immediate backup before every release or bulk import.',
        ],
      ]}
    />
  );
}

export function DeploymentGuidePage() {
  return (
    <DocumentationPage
      eyebrow="Pilot Operations"
      title="Deployment Guide"
      sections={[
        [
          'Docker requirements',
          'Install Docker Desktop or Docker Engine with Compose v2.',
        ],
        [
          'Environment variables',
          'Configure DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_HOST, SMTP_PORT, WEB_URL, and NEXT_PUBLIC_API_URL.',
        ],
        [
          'Database setup',
          'Start PostgreSQL, run migrations, then seed demo/pilot data when appropriate.',
        ],
        [
          'Mailpit warning',
          'Mailpit is for development SMTP testing only. Replace it before production.',
        ],
        [
          'Run migrations',
          'Use pnpm db:migrate:deploy in deployed environments.',
        ],
        [
          'Run seed',
          'Use pnpm db:seed or pnpm db:seed:demo for demo/pilot data refresh.',
        ],
        ['Start stack', 'Use docker compose up --build -d.'],
        [
          'Check health',
          'Open http://localhost:3001/health and /admin/system-health.',
        ],
        ['Swagger URL', `API docs: ${apiBaseUrl}/api/docs`],
        ['Web URL', 'Local web: http://localhost:3000'],
        ['Mailpit URL', 'Local Mailpit: http://localhost:8025'],
        [
          'Troubleshooting',
          'If API is unhealthy, check JWT secret length, DATABASE_URL, Redis URL, migrations, and Docker logs.',
        ],
      ]}
    />
  );
}

export function UserManualPage() {
  return (
    <DocumentationPage
      eyebrow="FaithOS Help"
      title="Pilot User Manual"
      sections={[
        [
          'Logging in',
          'Use the account provided by your administrator. If your session expires, log in again from /login.',
        ],
        [
          'Creating a document',
          'Open Create Document, fill in title, subject, body, category, priority, and save as draft.',
        ],
        [
          'Submitting a document',
          'Open a draft document and use Submit to start routing or workflow review.',
        ],
        [
          'Checking inbox',
          'Inbox shows routed documents received by your department. Unread items are highlighted.',
        ],
        [
          'Receiving a task',
          'Open My Tasks or Pending Approvals, receive the task, then take the next action.',
        ],
        [
          'Forwarding a document',
          'Use Forward when the next department should review or act on the document.',
        ],
        [
          'Returning a document',
          'Use Return when a document needs correction or clarification.',
        ],
        [
          'Approving workflow tasks',
          'Use Pending Approvals or My Tasks to approve, reject, return, forward, complete, or cancel where allowed.',
        ],
        [
          'Uploading attachments',
          'Open a document detail page and use the attachment upload panel.',
        ],
        [
          'Checking notifications',
          'Open Notifications to read, mark read, or delete database notification records.',
        ],
        [
          'Viewing reports',
          'Open Reports for management summaries and CSV exports if you have permission.',
        ],
        [
          'Admin basics',
          'Administrators use /admin for organization, departments, users, roles, document types, workflow assignments, settings, audit, and readiness.',
        ],
      ]}
    />
  );
}

function DocumentationPage({
  eyebrow,
  sections,
  title,
}: {
  eyebrow: string;
  sections: Array<[string, string]>;
  title: string;
}) {
  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>
            Internal pilot guidance for administrators and staff. This is
            documentation only; no destructive operations are exposed here.
          </p>
        </div>
        <section className="panel stack">
          {sections.map(([heading, body]) => (
            <article key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p>{label}</p>
      <span>{value}</span>
    </div>
  );
}
