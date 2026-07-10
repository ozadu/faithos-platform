'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type WorkflowNotification } from '../lib/api-client';

const notificationTypes = [
  'DOCUMENT_SUBMITTED',
  'DOCUMENT_FORWARDED',
  'DOCUMENT_RETURNED',
  'DOCUMENT_ARCHIVED',
  'WORKFLOW_ASSIGNED',
  'WORKFLOW_APPROVED',
  'WORKFLOW_REJECTED',
  'WORKFLOW_RETURNED',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_OVERDUE',
  'DELEGATION_ASSIGNED',
  'APPROVAL_REQUIRED',
  'RETURNED',
  'REJECTED',
  'FORWARDED',
  'COMPLETED',
  'ESCALATED',
  'REMINDER',
] as const;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<WorkflowNotification[]>(
    [],
  );
  const [moduleFilter, setModuleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [message, setMessage] = useState('Loading...');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (unreadOnly) params.set('unread', 'true');
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }, [moduleFilter, typeFilter, unreadOnly]);

  async function load() {
    try {
      const response = await apiFetch<WorkflowNotification[]>(
        `/notifications${query}`,
      );
      setNotifications(response.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, [query]);

  async function markRead(id: string) {
    await apiFetch<WorkflowNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    await load();
  }

  async function markAllRead() {
    await apiFetch<{ count: number }>('/notifications/read-all', {
      method: 'PATCH',
    });
    await load();
  }

  async function remove(id: string) {
    await apiFetch<{ id: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
    await load();
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Sprint 4</p>
          <h1>Notification Center</h1>
          <p>
            Filter, read, delete, and follow links from document and workflow
            notifications.
          </p>
        </div>

        <section className="panel stack">
          <div className="form-grid">
            <label>
              Module
              <select
                onChange={(event) => setModuleFilter(event.target.value)}
                value={moduleFilter}
              >
                <option value="">All modules</option>
                <option value="documents">Documents</option>
                <option value="workflows">Workflows</option>
              </select>
            </label>
            <label>
              Type
              <select
                onChange={(event) => setTypeFilter(event.target.value)}
                value={typeFilter}
              >
                <option value="">All types</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Unread only</span>
              <input
                checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
          <div className="actions">
            <button onClick={markAllRead} type="button">
              Mark all read
            </button>
            <button className="secondary" onClick={load} type="button">
              Refresh
            </button>
          </div>
          <p>{message}</p>
        </section>

        <section className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Notification</th>
                <th>Link</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>
                    <span
                      className={`badge ${
                        notification.readAt ? 'neutral' : 'warn'
                      }`}
                    >
                      {notification.readAt ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td>{notification.type}</td>
                  <td>
                    <strong>{notification.title}</strong>
                    <br />
                    <small>{notification.message}</small>
                  </td>
                  <td>{notificationLink(notification)}</td>
                  <td>{new Date(notification.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="actions">
                      {!notification.readAt ? (
                        <button
                          className="secondary"
                          onClick={() => markRead(notification.id)}
                          type="button"
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        className="secondary"
                        onClick={() => remove(notification.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
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

function notificationLink(notification: WorkflowNotification) {
  if (notification.document) {
    return (
      <Link href={`/documents/${notification.document.id}`}>
        {notification.document.referenceNumber}
      </Link>
    );
  }
  if (notification.workflowInstance) {
    return <Link href="/workflow-history">Workflow history</Link>;
  }
  return 'n/a';
}
