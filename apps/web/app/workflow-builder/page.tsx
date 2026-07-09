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

type BuilderStep = {
  canForward: boolean;
  canReturn: boolean;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  departmentId: string;
  dueDays: number;
  escalationDays: number;
  roleId: string;
};

const operators = ['', 'LT', 'LTE', 'GT', 'GTE', 'EQ', 'NEQ'];

export default function WorkflowBuilderPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [steps, setSteps] = useState<BuilderStep[]>([]);
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
      setSelectedWorkflowId(
        (current) => current || workflowResponse.data[0]?.id || '',
      );
      const firstDepartmentId = departmentResponse.data[0]?.id;
      setSteps((current) =>
        current.length > 0 || !firstDepartmentId
          ? current
          : [
              {
                canForward: false,
                canReturn: true,
                conditionField: '',
                conditionOperator: '',
                conditionValue: '',
                departmentId: firstDepartmentId,
                dueDays: 2,
                escalationDays: 1,
                roleId: '',
              },
            ],
      );
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateStep(index: number, patch: Partial<BuilderStep>) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    );
  }

  function addStep() {
    const departmentId = departments[0]?.id ?? '';
    setSteps((current) => [
      ...current,
      {
        canForward: false,
        canReturn: true,
        conditionField: '',
        conditionOperator: '',
        conditionValue: '',
        departmentId,
        dueDays: 2,
        escalationDays: 1,
        roleId: '',
      },
    ]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkflowId) return;
    setMessage('Saving workflow version...');
    try {
      await apiFetch<Workflow>(`/workflows/${selectedWorkflowId}`, {
        body: JSON.stringify({
          steps: steps.map((step, index) => ({
            approvalRequired: true,
            canForward: step.canForward,
            canReturn: step.canReturn,
            departmentId: step.departmentId,
            dueDays: step.dueDays,
            escalationDays: step.escalationDays,
            notifyEmail: false,
            notifyInApp: true,
            sequence: index + 1,
            ...(step.roleId ? { roleId: step.roleId } : {}),
            ...(step.conditionField
              ? {
                  conditionField: step.conditionField,
                  conditionOperator: step.conditionOperator,
                  conditionValue: step.conditionValue,
                }
              : {}),
          })),
        }),
        method: 'PATCH',
      });
      await load();
      setMessage('Workflow version saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Workflow Engine</p>
          <h1>Workflow Builder</h1>
          <p>
            Replace a template&apos;s step list and create a new immutable
            workflow version.
          </p>
        </div>

        <form className="panel stack" onSubmit={save}>
          <label>
            Template
            <select
              onChange={(event) => setSelectedWorkflowId(event.target.value)}
              value={selectedWorkflowId}
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name} v{workflow.version}
                </option>
              ))}
            </select>
          </label>

          {steps.map((step, index) => (
            <fieldset className="panel form-grid" key={index}>
              <legend>Step {index + 1}</legend>
              <label>
                Department
                <select
                  onChange={(event) =>
                    updateStep(index, { departmentId: event.target.value })
                  }
                  value={step.departmentId}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Role
                <select
                  onChange={(event) =>
                    updateStep(index, { roleId: event.target.value })
                  }
                  value={step.roleId}
                >
                  <option value="">Any role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Due days
                <input
                  min="0"
                  onChange={(event) =>
                    updateStep(index, { dueDays: Number(event.target.value) })
                  }
                  type="number"
                  value={step.dueDays}
                />
              </label>
              <label>
                Escalation days
                <input
                  min="0"
                  onChange={(event) =>
                    updateStep(index, {
                      escalationDays: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={step.escalationDays}
                />
              </label>
              <label>
                Conditional field
                <input
                  onChange={(event) =>
                    updateStep(index, { conditionField: event.target.value })
                  }
                  placeholder="purchaseAmount"
                  value={step.conditionField}
                />
              </label>
              <label>
                Operator
                <select
                  onChange={(event) =>
                    updateStep(index, { conditionOperator: event.target.value })
                  }
                  value={step.conditionOperator}
                >
                  {operators.map((operator) => (
                    <option key={operator || 'empty'} value={operator}>
                      {operator || 'No condition'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Conditional value
                <input
                  onChange={(event) =>
                    updateStep(index, { conditionValue: event.target.value })
                  }
                  placeholder="500000"
                  value={step.conditionValue}
                />
              </label>
              <label>
                <span>Can return</span>
                <input
                  checked={step.canReturn}
                  onChange={(event) =>
                    updateStep(index, { canReturn: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
              <label>
                <span>Can forward</span>
                <input
                  checked={step.canForward}
                  onChange={(event) =>
                    updateStep(index, { canForward: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
            </fieldset>
          ))}

          <div className="actions">
            <button type="button" onClick={addStep}>
              Add Step
            </button>
            <button type="submit">Save New Version</button>
            {selectedWorkflowId ? (
              <Link
                className="button secondary"
                href={`/workflows/${selectedWorkflowId}`}
              >
                View Details
              </Link>
            ) : null}
          </div>
          <p>{message}</p>
        </form>
      </section>
    </AuthRequired>
  );
}
