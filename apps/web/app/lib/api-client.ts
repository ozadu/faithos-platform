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
  document?: Pick<DocumentRecord, 'id' | 'referenceNumber' | 'title'> | null;
  id: string;
  message: string;
  readAt?: string | null;
  title: string;
  type: string;
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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const token = getAccessToken();
  const response = await fetch(`${apiProxyBasePath}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | { message?: string } | null;

  if (!response.ok) {
    throw new Error(
      payload?.message ?? `API request failed: ${response.status}`,
    );
  }

  return payload as ApiEnvelope<T>;
}

export async function apiHealth(): Promise<unknown> {
  const response = await fetch(`${apiProxyBasePath}/health`);
  if (!response.ok) throw new Error(`API health failed: ${response.status}`);
  return response.json();
}

export async function webHealth(): Promise<unknown> {
  const response = await fetch('/health');
  if (!response.ok) throw new Error(`Web health failed: ${response.status}`);
  return response.json();
}
