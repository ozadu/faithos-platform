'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type Department, type DemoUser, type Role } from '../lib/api-client';

type UserRecord = DemoUser & {
  department?: Department | null;
  departmentId?: string | null;
  jobTitle?: string | null;
  role?: Role | null;
  roleId?: string | null;
  status: string;
};

export default function UsersPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [message, setMessage] = useState('Loading...');

  async function load() {
    try {
      const [userResponse, departmentResponse, roleResponse] = await Promise.all([
        apiFetch<UserRecord[]>('/users'),
        apiFetch<Department[]>('/departments'),
        apiFetch<Role[]>('/roles'),
      ]);
      setUsers(userResponse.data);
      setDepartments(departmentResponse.data);
      setRoles(roleResponse.data.filter((role) => !role.isSystem));
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load users');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('Creating user...');
    try {
      const response = await apiFetch<{ temporaryPassword: string; user: UserRecord }>('/users', {
        body: JSON.stringify({
          departmentId: String(form.get('departmentId') ?? ''),
          email: String(form.get('email') ?? ''),
          firstName: String(form.get('firstName') ?? ''),
          jobTitle: String(form.get('jobTitle') ?? ''),
          lastName: String(form.get('lastName') ?? ''),
          roleId: String(form.get('roleId') ?? ''),
          temporaryPassword: String(form.get('temporaryPassword') ?? ''),
        }),
        method: 'POST',
      });
      event.currentTarget.reset();
      await load();
      setMessage(`User created. Temporary password: ${response.data.temporaryPassword}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    }
  }

  async function remove(id: string) {
    setMessage('Deleting user...');
    try {
      await apiFetch<null>(`/users/${id}`, { method: 'DELETE' });
      await load();
      setMessage('User deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Identity</p>
          <h1>Users</h1>
          <p>Connected to user list, create, and delete APIs.</p>
        </div>
        <form className="panel form-grid" onSubmit={create}>
          <label>
            First name
            <input name="firstName" required />
          </label>
          <label>
            Last name
            <input name="lastName" required />
          </label>
          <label>
            Email
            <input name="email" required type="email" />
          </label>
          <label>
            Job title
            <input name="jobTitle" />
          </label>
          <label>
            Department
            <select name="departmentId">
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <select name="roleId">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Temporary password
            <input
              defaultValue="FaithOS-UAT-2026!"
              name="temporaryPassword"
              required
            />
          </label>
          <div className="full">
            <button type="submit">Create User</button>
          </div>
        </form>
        <div className="panel">
          <p>{message}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.department?.name}</td>
                  <td>{user.role?.name}</td>
                  <td>{user.status}</td>
                  <td>
                    <button type="button" onClick={() => void remove(user.id)}>
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
