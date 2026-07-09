'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type DemoUser,
  type WorkflowDelegation,
} from '../lib/api-client';

type UserRecord = DemoUser & {
  email: string;
};

export default function WorkflowDelegationsPage() {
  const [delegations, setDelegations] = useState<WorkflowDelegation[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const [delegationResponse, userResponse] = await Promise.all([
        apiFetch<WorkflowDelegation[]>('/workflow-delegations'),
        apiFetch<UserRecord[]>('/users'),
      ]);
      setDelegations(delegationResponse.data);
      setUsers(userResponse.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('Creating delegation...');
    try {
      await apiFetch<WorkflowDelegation>('/workflow-delegations', {
        body: JSON.stringify({
          active: true,
          endsAt: new Date(String(form.get('endsAt') ?? '')).toISOString(),
          fromUserId: String(form.get('fromUserId') ?? ''),
          reason: String(form.get('reason') ?? ''),
          startsAt: new Date(String(form.get('startsAt') ?? '')).toISOString(),
          toUserId: String(form.get('toUserId') ?? ''),
        }),
        method: 'POST',
      });
      await load();
      setMessage('Delegation created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    }
  }

  async function deactivate(id: string) {
    setMessage('Deactivating delegation...');
    try {
      await apiFetch<WorkflowDelegation>(`/workflow-delegations/${id}`, {
        method: 'DELETE',
      });
      await load();
      setMessage('Delegation deactivated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deactivate failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>Delegations</h1>
          <p>
            Temporary delegation records used when assignees are unavailable.
          </p>
        </div>

        <form className="panel form-grid" onSubmit={create}>
          <label>
            From user
            <select name="fromUserId">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            To user
            <select name="toUserId">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starts at
            <input name="startsAt" required type="datetime-local" />
          </label>
          <label>
            Ends at
            <input name="endsAt" required type="datetime-local" />
          </label>
          <label className="full">
            Reason
            <input name="reason" placeholder="Leave coverage" />
          </label>
          <div className="full">
            <button type="submit">Create Delegation</button>
          </div>
        </form>

        <section className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Window</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {delegations.map((delegation) => (
                <tr key={delegation.id}>
                  <td>{delegation.fromUser?.email ?? delegation.fromUserId}</td>
                  <td>{delegation.toUser?.email ?? delegation.toUserId}</td>
                  <td>
                    {new Date(delegation.startsAt).toLocaleString()} →{' '}
                    {new Date(delegation.endsAt).toLocaleString()}
                  </td>
                  <td>{delegation.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button
                      disabled={!delegation.active}
                      onClick={() => void deactivate(delegation.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
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
