'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import {
  apiFetch,
  type Workflow,
  type WorkflowAssignment,
} from '../lib/api-client';

const documentTypes = [
  'Memo',
  'Purchase Request',
  'Leave Request',
  'Circular',
  'Asset Request',
  'Travel Request',
];

export default function WorkflowAssignmentPage() {
  const [assignments, setAssignments] = useState<WorkflowAssignment[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const [assignmentResponse, workflowResponse] = await Promise.all([
        apiFetch<WorkflowAssignment[]>('/workflow-assignments'),
        apiFetch<Workflow[]>('/workflows'),
      ]);
      setAssignments(assignmentResponse.data);
      setWorkflows(workflowResponse.data.filter((workflow) => workflow.active));
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('Saving assignment...');
    try {
      await apiFetch<WorkflowAssignment>('/workflow-assignments', {
        body: JSON.stringify({
          active: true,
          documentType: String(form.get('documentType') ?? ''),
          workflowId: String(form.get('workflowId') ?? ''),
        }),
        method: 'POST',
      });
      await load();
      setMessage('Assignment saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    }
  }

  async function deactivate(id: string) {
    setMessage('Deactivating assignment...');
    try {
      await apiFetch<WorkflowAssignment>(`/workflow-assignments/${id}`, {
        method: 'DELETE',
      });
      await load();
      setMessage('Assignment deactivated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deactivate failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>Workflow Assignment</h1>
          <p>Assign each document type to a reusable workflow template.</p>
        </div>

        <form className="panel form-grid" onSubmit={assign}>
          <label>
            Document type
            <select name="documentType">
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Workflow
            <select name="workflowId">
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name} v{workflow.version}
                </option>
              ))}
            </select>
          </label>
          <div className="full">
            <button type="submit">Save Assignment</button>
          </div>
        </form>

        <section className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.documentType}</td>
                  <td>{assignment.workflow?.name}</td>
                  <td>{assignment.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button
                      disabled={!assignment.active}
                      onClick={() => void deactivate(assignment.id)}
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
