'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type Department,
  type WorkflowTask,
} from '../lib/api-client';

export default function MyTasksPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const [taskResponse, departmentResponse] = await Promise.all([
        apiFetch<WorkflowTask[]>('/workflow-tasks/my'),
        apiFetch<Department[]>('/departments'),
      ]);
      setTasks(taskResponse.data);
      setDepartments(departmentResponse.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(taskId: string, actionName: string, payload = {}) {
    setMessage(`${actionName} workflow task...`);
    try {
      await apiFetch<unknown>(`/workflow-tasks/${taskId}/${actionName}`, {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      await load();
      setMessage(`Task ${actionName} complete.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    }
  }

  async function forward(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action(taskId, 'forward', {
      comments: String(form.get('comments') ?? 'Forwarded from UAT.'),
      departmentId: String(form.get('departmentId') ?? ''),
    });
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>My Tasks</h1>
          <p>
            Receive, approve, reject, return, forward, or cancel work items.
          </p>
        </div>

        <section className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Workflow</th>
                <th>Department</th>
                <th>Status</th>
                <th>Due</th>
                <th>Actions</th>
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
                    <br />
                    <small>{task.document?.title}</small>
                  </td>
                  <td>{task.workflowInstance?.workflow?.name}</td>
                  <td>{task.assignedDepartment?.name}</td>
                  <td>{task.status}</td>
                  <td>{new Date(task.dueAt).toLocaleString()}</td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() =>
                          void action(task.id, 'receive', {
                            comments: 'Received from UAT.',
                          })
                        }
                        type="button"
                      >
                        Receive
                      </button>
                      <button
                        onClick={() =>
                          void action(task.id, 'approve', {
                            comments: 'Approved from UAT.',
                          })
                        }
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          void action(task.id, 'complete', {
                            comments: 'Completed from UAT.',
                          })
                        }
                        type="button"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() =>
                          void action(task.id, 'return', {
                            comments: 'Returned from UAT.',
                          })
                        }
                        type="button"
                      >
                        Return
                      </button>
                      <button
                        onClick={() =>
                          void action(task.id, 'reject', {
                            comments: 'Rejected from UAT.',
                          })
                        }
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() =>
                          void action(task.id, 'cancel', {
                            comments: 'Cancelled from UAT.',
                          })
                        }
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                    <form
                      className="actions"
                      onSubmit={(event) => void forward(event, task.id)}
                    >
                      <select name="departmentId">
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <input name="comments" placeholder="Forward note" />
                      <button type="submit">Forward</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </AuthRequired>
  );
}
