'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type WorkflowTask } from '../lib/api-client';

export default function PendingApprovalsPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<WorkflowTask[]>(
          '/workflow-tasks/pending',
        );
        setTasks(response.data);
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
          <p className="eyebrow">Workflow Engine</p>
          <h1>Pending Approvals</h1>
          <p>All active approval-required workflow tasks.</p>
        </div>
        <section className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Workflow</th>
                <th>Step</th>
                <th>Assigned To</th>
                <th>Due</th>
                <th>Status</th>
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
                      task.id
                    )}
                  </td>
                  <td>{task.workflowInstance?.workflow?.name}</td>
                  <td>{task.step?.sequence}</td>
                  <td>
                    {task.assignedUser?.email ??
                      task.assignedDepartment?.name ??
                      'Unassigned'}
                  </td>
                  <td>{new Date(task.dueAt).toLocaleString()}</td>
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </AuthRequired>
  );
}
