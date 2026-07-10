'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ActivityFeed } from '../components/activity-feed';
import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type ActivityItem,
  type DashboardSummary,
} from '../lib/api-client';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<DashboardSummary>('/dashboard/summary');
        setDashboard(response.data);
        setMessage('Loaded.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Load failed');
      }
    }

    void load();
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Sprint 4</p>
          <h1>Operational Dashboard</h1>
          <p>
            A single workspace for pending work, unread notifications, inbox
            load, drafts, overdue workflows, and recent activity.
          </p>
        </div>

        <p>{message}</p>

        {dashboard ? (
          <>
            <section className="cards">
              <Metric
                label="My Pending Tasks"
                value={dashboard.counts.myPendingTasks}
              />
              <Metric
                label="Unread Notifications"
                value={dashboard.counts.unreadNotifications}
              />
              <Metric
                label="Documents in Inbox"
                value={dashboard.counts.inboxDocuments}
              />
              <Metric
                label="Draft Documents"
                value={dashboard.counts.draftDocuments}
              />
              <Metric
                label="Overdue Workflows"
                value={dashboard.counts.overdueWorkflows}
              />
            </section>

            <section className="panel">
              <h2>Quick actions</h2>
              <div className="actions">
                {dashboard.quickActions.map((action) => (
                  <Link
                    className="button secondary"
                    href={action.href}
                    key={action.href}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Recently submitted documents</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentDocuments.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <Link href={`/documents/${document.id}`}>
                          {document.referenceNumber}
                        </Link>
                      </td>
                      <td>{document.title}</td>
                      <td>{document.priority}</td>
                      <td>{document.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Recently completed workflows</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Document</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentWorkflows.map((workflow) => (
                    <tr key={workflow.id}>
                      <td>{workflow.workflow?.name ?? 'Workflow'}</td>
                      <td>
                        {workflow.document ? (
                          <Link href={`/documents/${workflow.document.id}`}>
                            {workflow.document.referenceNumber}
                          </Link>
                        ) : (
                          'n/a'
                        )}
                      </td>
                      <td>
                        {workflow.completedAt
                          ? new Date(workflow.completedAt).toLocaleString()
                          : 'n/a'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Recent activity</h2>
              <ActivityFeed items={activityItems(dashboard.activity)} />
            </section>
          </>
        ) : null}
      </section>
    </AuthRequired>
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

function activityItems(items: ActivityItem[]) {
  return items.map((item) => ({
    actor: item.actor,
    actorDepartment: item.actorDepartment,
    comments: item.comments,
    createdAt: item.createdAt,
    document: item.document,
    id: item.id,
    label: item.action,
  }));
}
