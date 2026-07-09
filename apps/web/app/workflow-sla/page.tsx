'use client';

import { useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch } from '../lib/api-client';

export default function WorkflowSlaPage() {
  const [message, setMessage] = useState('Ready.');

  async function markOverdue() {
    setMessage('Evaluating overdue workflow tasks...');
    try {
      const response = await apiFetch<{ markedOverdue: number }>(
        '/workflow-sla/mark-overdue',
        {
          body: JSON.stringify({}),
          method: 'POST',
        },
      );
      setMessage(`${response.data.markedOverdue} task(s) marked overdue.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'SLA check failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>SLA Engine</h1>
          <p>
            Run the current database SLA evaluator. It marks due tasks as
            overdue and creates escalation notifications.
          </p>
        </div>
        <section className="panel stack">
          <button type="button" onClick={() => void markOverdue()}>
            Mark Overdue Tasks
          </button>
          <p>{message}</p>
        </section>
      </section>
    </AuthRequired>
  );
}
