'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { apiFetch } from '../lib/api-client';
import { AuthRequired } from './auth-required';

type PilotDeployment = {
  backupGuidanceAvailable: boolean;
  currentRelease: string;
  demoDataPresent: boolean;
  environmentName: string;
  feedbackFormAvailable: boolean;
  feedbackItems: number;
  handoverGuideAvailable: boolean;
  issueTrackerAvailable: boolean;
  openIssues: number;
  pilotReadinessStatus: string;
  productionReadinessStatus: string;
  setupComplete: boolean;
};

type DemoCredential = {
  department: string;
  email: string;
  lastLoginAt?: string | null;
  loginStatus: string;
  name: string;
  password: string;
  role: string;
  scenario: string;
};

type ChecklistItem = {
  complete: boolean;
  description?: string;
  explanation?: string;
  href: string;
  key?: string;
  label: string;
  owner?: string;
  status?: string;
};

type FeedbackRecord = {
  adminNote?: string | null;
  affectedArea: string;
  createdAt: string;
  email: string;
  id: string;
  message: string;
  name: string;
  priority: string;
  roleOrDepartment: string;
  status: string;
  type: string;
};

type PilotIssue = {
  assignedOwner?: string | null;
  createdAt: string;
  description: string;
  id: string;
  relatedArea?: string | null;
  severity: string;
  source: string;
  status: string;
  title: string;
};

const feedbackTypes = [
  'Bug',
  'Confusion',
  'Feature request',
  'Process improvement',
  'Training need',
  'Other',
];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const issueSources = ['Manual', 'Feedback', 'UAT', 'Admin observation'];
const issueSeverities = ['Low', 'Medium', 'High', 'Critical'];
const issueStatuses = ['Open', 'In Review', 'Planned', 'Fixed', 'Closed'];

export function PilotDeploymentPage() {
  const [summary, setSummary] = useState<PilotDeployment | null>(null);
  const [message, setMessage] = useState('Loading pilot deployment summary...');

  useEffect(() => {
    void apiFetch<PilotDeployment>('/admin/pilot-deployment')
      .then((response) => {
        setSummary(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Sprint 8"
          title="Pilot Deployment Control"
          body="One-page status for the pilot trial pack, demo data, feedback loop, issue tracker, backup guidance, and handover guide."
        />
        <p>{message}</p>
        {summary ? (
          <>
            <div className="cards">
              <Metric label="Release" value={summary.currentRelease} />
              <Metric label="Environment" value={summary.environmentName} />
              <Metric
                label="Setup"
                value={summary.setupComplete ? 'Complete' : 'Review'}
              />
              <Metric
                label="Pilot readiness"
                value={summary.pilotReadinessStatus}
              />
              <Metric
                label="Production readiness"
                value={summary.productionReadinessStatus}
              />
              <Metric label="Feedback items" value={summary.feedbackItems} />
              <Metric label="Open issues" value={summary.openIssues} />
              <Metric
                label="Demo data"
                value={summary.demoDataPresent ? 'Present' : 'Missing'}
              />
            </div>
            <section className="panel">
              <h2>Trial pack links</h2>
              <div className="uat-grid">
                <Link className="uat-link" href="/admin/pilot-setup-pack">
                  Pilot setup pack
                </Link>
                <Link className="uat-link" href="/admin/demo-credentials">
                  Demo credentials
                </Link>
                <Link className="uat-link" href="/feedback">
                  Staff feedback form
                </Link>
                <Link className="uat-link" href="/admin/pilot-issues">
                  Pilot issue tracker
                </Link>
                <Link className="uat-link" href="/admin/backup-runbook">
                  Backup runbook
                </Link>
                <Link className="uat-link" href="/admin/handover-guide">
                  Handover guide
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AuthRequired>
  );
}

export function DemoCredentialsPage() {
  const [accounts, setAccounts] = useState<DemoCredential[]>([]);
  const [warning, setWarning] = useState('');
  const [message, setMessage] = useState('Loading demo credentials...');

  useEffect(() => {
    void apiFetch<{ accounts: DemoCredential[]; warning: string }>(
      '/admin/demo-credentials',
    )
      .then((response) => {
        setAccounts(response.data.accounts);
        setWarning(response.data.warning);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Handover"
          title="Demo Credentials"
          body="Safe demo-account handover page for internal pilot testing. Remove or rotate these before production."
        />
        <p>{message}</p>
        {warning ? <p className="badge">{warning}</p> : null}
        <section className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Password / note</th>
                <th>Role</th>
                <th>Department</th>
                <th>Scenario</th>
                <th>Login</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.email}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>{account.password}</td>
                  <td>{account.role}</td>
                  <td>{account.department}</td>
                  <td>{account.scenario}</td>
                  <td>{account.loginStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </AuthRequired>
  );
}

export function PilotSetupPackPage() {
  return (
    <ChecklistPage
      endpoint="/admin/pilot-setup-pack"
      eyebrow="Pilot Setup"
      title="Pilot Setup Pack"
      body="Everything an administrator should verify before the real-world trial begins."
    />
  );
}

export function OnboardingChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [message, setMessage] = useState('Loading onboarding checklist...');

  const load = () =>
    apiFetch<{ complete: boolean; items: ChecklistItem[] }>(
      '/admin/onboarding-checklist',
    )
      .then((response) => {
        setItems(response.data.items);
        setMessage(
          response.data.complete
            ? 'Checklist complete.'
            : 'Complete remaining items during pilot onboarding.',
        );
      })
      .catch((error: Error) => setMessage(error.message));

  useEffect(() => {
    void load();
  }, []);

  async function complete(key: string) {
    await apiFetch(`/admin/onboarding-checklist/${key}/complete`, {
      method: 'POST',
    });
    await load();
  }

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Admin Onboarding"
          title="Admin Onboarding Checklist"
          body="Track the setup and training steps required for administrators during the pilot."
        />
        <p>{message}</p>
        <section className="panel stack">
          {items.map((item) => (
            <article className="card" key={item.key ?? item.label}>
              <h2>{item.label}</h2>
              <p>Owner: {item.owner ?? 'Pilot team'}</p>
              <Link href={item.href}>Open related page</Link>
              <span className={item.complete ? 'badge good' : 'badge'}>
                {item.complete ? 'Complete' : 'Needs review'}
              </span>
              {!item.complete && item.key ? (
                <button type="button" onClick={() => void complete(item.key!)}>
                  Mark complete
                </button>
              ) : null}
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function FeedbackPage() {
  const [form, setForm] = useState({
    affectedArea: 'Documents',
    email: '',
    message: '',
    name: '',
    priority: 'Medium',
    roleOrDepartment: '',
    screenshotUrl: '',
    type: 'Confusion',
  });
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Submitting feedback...');
    await apiFetch('/feedback', {
      body: JSON.stringify({
        ...form,
        screenshotUrl: form.screenshotUrl || undefined,
      }),
      method: 'POST',
    })
      .then(() => {
        setMessage('Feedback submitted. Thank you.');
        setForm((current) => ({ ...current, message: '', screenshotUrl: '' }));
      })
      .catch((error: Error) => setMessage(error.message));
  }

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Feedback"
          title="Submit Feedback"
          body="Capture real pilot feedback without using Swagger or direct API calls."
        />
        <form className="panel stack" onSubmit={(event) => void submit(event)}>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            Role or department
            <input
              required
              value={form.roleOrDepartment}
              onChange={(event) =>
                setForm({ ...form, roleOrDepartment: event.target.value })
              }
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value })
              }
            >
              {feedbackTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Affected area
            <input
              required
              value={form.affectedArea}
              onChange={(event) =>
                setForm({ ...form, affectedArea: event.target.value })
              }
            />
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label>
            Screenshot URL (optional)
            <input
              value={form.screenshotUrl}
              onChange={(event) =>
                setForm({ ...form, screenshotUrl: event.target.value })
              }
            />
          </label>
          <label>
            Message
            <textarea
              required
              value={form.message}
              onChange={(event) =>
                setForm({ ...form, message: event.target.value })
              }
            />
          </label>
          <button type="submit">Submit feedback</button>
          {message ? <p>{message}</p> : null}
        </form>
      </section>
    </AuthRequired>
  );
}

export function AdminFeedbackPage() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [message, setMessage] = useState('Loading pilot feedback...');

  const load = () =>
    apiFetch<FeedbackRecord[]>('/admin/feedback')
      .then((response) => {
        setRecords(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));

  useEffect(() => {
    void load();
  }, []);

  async function update(id: string, status: string) {
    await apiFetch(`/admin/feedback/${id}`, {
      body: JSON.stringify({ status }),
      method: 'PATCH',
    });
    await load();
  }

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Feedback"
          title="Feedback Triage"
          body="Review feedback submitted by pilot users and mark triage status."
        />
        <p>{message}</p>
        <section className="panel stack">
          {records.map((record) => (
            <article className="card" key={record.id}>
              <h2>
                {record.type}: {record.affectedArea}
              </h2>
              <p>{record.message}</p>
              <p>
                {record.name} · {record.email} · {record.roleOrDepartment}
              </p>
              <p>
                Priority: {record.priority} · Status: {record.status}
              </p>
              <div className="actions">
                <button
                  type="button"
                  onClick={() => void update(record.id, 'REVIEWED')}
                >
                  Mark reviewed
                </button>
                <button
                  type="button"
                  onClick={() => void update(record.id, 'RESOLVED')}
                >
                  Mark resolved
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function PilotIssuesPage() {
  const [issues, setIssues] = useState<PilotIssue[]>([]);
  const [form, setForm] = useState({
    assignedOwner: 'Pilot Coordinator',
    description: '',
    relatedArea: 'General',
    severity: 'Medium',
    source: 'Manual',
    status: 'Open',
    title: '',
  });
  const [message, setMessage] = useState('Loading pilot issues...');

  const load = () =>
    apiFetch<PilotIssue[]>('/admin/pilot-issues')
      .then((response) => {
        setIssues(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch('/admin/pilot-issues', {
      body: JSON.stringify(form),
      method: 'POST',
    });
    setForm((current) => ({ ...current, description: '', title: '' }));
    await load();
  }

  async function update(id: string, status: string) {
    await apiFetch(`/admin/pilot-issues/${id}`, {
      body: JSON.stringify({ status }),
      method: 'PATCH',
    });
    await load();
  }

  return (
    <AuthRequired>
      <section className="stack">
        <Hero
          eyebrow="Pilot Trial"
          title="Issue Tracker"
          body="Track pilot issues discovered during real-world trial preparation."
        />
        <p>{message}</p>
        <form className="panel stack" onSubmit={(event) => void create(event)}>
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <label>
            Description
            <textarea
              required
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <label>
            Source
            <select
              value={form.source}
              onChange={(event) =>
                setForm({ ...form, source: event.target.value })
              }
            >
              {issueSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={form.severity}
              onChange={(event) =>
                setForm({ ...form, severity: event.target.value })
              }
            >
              {issueSeverities.map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              {issueStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Assigned owner
            <input
              value={form.assignedOwner}
              onChange={(event) =>
                setForm({ ...form, assignedOwner: event.target.value })
              }
            />
          </label>
          <label>
            Related area
            <input
              value={form.relatedArea}
              onChange={(event) =>
                setForm({ ...form, relatedArea: event.target.value })
              }
            />
          </label>
          <button type="submit">Create pilot issue</button>
        </form>
        <section className="panel stack">
          {issues.map((issue) => (
            <article className="card" key={issue.id}>
              <h2>{issue.title}</h2>
              <p>{issue.description}</p>
              <p>
                {issue.source} · {issue.severity} · {issue.status}
              </p>
              <p>
                Owner: {issue.assignedOwner ?? 'Unassigned'} · Area:{' '}
                {issue.relatedArea ?? 'General'}
              </p>
              <div className="actions">
                <button
                  type="button"
                  onClick={() => void update(issue.id, 'In Review')}
                >
                  In review
                </button>
                <button
                  type="button"
                  onClick={() => void update(issue.id, 'Fixed')}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => void update(issue.id, 'Closed')}
                >
                  Closed
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </AuthRequired>
  );
}

export function BackupRunbookPage() {
  return (
    <GuidePage
      eyebrow="Pilot Operations"
      title="Backup Runbook"
      sections={[
        [
          'When to back up',
          'Run before release deployments, migrations, bulk imports, and at least nightly during pilot.',
        ],
        [
          'Database backup',
          'Use scripts/backup-pilot.ps1 or scripts/backup-pilot.sh with DATABASE_URL configured in the execution environment.',
        ],
        [
          'Restore drill',
          'Restore into a separate database, run migrations, verify /health and /api/docs, then record evidence in the pilot issue tracker.',
        ],
        [
          'Attachments',
          'Back up local upload storage or the Docker volume alongside the database so metadata and files remain aligned.',
        ],
        [
          'Safety',
          'Never publish .env files, JWT secrets, SMTP credentials, or database dumps in GitHub issues or PRs.',
        ],
      ]}
    />
  );
}

export function PilotDocsPage() {
  return (
    <GuidePage
      eyebrow="Pilot Docs"
      title="Pilot Documentation Pack"
      sections={[
        [
          'README',
          'docs/pilot/README.md: overview of the Sprint 8 pilot pack and browser entry points.',
        ],
        [
          'Admin onboarding checklist',
          'docs/pilot/admin-onboarding-checklist.md: administrator setup and training checklist.',
        ],
        [
          'Staff user guide',
          'docs/pilot/staff-user-guide.md: simple staff workflow for documents, tasks, notifications, reports, and feedback.',
        ],
        [
          'Deployment guide',
          'docs/pilot/deployment-guide.md: local/pilot deployment prerequisites, commands, and verification URLs.',
        ],
        [
          'Backup and restore runbook',
          'docs/pilot/backup-restore-runbook.md: backup command usage and restore drill expectations.',
        ],
        [
          'Feedback and issue workflow',
          'docs/pilot/feedback-and-issue-workflow.md: staff feedback, admin triage, and issue status workflow.',
        ],
        [
          'Trial plan',
          'docs/pilot/trial-plan.md: week-by-week controlled trial sequence.',
        ],
        [
          'Go-live checklist',
          'docs/pilot/go-live-readiness-checklist.md: release-readiness evidence checklist.',
        ],
        [
          'Demo credentials template',
          'docs/pilot/demo-credentials-template.md: local demo credential handling rules.',
        ],
        [
          'Troubleshooting',
          'docs/pilot/troubleshooting.md: common pilot symptoms, causes, fixes, and commands.',
        ],
        [
          'Handover guide',
          'docs/pilot/handover-guide.md: responsibilities, routines, support, and go/no-go criteria.',
        ],
      ]}
    />
  );
}

export function TrialTimelinePage() {
  return (
    <GuidePage
      eyebrow="Pilot Trial"
      title="Trial Timeline"
      sections={[
        [
          'Week 0 - Setup and admin training',
          'Objective: prepare the pilot environment. Activities: verify Docker, migrations, seed data, demo credentials, setup pack, backup runbook, and admin onboarding. Success: admin can log in, configure records, run health checks, and explain staff workflow. Risks: missing SMTP, weak secrets, or skipped backup drill. Owner: Pilot Coordinator and Technical Owner.',
        ],
        [
          'Week 1 - Internal admin-only testing',
          'Objective: prove configuration and core admin flows. Activities: organization settings, departments, users, roles, document types, workflow assignments, audit log, readiness pages, and reports. Success: admins can operate without Swagger. Risks: permission gaps or stale browser sessions. Owner: Organization Admin.',
        ],
        [
          'Week 2 - Department heads route documents',
          'Objective: validate DocRoute and Workflow Engine with department leaders. Activities: create, submit, receive, approve, forward, return, reject, archive, and review timelines. Success: routed work reaches the right department and history is immutable. Risks: incomplete workflow assignments or unclear action ownership. Owner: Department Heads.',
        ],
        [
          'Week 3 - Staff onboarding and wider routing',
          'Objective: expand usage to selected staff. Activities: staff user guide, notifications, My Work, inbox, attachments, reporting, and feedback form. Success: staff submit feedback and complete realistic routing tasks. Risks: training gaps, upload permissions, or notification confusion. Owner: Pilot Coordinator.',
        ],
        [
          'Week 4 - Feedback review and go/no-go decision',
          'Objective: decide whether FaithOS is ready for the next release stage. Activities: triage feedback, close pilot issues, run restore drill, review readiness, and document limitations. Success: critical issues resolved or accepted and release owner signs off. Risks: unresolved critical issues or missing backup evidence. Owner: Executive Sponsor.',
        ],
      ]}
    />
  );
}

export function TroubleshootingPage() {
  return (
    <GuidePage
      eyebrow="Pilot Support"
      title="Troubleshooting"
      sections={[
        [
          'Docker daemon not running',
          'Symptom: docker compose commands fail. Likely cause: Docker Desktop/Engine is stopped. Fix: start Docker and run docker compose ps.',
        ],
        [
          'Docker API permission denied',
          'Symptom: permission denied on docker_engine. Likely cause: current user cannot access Docker. Fix: restart Docker Desktop, check user permissions, and rerun docker compose ps.',
        ],
        [
          'Port 3000 already in use',
          'Symptom: web container or pnpm dev cannot bind. Likely cause: another web process is running. Fix: stop the process or change WEB_PORT.',
        ],
        [
          'Port 3001 already in use',
          'Symptom: API cannot start. Likely cause: another API process is running. Fix: stop the process or change API_PORT.',
        ],
        [
          'Database connection failed',
          'Symptom: API unhealthy or Prisma errors. Likely cause: DATABASE_URL or Postgres health. Fix: docker compose ps postgres and pnpm db:migrate:deploy.',
        ],
        [
          'Redis connection failed',
          'Symptom: health page reports Redis down. Likely cause: REDIS_URL or Redis container. Fix: docker compose ps redis.',
        ],
        [
          'Prisma migration failed',
          'Symptom: API starts against an old schema. Likely cause: migrations not deployed. Fix: pnpm db:migrate:deploy.',
        ],
        [
          'JWT secret missing',
          'Symptom: login/session errors. Likely cause: JWT_SECRET or JWT_REFRESH_SECRET missing/weak. Fix: set strong secrets in .env.',
        ],
        [
          'Access token expired',
          'Symptom: redirected to login. Likely cause: expired session. Fix: log in again; use Logout to clear stale browser state.',
        ],
        [
          'Mailpit not reachable',
          'Symptom: reset or temporary password email not visible. Likely cause: SMTP_HOST/SMTP_PORT mismatch. Fix: open http://localhost:8025 and verify SMTP env.',
        ],
        [
          'CSV import validation errors',
          'Symptom: import preview reports invalid rows. Likely cause: bad email, missing role, missing department code, or duplicate user. Fix: download the template and correct rows.',
        ],
        [
          'File upload permission errors',
          'Symptom: attachment upload fails. Likely cause: unsupported type, size limit, or storage path permission. Fix: check UPLOAD_DIR and MAX_UPLOAD_SIZE.',
        ],
        [
          'Swagger not loading',
          'Symptom: /api/docs fails. Likely cause: API unhealthy or stale container. Fix: restart API and open http://localhost:3001/health.',
        ],
        [
          'Browser session stale',
          'Symptom: page loads but API requests fail. Likely cause: old access/refresh token. Fix: use Logout, clear site storage if needed, and log in again.',
        ],
      ]}
    />
  );
}

export function HandoverGuidePage() {
  return (
    <GuidePage
      eyebrow="Pilot Handover"
      title="Handover Guide"
      sections={[
        [
          'What FaithOS does',
          'FaithOS provides identity, document routing, workflow approvals, notifications, dashboards, reporting, and admin configuration for a controlled organization pilot.',
        ],
        [
          'Implemented scope',
          'Identity, DocRoute, Workflow Engine, Notifications/Dashboard, Reporting, Admin Configuration, Pilot Hardening, and this Pilot Deployment trial pack.',
        ],
        [
          'Not yet implemented',
          'SMS/WhatsApp/push, production SMTP provider, automated backup scheduler, production object storage, public billing, and unrelated finance/HR/payroll modules.',
        ],
        [
          'Admin responsibilities',
          'Maintain users, roles, departments, document types, workflow assignments, readiness checks, backups, and issue triage.',
        ],
        [
          'Staff responsibilities',
          'Use browser workflows, route real trial documents carefully, report issues, and submit feedback.',
        ],
        [
          'Issue and feedback process',
          'Staff submit /feedback. Admins review /admin/feedback, create /admin/pilot-issues, assign owners, and close verified fixes.',
        ],
        [
          'Daily routine',
          'Check system health, inbox/workflow queues, notifications, feedback, open pilot issues, and Mailpit/dev email if testing resets.',
        ],
        [
          'Weekly routine',
          'Review reports, audit log, readiness checklists, backup evidence, unresolved issues, and training gaps.',
        ],
        [
          'Backup routine',
          'Run pnpm backup:pilot or the shell script, protect .env separately, back up uploaded files, and test restore in a separate environment.',
        ],
        [
          'Support escalation',
          'Record symptoms, owner, severity, command output, and fix status in /admin/pilot-issues before escalation.',
        ],
        [
          'Go/no-go criteria',
          'No unresolved critical issues, restore drill complete, demo credentials rotated/removed, readiness accepted, and human release owner approval recorded.',
        ],
      ]}
    />
  );
}

function ChecklistPage({
  body,
  endpoint,
  eyebrow,
  title,
}: {
  body: string;
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
        setMessage(response.data.complete ? 'Complete.' : 'Review required.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, [endpoint]);

  return (
    <AuthRequired>
      <section className="stack">
        <Hero eyebrow={eyebrow} title={title} body={body} />
        <p>{message}</p>
        <Metric label="Overall status" value={complete ? 'Ready' : 'Review'} />
        <section className="panel">
          <div className="uat-grid">
            {items.map((item) => (
              <Link className="uat-link" href={item.href} key={item.label}>
                <strong>{item.label}</strong>
                <span className={item.complete ? 'badge good' : 'badge'}>
                  {item.status ?? (item.complete ? 'Complete' : 'Needs review')}
                </span>
                <span>{item.description ?? item.explanation}</span>
                {item.owner ? <span>Owner: {item.owner}</span> : null}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </AuthRequired>
  );
}

function GuidePage({
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
        <Hero
          eyebrow={eyebrow}
          title={title}
          body="Pilot documentation exposed in the application so reviewers can test and operate FaithOS without leaving the browser."
        />
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
    <div className="hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p>{label}</p>
      <span>{value}</span>
    </div>
  );
}
