'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  apiFetch,
  getAccessToken,
  type InboxRecord,
  type WorkflowTask,
} from '../lib/api-client';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['UAT Dashboard', '/uat'],
  ['Inbox', '/inbox', 'inbox'],
  ['Sent', '/sent'],
  ['Drafts', '/drafts'],
  ['Archive', '/archive'],
  ['Documents', '/documents'],
  ['Create Document', '/documents/create'],
  ['Search', '/search'],
  ['Notifications', '/notifications', 'notifications'],
  ['My Work', '/my-work', 'myWork'],
  ['Executive Dashboard', '/dashboard/executive'],
  ['Department Dashboard', '/dashboard/department'],
  ['Reports', '/reports'],
  ['Document Reports', '/reports/documents'],
  ['Workflow Reports', '/reports/workflows'],
  ['Overdue Reports', '/reports/overdue'],
  ['Workflow Templates', '/workflow-templates'],
  ['Workflow Builder', '/workflow-builder'],
  ['Workflow Assignment', '/workflow-assignment'],
  ['Pending Approvals', '/pending-approvals', 'pendingApprovals'],
  ['My Tasks', '/my-tasks', 'myTasks'],
  ['Workflow History', '/workflow-history'],
  ['Workflow Notifications', '/workflow-notifications'],
  ['Workflow Delegations', '/workflow-delegations'],
  ['Workflow SLA', '/workflow-sla'],
  ['User Profile', '/profile'],
  ['Organization', '/organization'],
  ['Users', '/users'],
  ['Departments', '/departments'],
  ['Roles', '/roles'],
  ['Permissions', '/permissions'],
  ['Health Check', '/health-check'],
  ['UAT Report', '/uat/report'],
] as const;

type BadgeKey = NonNullable<(typeof navItems)[number][2]>;

export function SidebarNav() {
  const [counts, setCounts] = useState<Partial<Record<BadgeKey, number>>>({});

  useEffect(() => {
    if (!getAccessToken()) return;

    async function loadCounts() {
      const [inbox, myTasks, pending, notifications] = await Promise.allSettled(
        [
          apiFetch<InboxRecord[]>('/inbox'),
          apiFetch<WorkflowTask[]>('/workflow-tasks/my'),
          apiFetch<WorkflowTask[]>('/workflow-tasks/pending'),
          apiFetch<{ count: number }>('/notifications/unread-count'),
        ],
      );

      setCounts({
        inbox: inbox.status === 'fulfilled' ? inbox.value.data.length : 0,
        myTasks: myTasks.status === 'fulfilled' ? myTasks.value.data.length : 0,
        myWork: myTasks.status === 'fulfilled' ? myTasks.value.data.length : 0,
        notifications:
          notifications.status === 'fulfilled'
            ? notifications.value.data.count
            : 0,
        pendingApprovals:
          pending.status === 'fulfilled' ? pending.value.data.length : 0,
      });
    }

    void loadCounts();
  }, []);

  return (
    <nav>
      {navItems.map(([label, href, badgeKey]) => (
        <Link href={href} key={href}>
          <span>{label}</span>
          {badgeKey && counts[badgeKey] ? (
            <span className="nav-badge">{counts[badgeKey]}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
