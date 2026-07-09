'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type Department,
  type Role,
  type Workflow,
} from '../lib/api-client';

export default function WorkflowTemplatesPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const [workflowResponse, departmentResponse, roleResponse] =
        await Promise.all([
          apiFetch<Workflow[]>('/workflows'),
          apiFetch<Department[]>('/departments'),
          apiFetch<Role[]>('/roles'),
        ]);
      setWorkflows(workflowResponse.data);
      setDepartments(departmentResponse.data);
      setRoles(roleResponse.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not load workflows',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const departmentId = String(form.get('departmentId') ?? '');
    const roleId = String(form.get('roleId') ?? '');
    setMessage('Creating workflow template...');
    try {
      await apiFetch<Workflow>('/workflows', {
        body: JSON.stringify({
          active: true,
          description: String(form.get('description') ?? ''),
          name: String(form.get('name') ?? ''),
          steps: [
            {
              approvalRequired: true,
              canForward: form.get('canForward') === 'on',
              canReturn: form.get('canReturn') === 'on',
              departmentId,
              dueDays: Number(form.get('dueDays') ?? 2),
              escalationDays: Number(form.get('escalationDays') ?? 1),
              notifyEmail: form.get('notifyEmail') === 'on',
              notifyInApp: true,
              ...(roleId ? { roleId } : {}),
              sequence: 1,
            },
          ],
        }),
        method: 'POST',
      });
      event.currentTarget.reset();
      await load();
      setMessage('Workflow template created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>Workflow Templates</h1>
          <p>
            Create and inspect reusable routing templates. Rich step editing is
            available in the Workflow Builder.
          </p>
        </div>

        <form className="panel form-grid" onSubmit={create}>
          <label>
            Name
            <input name="name" placeholder="Board Memo Approval" required />
          </label>
          <label>
            First step department
            <select name="departmentId" required>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Description
            <textarea
              name="description"
              placeholder="Routes memos through departmental review."
            />
          </label>
          <label>
            First step role
            <select name="roleId">
              <option value="">Any active user in department</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due days
            <input defaultValue="2" min="0" name="dueDays" type="number" />
          </label>
          <label>
            Escalation days
            <input
              defaultValue="1"
              min="0"
              name="escalationDays"
              type="number"
            />
          </label>
          <label>
            <span>Can return</span>
            <input defaultChecked name="canReturn" type="checkbox" />
          </label>
          <label>
            <span>Can forward</span>
            <input name="canForward" type="checkbox" />
          </label>
          <label>
            <span>Notify by email record</span>
            <input name="notifyEmail" type="checkbox" />
          </label>
          <div className="full">
            <button type="submit">Create Workflow Template</button>
          </div>
        </form>

        <section className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Steps</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td>{workflow.name}</td>
                  <td>v{workflow.version}</td>
                  <td>{workflow.active ? 'Active' : 'Inactive'}</td>
                  <td>{workflow.steps?.length ?? 0}</td>
                  <td>
                    <Link href={`/workflows/${workflow.id}`}>Open</Link>
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
