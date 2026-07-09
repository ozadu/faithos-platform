'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type WorkflowHistoryEvent } from '../lib/api-client';

export default function WorkflowHistoryPage() {
  const [events, setEvents] = useState<WorkflowHistoryEvent[]>([]);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response =
          await apiFetch<WorkflowHistoryEvent[]>('/workflow-history');
        setEvents(response.data);
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
          <h1>Workflow History</h1>
          <p>Immutable audit trail for workflow actions.</p>
        </div>
        <section className="panel">
          <p>{message}</p>
          <ul className="timeline">
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.action}</strong> ·{' '}
                {new Date(event.createdAt).toLocaleString()}
                <br />
                {event.document ? (
                  <Link href={`/documents/${event.document.id}`}>
                    {event.document.referenceNumber} — {event.document.title}
                  </Link>
                ) : null}
                <br />
                <small>
                  User: {event.actor?.email ?? 'system'} · Department:{' '}
                  {event.actorDepartment?.name ?? 'n/a'} · Previous step:{' '}
                  {event.previousStep?.sequence ?? 'n/a'} · Next step:{' '}
                  {event.nextStep?.sequence ?? 'n/a'}
                </small>
                {event.comments ? <p>{event.comments}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </AuthRequired>
  );
}
