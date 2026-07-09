'use client';

import { ResourceList } from '../components/resource-list';
import { type Permission } from '../lib/api-client';

export default function PermissionsPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Identity</p>
        <h1>Permissions</h1>
        <p>Connected to `GET /api/v1/permissions`.</p>
      </div>
      <ResourceList<Permission>
        path="/permissions"
        title="Permission catalog"
        render={(permissions) => (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Module</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id}>
                  <td>{permission.code}</td>
                  <td>{permission.displayName}</td>
                  <td>{permission.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />
    </section>
  );
}
