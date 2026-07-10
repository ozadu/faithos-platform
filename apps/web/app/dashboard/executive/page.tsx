'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthRequired } from '../../components/auth-required';
import { apiFetch, type ExecutiveDashboard } from '../../lib/api-client';

export default function ExecutiveDashboardPage() {
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<ExecutiveDashboard>(
          '/dashboard/executive',
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
          <h1>Executive Dashboard</h1>
          <p>
            Status at a glance for document volume, approvals, workflow
            throughput, overdue items, and department activity.
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
                <Link className="button secondary" href="/reports/workflows">
                  Workflow Report
                </Link>
                <Link className="button secondary" href="/reports/departments">
                  Department Report
                </Link>
                <Link className="button secondary" href="/reports/overdue">
                  Overdue Report
                </Link>
              </div>
            </section>

            <section className="cards">
              <Metric
                label="Total Documents"
                value={dashboard.metrics.totalDocuments}
              />
              <Metric
                label="Submitted This Week"
                value={dashboard.metrics.submittedThisWeek}
              />
              <Metric
                label="Completed This Week"
                value={dashboard.metrics.completedThisWeek}
              />
              <Metric
                label="Pending Approvals"
                value={dashboard.metrics.pendingApprovals}
              />
              <Metric
                label="Overdue Workflows"
                value={dashboard.metrics.overdueWorkflows}
              />
              <Metric
                label="Avg Completion Hours"
                value={dashboard.averageCompletionHours}
              />
            </section>

            <section className="panel">
              <h2>Department activity summary</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Documents</th>
                    <th>Pending Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.departmentActivity.map((item) => (
                    <tr key={item.department.id}>
                      <td>{item.department.name}</td>
                      <td>{item.documents}</td>
                      <td>{item.pendingTasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Recent high-priority documents</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.highPriorityDocuments.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <Link href={`/documents/${document.id}`}>
                          {document.referenceNumber}
                        </Link>
                      </td>
                      <td>{document.title}</td>
                      <td>{document.currentDepartment?.name ?? 'n/a'}</td>
                      <td>{document.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
