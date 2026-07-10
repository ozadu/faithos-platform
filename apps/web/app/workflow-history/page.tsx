'use client';

import { useEffect, useState } from 'react';

import { ActivityFeed } from '../components/activity-feed';
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
          <ActivityFeed
            items={events.map((event) => ({
              actor: event.actor,
              actorDepartment: event.actorDepartment,
              comments: [
                event.comments,
                `Previous step: ${event.previousStep?.sequence ?? 'n/a'}`,
                `Next step: ${event.nextStep?.sequence ?? 'n/a'}`,
              ]
                .filter(Boolean)
                .join(' · '),
              createdAt: event.createdAt,
              document: event.document,
              id: event.id,
              label: event.action,
            }))}
          />
        </section>
      </section>
    </AuthRequired>
  );
}
