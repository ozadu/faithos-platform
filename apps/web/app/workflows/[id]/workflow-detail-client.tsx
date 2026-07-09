'use client';

import { useEffect, useState } from 'react';

import { AuthRequired } from '../../components/auth-required';
import { apiFetch, type Workflow } from '../../lib/api-client';

export function WorkflowDetailClient({ id }: { id: string }) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<Workflow>(`/workflows/${id}`);
        setWorkflow(response.data);
        setMessage('Loaded.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Load failed');
      }
    }
    void load();
  }, [id]);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>{workflow?.name ?? 'Workflow Details'}</h1>
          <p>{workflow?.description ?? message}</p>
        </div>

        {workflow ? (
          <>
            <section className="panel">
              <dl className="detail-grid">
                <div>
                  <dt>Active</dt>
                  <dd>{workflow.active ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Current version</dt>
                  <dd>v{workflow.version}</dd>
                </div>
                <div>
                  <dt>Assignments</dt>
                  <dd>
                    {workflow.assignments
                      ?.map((assignment) => assignment.documentType)
                      .join(', ') || 'None'}
                  </dd>
                </div>
                <div>
                  <dt>Versions</dt>
                  <dd>{workflow.versions?.length ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className="panel">
              <h2>Steps</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sequence</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>SLA</th>
                    <th>Capabilities</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.steps?.map((step) => (
                    <tr key={step.id}>
                      <td>{step.sequence}</td>
                      <td>{step.department?.name ?? step.departmentId}</td>
                      <td>{step.role?.name ?? 'Any'}</td>
                      <td>
                        Due {step.dueDays}d / escalate {step.escalationDays}d
                      </td>
                      <td>
                        {step.approvalRequired ? 'Approve' : 'Notify'} ·{' '}
                        {step.canReturn ? 'Return' : 'No return'} ·{' '}
                        {step.canForward ? 'Forward' : 'No forward'}
                      </td>
                      <td>
                        {step.conditionField
                          ? `${step.conditionField} ${step.conditionOperator} ${step.conditionValue}`
                          : 'Always'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Version history</h2>
              <ul>
                {workflow.versions?.map((version) => (
                  <li key={version.id}>
                    v{version.version} — {version.active ? 'active' : 'retired'}
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <section className="panel">
            <p>{message}</p>
          </section>
        )}
      </section>
    </AuthRequired>
  );
}
