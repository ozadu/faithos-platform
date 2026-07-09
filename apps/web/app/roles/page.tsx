'use client';

import { ResourceList } from '../components/resource-list';
import { type Role } from '../lib/api-client';

export default function RolesPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Identity</p>
        <h1>Roles</h1>
        <p>Connected to the implemented roles API.</p>
      </div>
      <ResourceList<Role>
        path="/roles"
        title="Role catalog"
        render={(roles) => (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.isSystem ? 'System' : 'Organization'}</td>
                  <td>
                    {role.permissions
                      ?.map((permission) => permission.code)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />
    </section>
  );
}
