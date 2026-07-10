'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  apiBaseUrl,
  apiFetch,
  type AdminAuditLog,
  type AdminDepartment,
  type AdminDocumentType,
  type AdminOrganization,
  type AdminPermissionMatrix,
  type AdminRole,
  type AdminSummary,
  type AdminSystemSettings,
  type AdminUser,
  type AdminWorkflowAssignments,
  type Department,
  type PilotReadiness,
  type Role,
  type Workflow,
} from '../lib/api-client';
import { AuthRequired } from './auth-required';

const adminLinks = [
  [
    '/setup',
    'Setup Wizard',
    'Guided first-run checklist for new organization administrators',
  ],
  [
    '/admin/organization',
    'Organization Settings',
    'Tenant profile, contact details, and pilot identity',
  ],
  [
    '/admin/departments',
    'Departments',
    'Teams that send, receive, and approve documents',
  ],
  [
    '/admin/users',
    'Users',
    'Pilot staff accounts, roles, activation, and departments',
  ],
  [
    '/admin/users/import',
    'CSV User Import',
    'Bulk onboarding with preview, validation, and duplicate skipping',
  ],
  [
    '/admin/roles',
    'Roles',
    'Permission groups used to control what staff can access',
  ],
  [
    '/admin/permissions',
    'Permissions',
    'Read-only catalog of system capabilities and role mapping',
  ],
  [
    '/admin/document-types',
    'Document Types',
    'Document categories and defaults',
  ],
  [
    '/admin/workflow-assignments',
    'Workflow Assignments',
    'Default workflow coverage by document type',
  ],
  ['/admin/system-settings', 'System Settings', 'Safe pilot configuration'],
  ['/admin/audit-log', 'Audit Log', 'Administrative activity trail'],
  ['/admin/pilot-readiness', 'Pilot Readiness', 'Pilot launch checklist'],
  [
    '/admin/production-readiness',
    'Production Readiness',
    'Safe go-live checklist with no secret exposure',
  ],
  [
    '/admin/backup-restore',
    'Backup & Restore',
    'Internal operational guidance for pilot data protection',
  ],
  [
    '/admin/deployment-guide',
    'Deployment Guide',
    'Docker, migrations, seed, health checks, and troubleshooting',
  ],
  [
    '/admin/system-health',
    'System Health',
    'Safe health summary for API, DB, Redis, Mailpit, and environment',
  ],
] as const;

export function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [message, setMessage] = useState('Loading admin summary...');

  useEffect(() => {
    void apiFetch<AdminSummary>('/admin')
      .then((response) => {
        setSummary(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <AdminHero
          eyebrow="Sprint 6"
          title="Admin Configuration"
          description="Pilot-ready configuration for organization, identity, document types, workflow assignments, settings, audit, and readiness."
        />
        <p>{message}</p>
        {summary ? (
          <section className="cards">
            <Metric label="Total Users" value={summary.counts.totalUsers} />
            <Metric label="Active Users" value={summary.counts.activeUsers} />
            <Metric label="Departments" value={summary.counts.departments} />
            <Metric label="Roles" value={summary.counts.roles} />
            <Metric
              label="Document Types"
              value={summary.counts.documentTypes}
            />
            <Metric
              label="Workflow Assignments"
              value={summary.counts.workflowAssignments}
            />
            <Metric
              label="Checklist Gaps"
              value={summary.counts.incompletePilotChecklistItems}
            />
          </section>
        ) : null}
        <section className="panel">
          <h2>Admin areas</h2>
          <div className="uat-grid">
            {adminLinks.map(([href, label, description]) => (
              <Link className="uat-link" href={href} key={href}>
                <strong>{label}</strong>
                <span>{description}</span>
              </Link>
            ))}
            <Link
              className="uat-link"
              href={`${apiBaseUrl}/api/docs`}
              target="_blank"
            >
              <strong>Swagger Documentation</strong>
              <span>Open API documentation for admin endpoints.</span>
            </Link>
          </div>
        </section>
        <AuditPanel logs={summary?.recentActivity ?? []} />
      </section>
    </AuthRequired>
  );
}

export function AdminOrganizationPage() {
  const [organization, setOrganization] = useState<AdminOrganization | null>(
    null,
  );
  const [message, setMessage] = useState('Loading organization...');

  async function load() {
    const response = await apiFetch<AdminOrganization>('/admin/organization');
    setOrganization(response.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiFetch<AdminOrganization>('/admin/organization', {
      body: JSON.stringify(Object.fromEntries(form.entries())),
      method: 'PATCH',
    });
    await load();
    setMessage('Organization updated.');
  }

  return (
    <AdminShell
      title="Organization Settings"
      description="View and update the current tenant profile. Secrets and environment values are intentionally not exposed."
    >
      <p>{message}</p>
      {organization ? (
        <form className="panel form-grid" onSubmit={save}>
          {[
            ['name', 'Organization name'],
            ['shortName', 'Short name'],
            ['address', 'Address'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['website', 'Website'],
            ['logoUrl', 'Logo URL'],
            ['timezone', 'Default timezone'],
            ['defaultCurrency', 'Default currency'],
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
          <label>
            Active status
            <select defaultValue={organization.status} name="status">
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </label>
          <div className="full">
            <button type="submit">Save organization</button>
          </div>
        </form>
      ) : null}
    </AdminShell>
  );
}

export function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('Loading departments...');

  async function load() {
    const [departmentResponse, userResponse] = await Promise.all([
      apiFetch<AdminDepartment[]>('/admin/departments'),
      apiFetch<AdminUser[]>('/admin/users'),
    ]);
    setDepartments(departmentResponse.data);
    setUsers(userResponse.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = compactForm(event.currentTarget);
    await apiFetch<AdminDepartment>('/admin/departments', {
      body: JSON.stringify(body),
      method: 'POST',
    });
    event.currentTarget.reset();
    await load();
    setMessage('Department created.');
  }

  async function deactivate(id: string) {
    await apiFetch<AdminDepartment>(`/admin/departments/${id}/deactivate`, {
      method: 'PATCH',
    });
    await load();
    setMessage('Department deactivated.');
  }

  return (
    <AdminShell
      title="Department Management"
      description="Create, review, and deactivate departments without hard deletion."
    >
      <p>{message}</p>
      <form className="panel form-grid" onSubmit={create}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Code
          <input name="code" placeholder="FIN" />
        </label>
        <label>
          Description
          <input name="description" />
        </label>
        <label>
          Department head
          <select name="departmentHeadId">
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </label>
        <div className="full">
          <button type="submit">Create department</button>
        </div>
      </form>
      <SimpleTable
        columns={[
          'Name',
          'Code',
          'Head',
          'Users',
          'Pending',
          'Active',
          'Action',
        ]}
        rows={departments.map((department) => [
          department.name,
          department.code ?? 'n/a',
          department.departmentHead?.email ?? 'Unassigned',
          department._count?.members ?? 0,
          (department._count?.assignedWorkflowTasks ?? 0) +
            (department._count?.currentDocuments ?? 0),
          department.active ? 'Yes' : 'No',
          <button
            disabled={!department.active}
            key="deactivate"
            onClick={() => void deactivate(department.id)}
            type="button"
          >
            Deactivate
          </button>,
        ])}
      />
    </AdminShell>
  );
}

export function AdminUsersPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [message, setMessage] = useState('Loading users...');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    return params.toString() ? `?${params}` : '';
  }, [filters]);

  async function load() {
    const [userResponse, departmentResponse, roleResponse] = await Promise.all([
      apiFetch<AdminUser[]>(`/admin/users${query}`),
      apiFetch<Department[]>('/departments'),
      apiFetch<Role[]>('/roles'),
    ]);
    setUsers(userResponse.data);
    setDepartments(departmentResponse.data);
    setRoles(roleResponse.data.filter((role) => !role.isSystem));
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, [query]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch<{
      temporaryPassword: string;
      user: AdminUser;
    }>('/admin/users', {
      body: JSON.stringify(compactForm(event.currentTarget)),
      method: 'POST',
    });
    event.currentTarget.reset();
    await load();
    setMessage(
      `User created. Temporary password: ${response.data.temporaryPassword}`,
    );
  }

  async function setActive(id: string, active: boolean) {
    await apiFetch<AdminUser>(
      `/admin/users/${id}/${active ? 'activate' : 'deactivate'}`,
      {
        method: 'PATCH',
      },
    );
    await load();
    setMessage(active ? 'User activated.' : 'User deactivated.');
  }

  return (
    <AdminShell
      title="User Management"
      description="Search, filter, create, assign, activate, and deactivate users."
    >
      <p>{message}</p>
      <section className="panel form-grid">
        <label>
          Search
          <input
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
            placeholder="Name or email"
            value={filters.search}
          />
        </label>
        <label>
          Status
          <select
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
            value={filters.status}
          >
            <option value="">Any status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INVITED">INVITED</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </label>
      </section>
      <form className="panel form-grid" onSubmit={create}>
        <label>
          First name
          <input name="firstName" required />
        </label>
        <label>
          Last name
          <input name="lastName" required />
        </label>
        <label>
          Email
          <input name="email" required type="email" />
        </label>
        <label>
          Department
          <select name="departmentId">
            <option value="">Unassigned</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select name="roleId">
            <option value="">Unassigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Temporary password
          <input defaultValue="FaithOS-UAT-2026!" name="temporaryPassword" />
        </label>
        <div className="full">
          <button type="submit">Create user</button>
        </div>
      </form>
      <SimpleTable
        columns={[
          'Name',
          'Email',
          'Department',
          'Role',
          'Status',
          'Last Login',
          'Action',
        ]}
        rows={users.map((user) => [
          `${user.firstName ?? ''} ${user.lastName ?? ''}`,
          user.email,
          user.department?.name ?? 'Unassigned',
          user.role?.name ?? 'Unassigned',
          user.status,
          user.lastLoginAt ?? 'Never',
          <button
            key="toggle"
            onClick={() => void setActive(user.id, user.status !== 'ACTIVE')}
            type="button"
          >
            {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>,
        ])}
      />
    </AdminShell>
  );
}

export function AdminRolesPage() {
  const [permissions, setPermissions] = useState<AdminPermissionMatrix | null>(
    null,
  );
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [message, setMessage] = useState('Loading roles...');

  async function load() {
    const [roleResponse, matrixResponse] = await Promise.all([
      apiFetch<AdminRole[]>('/admin/roles'),
      apiFetch<AdminPermissionMatrix>('/admin/permissions/matrix'),
    ]);
    setRoles(roleResponse.data);
    setPermissions(matrixResponse.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch<AdminRole>('/admin/roles', {
      body: JSON.stringify(compactForm(event.currentTarget)),
      method: 'POST',
    });
    event.currentTarget.reset();
    await load();
    setMessage('Role created.');
  }

  async function assignPermissions(roleId: string, permissionIds: string[]) {
    await apiFetch<AdminRole>(`/admin/roles/${roleId}/permissions`, {
      body: JSON.stringify({ permissionIds }),
      method: 'PATCH',
    });
    await load();
    setMessage('Role permissions updated.');
  }

  return (
    <AdminShell
      title="Role Management"
      description="Create organization roles and assign permissions using the existing RBAC model."
    >
      <p>{message}</p>
      <form className="panel form-grid" onSubmit={create}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Description
          <input name="description" />
        </label>
        <div className="full">
          <button type="submit">Create role</button>
        </div>
      </form>
      <section className="panel stack">
        <h2>Roles</h2>
        {roles.map((role) => (
          <RolePermissionEditor
            allPermissions={permissions?.permissions ?? []}
            key={role.id}
            onSave={(permissionIds) =>
              void assignPermissions(role.id, permissionIds)
            }
            role={role}
          />
        ))}
      </section>
    </AdminShell>
  );
}

export function AdminPermissionsPage() {
  const [matrix, setMatrix] = useState<AdminPermissionMatrix | null>(null);
  const [message, setMessage] = useState('Loading permissions...');

  useEffect(() => {
    void apiFetch<AdminPermissionMatrix>('/admin/permissions/matrix')
      .then((response) => {
        setMatrix(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AdminShell
      title="Permission Management"
      description="Read-only grouped permission catalog and role usage matrix."
    >
      <p>{message}</p>
      {matrix
        ? Object.entries(matrix.modules).map(([module, permissions]) => (
            <section className="panel" key={module}>
              <h2>{module}</h2>
              <SimpleTable
                columns={['Code', 'Display Name', 'Roles Using Permission']}
                rows={permissions.map((permission) => {
                  const roleNames =
                    matrix.permissions
                      .find((item) => item.id === permission.id)
                      ?.rolePermissions?.map((item) => item.role.name)
                      .join(', ') ?? 'None';
                  return [permission.code, permission.displayName, roleNames];
                })}
              />
            </section>
          ))
        : null}
    </AdminShell>
  );
}

export function AdminDocumentTypesPage() {
  const [documentTypes, setDocumentTypes] = useState<AdminDocumentType[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [message, setMessage] = useState('Loading document types...');

  async function load() {
    const [typeResponse, workflowResponse] = await Promise.all([
      apiFetch<AdminDocumentType[]>('/admin/document-types'),
      apiFetch<Workflow[]>('/workflows'),
    ]);
    setDocumentTypes(typeResponse.data);
    setWorkflows(workflowResponse.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch<AdminDocumentType>('/admin/document-types', {
      body: JSON.stringify(compactForm(event.currentTarget)),
      method: 'POST',
    });
    event.currentTarget.reset();
    await load();
    setMessage('Document type created.');
  }

  return (
    <AdminShell
      title="Document Type Configuration"
      description="Manage document type defaults and optional default workflow assignment."
    >
      <p>{message}</p>
      <form className="panel form-grid" onSubmit={create}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Reference prefix
          <input defaultValue="DOC" name="referencePrefix" />
        </label>
        <label>
          Default confidentiality
          <select name="defaultConfidentiality">
            <option value="PUBLIC">PUBLIC</option>
            <option value="INTERNAL">INTERNAL</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="RESTRICTED">RESTRICTED</option>
          </select>
        </label>
        <label>
          Default priority
          <select name="defaultPriority">
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </label>
        <label>
          Default workflow
          <select name="workflowId">
            <option value="">Assign later</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <input name="description" />
        </label>
        <div className="full">
          <button type="submit">Create document type</button>
        </div>
      </form>
      <SimpleTable
        columns={['Name', 'Prefix', 'Confidentiality', 'Priority', 'Active']}
        rows={documentTypes.map((type) => [
          type.name,
          type.referencePrefix,
          type.defaultConfidentiality,
          type.defaultPriority,
          type.active ? 'Yes' : 'No',
        ])}
      />
    </AdminShell>
  );
}

export function AdminWorkflowAssignmentsPage() {
  const [configuration, setConfiguration] =
    useState<AdminWorkflowAssignments | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [message, setMessage] = useState('Loading workflow assignments...');

  async function load() {
    const [assignmentResponse, workflowResponse] = await Promise.all([
      apiFetch<AdminWorkflowAssignments>('/admin/workflow-assignments'),
      apiFetch<Workflow[]>('/workflows'),
    ]);
    setConfiguration(assignmentResponse.data);
    setWorkflows(workflowResponse.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = compactForm(event.currentTarget) as {
      documentTypeId: string;
      workflowId: string;
    };
    await apiFetch(`/admin/document-types/${form.documentTypeId}/workflow`, {
      body: JSON.stringify({ workflowId: form.workflowId }),
      method: 'PATCH',
    });
    await load();
    setMessage('Workflow assignment updated.');
  }

  return (
    <AdminShell
      title="Workflow Assignment Configuration"
      description="Validate and update active workflow assignment coverage by document type."
    >
      <p>{message}</p>
      <form className="panel form-grid" onSubmit={assign}>
        <label>
          Document type
          <select name="documentTypeId" required>
            {configuration?.documentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workflow
          <select name="workflowId" required>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name} v{workflow.version}
              </option>
            ))}
          </select>
        </label>
        <div className="full">
          <button type="submit">Assign workflow</button>
        </div>
      </form>
      <SimpleTable
        columns={['Document Type', 'Workflow Coverage']}
        rows={(configuration?.documentTypes ?? []).map((type) => [
          type.name,
          type.hasActiveWorkflow
            ? 'Active workflow assigned'
            : 'Missing workflow',
        ])}
      />
      <SimpleTable
        columns={['Document Type', 'Workflow', 'Active']}
        rows={(configuration?.assignments ?? []).map((assignment) => [
          assignment.documentType,
          assignment.workflow?.name ?? assignment.workflowId,
          assignment.active ? 'Yes' : 'No',
        ])}
      />
    </AdminShell>
  );
}

export function AdminSystemSettingsPage() {
  const [settings, setSettings] = useState<AdminSystemSettings | null>(null);
  const [message, setMessage] = useState('Loading system settings...');

  async function load() {
    const response = await apiFetch<AdminSystemSettings>(
      '/admin/system-settings',
    );
    setSettings(response.data);
    setMessage('Loaded.');
  }

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiFetch<AdminSystemSettings>('/admin/system-settings', {
      body: JSON.stringify({
        allowedAttachmentTypes: String(form.get('allowedAttachmentTypes') ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        brandingName: String(form.get('brandingName') ?? ''),
        brandingSubtitle: String(form.get('brandingSubtitle') ?? ''),
        defaultSlaDays: Number(form.get('defaultSlaDays') ?? 3),
        emailNotificationsEnabled:
          form.get('emailNotificationsEnabled') === 'on',
        maintenanceMode: form.get('maintenanceMode') === 'on',
        maxAttachmentSizeBytes: Number(form.get('maxAttachmentSizeBytes') ?? 1),
        referenceNumberFormat: String(form.get('referenceNumberFormat') ?? ''),
      }),
      method: 'PATCH',
    });
    await load();
    setMessage('System settings updated.');
  }

  return (
    <AdminShell
      title="System Settings"
      description="Safe operational settings only. Secrets and infrastructure credentials are not exposed."
    >
      <p>{message}</p>
      {settings ? (
        <form className="panel form-grid" onSubmit={save}>
          <label>
            Reference format
            <input
              defaultValue={settings.referenceNumberFormat}
              name="referenceNumberFormat"
            />
          </label>
          <label>
            Max attachment size bytes
            <input
              defaultValue={settings.maxAttachmentSizeBytes}
              name="maxAttachmentSizeBytes"
              type="number"
            />
          </label>
          <label>
            Allowed attachment types
            <input
              defaultValue={settings.allowedAttachmentTypes.join(', ')}
              name="allowedAttachmentTypes"
            />
          </label>
          <label>
            Default SLA days
            <input
              defaultValue={settings.defaultSlaDays}
              name="defaultSlaDays"
              type="number"
            />
          </label>
          <label>
            Branding name
            <input defaultValue={settings.brandingName} name="brandingName" />
          </label>
          <label>
            Branding subtitle
            <input
              defaultValue={settings.brandingSubtitle}
              name="brandingSubtitle"
            />
          </label>
          <label>
            <input
              defaultChecked={settings.emailNotificationsEnabled}
              name="emailNotificationsEnabled"
              type="checkbox"
            />
            Email notifications enabled
          </label>
          <label>
            <input
              defaultChecked={settings.maintenanceMode}
              name="maintenanceMode"
              type="checkbox"
            />
            Maintenance mode placeholder
          </label>
          <div className="full">
            <button type="submit">Save settings</button>
          </div>
        </form>
      ) : null}
    </AdminShell>
  );
}

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [message, setMessage] = useState('Loading audit log...');

  useEffect(() => {
    void apiFetch<AdminAuditLog[]>('/admin/audit-log')
      .then((response) => {
        setLogs(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AdminShell
      title="Audit Log"
      description="Administrative activity recorded through existing audit infrastructure."
    >
      <p>{message}</p>
      <AuditPanel logs={logs} />
    </AdminShell>
  );
}

export function AdminPilotReadinessPage() {
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [message, setMessage] = useState('Loading checklist...');

  useEffect(() => {
    void apiFetch<PilotReadiness>('/admin/pilot-readiness')
      .then((response) => {
        setReadiness(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  return (
    <AdminShell
      title="Pilot Readiness Checklist"
      description="Operational checklist for moving into a real pilot environment."
    >
      <p>{message}</p>
      <section className="panel">
        <h2>{readiness?.complete ? 'Pilot ready' : 'Pilot gaps remain'}</h2>
        <div className="stack">
          {readiness?.items.map((item) => (
            <div className="uat-link" key={item.label}>
              <strong>
                {item.complete ? 'Complete' : 'Incomplete'} — {item.label}
              </strong>
              <span>{item.explanation}</span>
              <Link href={item.href}>Open related page</Link>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function AdminShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <AuthRequired>
      <section className="stack">
        <AdminHero eyebrow="Admin" title={title} description={description} />
        <div className="actions">
          <Link className="button secondary" href="/admin">
            Back to Admin
          </Link>
        </div>
        {children}
      </section>
    </AuthRequired>
  );
}

function AdminHero({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <span>{value}</span>
      <strong>{label}</strong>
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <section className="panel">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AuditPanel({ logs }: { logs: AdminAuditLog[] }) {
  return (
    <section className="panel">
      <h2>Recent admin activity</h2>
      <SimpleTable
        columns={['Action', 'Entity', 'Actor', 'Created']}
        rows={logs.map((log) => [
          log.action,
          `${log.entityType}${log.entityId ? ` ${log.entityId}` : ''}`,
          log.user?.email ?? 'System',
          log.createdAt,
        ])}
      />
    </section>
  );
}

function RolePermissionEditor({
  allPermissions,
  onSave,
  role,
}: {
  allPermissions: Array<{ code: string; displayName: string; id: string }>;
  onSave: (permissionIds: string[]) => void;
  role: AdminRole;
}) {
  const [selected, setSelected] = useState(
    new Set(role.rolePermissions?.map((item) => item.permissionId) ?? []),
  );

  function toggle(permissionId: string) {
    const next = new Set(selected);
    if (next.has(permissionId)) {
      next.delete(permissionId);
    } else {
      next.add(permissionId);
    }
    setSelected(next);
  }

  return (
    <div className="panel stack">
      <h3>
        {role.name} {role.isSystem ? '(system read-only)' : ''}
      </h3>
      <p>{role.description}</p>
      <div className="form-grid">
        {allPermissions.map((permission) => (
          <label key={permission.id}>
            <input
              checked={selected.has(permission.id)}
              disabled={role.isSystem}
              onChange={() => toggle(permission.id)}
              type="checkbox"
            />
            {permission.code}
          </label>
        ))}
      </div>
      {!role.isSystem ? (
        <button onClick={() => onSave([...selected])} type="button">
          Save permissions
        </button>
      ) : null}
    </div>
  );
}

function compactForm(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form).entries()]
      .map(([key, value]) => [key, String(value)] as const)
      .filter(([, value]) => value.length > 0),
  );
}
