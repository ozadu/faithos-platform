'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type MyWorkSummary,
  type WorkflowTask,
} from '../lib/api-client';

export default function MyWorkPage() {
  const [summary, setSummary] = useState<MyWorkSummary | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<MyWorkSummary>('/my-work');
        setSummary(response.data);
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
          <h1>My Work</h1>
          <p>
            Assigned tasks, pending approvals, returned documents requiring
            action, overdue items, and recently completed workflow tasks.
          </p>
        </div>
        <p>{message}</p>

        {summary ? (
          <>
            <section className="panel">
              <h2>Navigation</h2>
              <div className="actions">
                {summary.navigation.map((item) => (
                  <Link
                    className="button secondary"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            <TaskTable title="Assigned tasks" tasks={summary.assignedTasks} />
            <TaskTable
              title="Pending approvals"
              tasks={summary.pendingApprovals}
            />
            <TaskTable title="Overdue items" tasks={summary.overdueItems} />

            <section className="panel">
              <h2>Returned documents requiring action</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.returnedDocuments.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <Link href={`/documents/${document.id}`}>
                          {document.referenceNumber}
                        </Link>
                      </td>
                      <td>{document.title}</td>
                      <td>{document.status}</td>
                      <td>{new Date(document.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <TaskTable
              title="Recently completed tasks"
              tasks={summary.recentlyCompletedTasks}
            />
          </>
        ) : null}
      </section>
    </AuthRequired>
  );
}

function TaskTable({ tasks, title }: { tasks: WorkflowTask[]; title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Workflow</th>
            <th>Department</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                {task.document ? (
                  <Link href={`/documents/${task.document.id}`}>
                    {task.document.referenceNumber}
                  </Link>
                ) : (
                  'n/a'
                )}
              </td>
              <td>{task.workflowInstance?.workflow?.name ?? 'Workflow'}</td>
              <td>{task.assignedDepartment?.name ?? 'n/a'}</td>
              <td>{task.status}</td>
              <td>{new Date(task.dueAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
