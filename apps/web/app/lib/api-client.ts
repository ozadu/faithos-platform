'use client';

export type ApiEnvelope<T> = {
  data: T;
  message: string;
  meta: Record<string, unknown>;
  success: boolean;
};

export type DemoUser = {
  email: string;
  firstName?: string;
  id: string;
  lastName?: string;
  organizationId?: string;
};

export type Department = {
  id: string;
  name: string;
  description?: string | null;
};

export type Role = {
  id: string;
  isSystem: boolean;
  name: string;
  permissions?: Permission[];
};

export type Permission = {
  code: string;
  displayName: string;
  id: string;
  module: string;
};

export type AdminOrganization = {
  active?: boolean;
  address?: string | null;
  defaultCurrency?: string;
  email: string;
  id: string;
  logoUrl?: string | null;
  name: string;
  phone?: string | null;
  shortName?: string | null;
  status: string;
  timezone: string;
  website?: string | null;
};

export type AdminSummary = {
  counts: {
    activeUsers: number;
    departments: number;
    documentTypes: number;
    incompletePilotChecklistItems: number;
    roles: number;
    totalUsers: number;
    workflowAssignments: number;
  };
  recentActivity: AdminAuditLog[];
};

export type AdminDepartment = Department & {
  _count?: {
    assignedWorkflowTasks: number;
    currentDocuments: number;
    members: number;
  };
  active: boolean;
  code?: string | null;
  departmentHead?: DemoUser | null;
  parentDepartment?: Department | null;
};

export type AdminUser = DemoUser & {
  createdAt: string;
  department?: Department | null;
  departmentId?: string | null;
  jobTitle?: string | null;
  lastLoginAt?: string | null;
  phone?: string | null;
  role?: Role | null;
  roleId?: string | null;
  status: string;
};

export type AdminRole = Role & {
  _count?: { users: number };
  active: boolean;
  description?: string | null;
  rolePermissions?: Array<{ permission: Permission; permissionId: string }>;
};

export type AdminPermissionMatrix = {
  modules: Record<string, Permission[]>;
  permissions: Array<
    Permission & {
      rolePermissions?: Array<{ role: AdminRole }>;
    }
  >;
  roles: Array<{ id: string; name: string; permissionCodes: string[] }>;
};

export type AdminDocumentType = {
  active: boolean;
  defaultConfidentiality: string;
  defaultPriority: string;
  description?: string | null;
  hasActiveWorkflow?: boolean;
  id: string;
  name: string;
  referencePrefix: string;
};

export type AdminWorkflowAssignments = {
  assignments: WorkflowAssignment[];
  documentTypes: AdminDocumentType[];
};

export type AdminSystemSettings = {
  allowedAttachmentTypes: string[];
  brandingName: string;
  brandingSubtitle: string;
  defaultSlaDays: number;
  emailNotificationsEnabled: boolean;
  maintenanceMode: boolean;
  maxAttachmentSizeBytes: number;
  referenceNumberFormat: string;
};

export type AdminAuditLog = {
  action: string;
  createdAt: string;
  entityId?: string | null;
  entityType: string;
  id: string;
  newValues?: Record<string, unknown> | null;
  oldValues?: Record<string, unknown> | null;
  user?: DemoUser | null;
};

export type PilotReadiness = {
  complete: boolean;
  items: Array<{
    complete: boolean;
    explanation: string;
    href: string;
    label: string;
  }>;
};

export type DocumentRecord = {
  attachments?: AttachmentRecord[];
  body: string;
  category: string;
  confidentiality: string;
  currentDepartment?: Department;
  currentDepartmentId: string;
  id: string;
  priority: string;
  referenceNumber: string;
  routes?: RouteRecord[];
  senderDepartment?: Department;
  senderDepartmentId: string;
  status: string;
  subject: string;
  timeline?: TimelineRecord[];
  title: string;
  updatedAt: string;
};

export type InboxRecord = {
  fromDepartment?: Department;
  id: string;
  priority: string;
  receivedDate: string;
  referenceNumber: string;
  status: string;
  title: string;
  unread: boolean;
};

export type TimelineRecord = {
  action: string;
  actor?: DemoUser;
  createdAt: string;
  id: string;
  note?: string | null;
};

export type RouteRecord = {
  action: string;
  createdAt: string;
  fromDepartment?: Department;
  id: string;
  isRead: boolean;
  note?: string | null;
  toDepartment?: Department;
};

export type AttachmentRecord = {
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
};

export type WorkflowStep = {
  approvalRequired: boolean;
  canForward: boolean;
  canReturn: boolean;
  conditionField?: string | null;
  conditionOperator?: string | null;
  conditionValue?: string | null;
  department?: Department | null;
  departmentId: string;
  dueDays: number;
  escalationDays: number;
  id: string;
  notifyEmail: boolean;
  notifyInApp: boolean;
  role?: Role | null;
  roleId?: string | null;
  sequence: number;
};

export type WorkflowVersion = {
  active: boolean;
  id: string;
  version: number;
};

export type Workflow = {
  active: boolean;
  assignments?: WorkflowAssignment[];
  createdAt?: string;
  description?: string | null;
  id: string;
  name: string;
  steps?: WorkflowStep[];
  updatedAt?: string;
  version: number;
  versions?: WorkflowVersion[];
};

export type WorkflowAssignment = {
  active: boolean;
  documentType: string;
  id: string;
  workflow?: Pick<Workflow, 'id' | 'name' | 'version'>;
  workflowId: string;
};

export type WorkflowTask = {
  assignedDepartment?: Department | null;
  assignedDepartmentId?: string | null;
  assignedRole?: Role | null;
  assignedUser?: DemoUser | null;
  completedAt?: string | null;
  delegatedFromUser?: DemoUser | null;
  document?: Pick<
    DocumentRecord,
    'category' | 'id' | 'referenceNumber' | 'title'
  >;
  dueAt: string;
  escalatedAt?: string | null;
  id: string;
  receivedAt?: string | null;
  reminderAt?: string | null;
  status: string;
  step?: WorkflowStep | null;
  workflowInstance?: {
    id: string;
    status?: string;
    workflow?: Pick<Workflow, 'id' | 'name'>;
  };
};

export type WorkflowHistoryEvent = {
  action: string;
  actor?: DemoUser | null;
  actorDepartment?: Department | null;
  comments?: string | null;
  createdAt: string;
  document?: Pick<DocumentRecord, 'id' | 'referenceNumber' | 'title'>;
  id: string;
  nextStep?: Pick<WorkflowStep, 'id' | 'sequence'> | null;
  previousStep?: Pick<WorkflowStep, 'id' | 'sequence'> | null;
};

export type WorkflowNotification = {
  createdAt: string;
  department?: Department | null;
  document?: Pick<DocumentRecord, 'id' | 'referenceNumber' | 'title'> | null;
  id: string;
  message: string;
  readAt?: string | null;
  title: string;
  type: string;
  user?: DemoUser | null;
  workflowInstance?: { id: string; status: string } | null;
};

export type WorkflowDelegation = {
  active: boolean;
  endsAt: string;
  fromUser?: DemoUser | null;
  fromUserId: string;
  id: string;
  reason?: string | null;
  startsAt: string;
  toUser?: DemoUser | null;
  toUserId: string;
};

export type ActivityItem = {
  action: string;
  actor?: DemoUser | null;
  actorDepartment?: Department | null;
  comments?: string | null;
  createdAt: string;
  document?: Pick<DocumentRecord, 'id' | 'referenceNumber' | 'title'>;
  id: string;
};

export type DashboardSummary = {
  activity: ActivityItem[];
  counts: {
    draftDocuments: number;
    inboxDocuments: number;
    myPendingTasks: number;
    overdueWorkflows: number;
    unreadNotifications: number;
  };
  quickActions: Array<{ href: string; label: string }>;
  recentDocuments: Array<
    Pick<
      DocumentRecord,
      'id' | 'priority' | 'referenceNumber' | 'status' | 'title' | 'updatedAt'
    >
  >;
  recentWorkflows: Array<{
    completedAt?: string | null;
    document?: Pick<DocumentRecord, 'id' | 'referenceNumber' | 'title'>;
    id: string;
    workflow?: Pick<Workflow, 'id' | 'name'>;
  }>;
};

export type ExecutiveDashboard = {
  averageCompletionHours: number;
  departmentActivity: Array<{
    department: Department;
    documents: number;
    pendingTasks: number;
  }>;
  highPriorityDocuments: Array<
    Pick<
      DocumentRecord,
      'id' | 'priority' | 'referenceNumber' | 'status' | 'title' | 'updatedAt'
    > & { currentDepartment?: Department | null }
  >;
  metrics: {
    completedThisWeek: number;
    overdueWorkflows: number;
    pendingApprovals: number;
    submittedThisWeek: number;
    totalDocuments: number;
  };
};

export type DepartmentDashboard = {
  activity: ActivityItem[];
  department: Department;
  metrics: {
    completedDocuments: number;
    departmentInboxCount: number;
    departmentPendingTasks: number;
    overdueItems: number;
  };
};

export type MyWorkSummary = {
  assignedTasks: WorkflowTask[];
  navigation: Array<{ href: string; label: string }>;
  overdueItems: WorkflowTask[];
  pendingApprovals: WorkflowTask[];
  recentlyCompletedTasks: WorkflowTask[];
  returnedDocuments: Array<
    Pick<
      DocumentRecord,
      'id' | 'referenceNumber' | 'status' | 'title' | 'updatedAt'
    >
  >;
};

export type ReportPagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type ReportList<T> = {
  items: T[];
  pagination: ReportPagination;
};

export type ReportSummary = {
  averageApprovalHours: number;
  averageWorkflowCompletionHours: number;
  completedWorkflows: number;
  documentsArchived: number;
  documentsCompletedThisWeek: number;
  documentsCreatedThisWeek: number;
  documentsSubmittedThisWeek: number;
  highPriorityPendingItems: Array<
    Pick<DocumentRecord, 'id' | 'referenceNumber' | 'status' | 'title'> & {
      currentDepartment?: Department | null;
    }
  >;
  mostActiveDepartments: Array<{
    department: Department;
    totalActivity: number;
  }>;
  mostActiveUsers: Array<{
    totalActivity: number;
    user: DemoUser;
  }>;
  overdueWorkflows: number;
  pendingDocuments: number;
  scope: string;
  totalDocuments: number;
};

export type ReportTableRow = Record<string, unknown>;

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const apiProxyBasePath = '/api/proxy';

export const demoCredentials = {
  email: 'admin@demo.faithos.local',
  password: 'FaithOS-Demo-2026!',
};

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('faithos.accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('faithos.refreshToken');
}

export function saveSession(input: {
  accessToken: string;
  refreshToken: string;
  user: DemoUser;
}): void {
  window.localStorage.setItem('faithos.accessToken', input.accessToken);
  window.localStorage.setItem('faithos.refreshToken', input.refreshToken);
  window.localStorage.setItem('faithos.user', JSON.stringify(input.user));
}

export function clearSession(): void {
  window.localStorage.removeItem('faithos.accessToken');
  window.localStorage.removeItem('faithos.refreshToken');
  window.localStorage.removeItem('faithos.user');
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight ??= fetch(`${apiProxyBasePath}/auth/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
      }> | null;
      if (!response.ok || !payload?.data) return false;
      const currentUser = window.localStorage.getItem('faithos.user');
      saveSession({
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
        user: currentUser
          ? (JSON.parse(currentUser) as DemoUser)
          : { email: 'unknown', id: 'unknown' },
      });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function friendlyApiMessage(status: number, message?: string): string {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to view this page.';
  if (!message) return `Request failed with status ${status}.`;
  if (/access token|refresh token|jwt|bearer/i.test(message)) {
    return 'Your session has expired. Please log in again.';
  }
  return message;
}

function redirectToLogin(message: string): void {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ message, next });
  clearSession();
  window.location.href = `/login?${params.toString()}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const request = () => {
    const token = getAccessToken();
    return fetch(`${apiProxyBasePath}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  };
  let response = await request();

  if (
    response.status === 401 &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh') &&
    (await refreshSession())
  ) {
    response = await request();
  }

  const payload = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | { message?: string } | null;

  if (!response.ok) {
    const message = friendlyApiMessage(response.status, payload?.message);
    if (response.status === 401 && typeof window !== 'undefined') {
      redirectToLogin(message);
    }
    throw new Error(message);
  }

  return payload as ApiEnvelope<T>;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${apiProxyBasePath}/auth/logout`, {
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }).catch(() => undefined);
  }
  clearSession();
}

export async function rawApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const request = () => {
    const token = getAccessToken();
    return fetch(`${apiProxyBasePath}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  };
  let response = await request();
  if (response.status === 401 && (await refreshSession())) {
    response = await request();
  }
  if (!response.ok) {
    throw new Error(friendlyApiMessage(response.status));
  }
  return response;
}

export async function apiHealth(): Promise<unknown> {
  const response = await fetch(`${apiProxyBasePath}/health`);
  if (!response.ok) throw new Error(`API health failed: ${response.status}`);
  return response.json();
}

export async function exportCsv(path: string, filename: string): Promise<void> {
  const response = await rawApiFetch(path);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function webHealth(): Promise<unknown> {
  const response = await fetch('/health');
  if (!response.ok) throw new Error(`Web health failed: ${response.status}`);
  return response.json();
}
