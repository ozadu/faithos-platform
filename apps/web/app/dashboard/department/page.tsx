'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ActivityFeed } from '../../components/activity-feed';
import { AuthRequired } from '../../components/auth-required';
import {
  apiFetch,
  type ActivityItem,
  type DepartmentDashboard,
} from '../../lib/api-client';

export default function DepartmentDashboardPage() {
  const [dashboard, setDashboard] = useState<DepartmentDashboard | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<DepartmentDashboard>(
          '/dashboard/department',
        );
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
          <h1>Department Dashboard</h1>
          <p>
            Current department inbox count, pending tasks, completed documents,
            overdue items, and recent department activity.
          </p>
        </div>
        <p>{message}</p>

        {dashboard ? (
          <>
            <section className="panel">
              <h2>Reporting links</h2>
              <div className="actions">
                <Link className="button secondary" href="/reports">
                  Reports
                </Link>
                <Link className="button secondary" href="/reports/departments">
                  Department Report
                </Link>
                <Link className="button secondary" href="/reports/workflows">
                  Workflow Report
                </Link>
                <Link className="button secondary" href="/reports/overdue">
                  Overdue Report
                </Link>
              </div>
            </section>

            <section className="panel">
              <h2>{dashboard.department.name}</h2>
              <div className="cards">
                <Metric
                  label="Inbox"
                  value={dashboard.metrics.departmentInboxCount}
                />
                <Metric
                  label="Pending Tasks"
                  value={dashboard.metrics.departmentPendingTasks}
                />
                <Metric
                  label="Completed Docs"
                  value={dashboard.metrics.completedDocuments}
                />
                <Metric
                  label="Overdue Items"
                  value={dashboard.metrics.overdueItems}
                />
              </div>
            </section>

            <section className="panel">
              <h2>Recent department activity</h2>
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
