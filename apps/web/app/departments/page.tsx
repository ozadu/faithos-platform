'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type Department } from '../lib/api-client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const response = await apiFetch<Department[]>('/departments');
      setDepartments(response.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not load departments',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('Creating department...');
    try {
      await apiFetch<Department>('/departments', {
        body: JSON.stringify({
          description: String(form.get('description') ?? ''),
          name: String(form.get('name') ?? ''),
        }),
        method: 'POST',
      });
      event.currentTarget.reset();
      await load();
      setMessage('Department created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    }
  }

  async function remove(id: string) {
    setMessage('Deleting department...');
    try {
      await apiFetch<null>(`/departments/${id}`, { method: 'DELETE' });
      await load();
      setMessage('Department deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Identity</p>
          <h1>Departments</h1>
          <p>Connected to department list, create, and delete APIs.</p>
        </div>
        <form className="panel form-grid" onSubmit={create}>
          <label>
            Department name
            <input name="name" placeholder="Legal" required />
          </label>
          <label>
            Description
            <input
              name="description"
              placeholder="Legal review and compliance"
            />
          </label>
          <div className="full">
            <button type="submit">Create Department</button>
          </div>
        </form>
        <div className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td>{department.name}</td>
                  <td>{department.description}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void remove(department.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AuthRequired>
  );
}
