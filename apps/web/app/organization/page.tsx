'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch } from '../lib/api-client';

type Organization = {
  address?: string | null;
  country: string;
  email: string;
  id: string;
  name: string;
  phone?: string | null;
  slug: string;
  timezone: string;
};

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    void apiFetch<Organization>('/organizations/current')
      .then((response) => {
        setOrganization(response.data);
        setMessage('Loaded.');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    setMessage('Saving...');
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiFetch<Organization>('/organizations/current', {
        body: JSON.stringify({
          address: String(form.get('address') ?? ''),
          email: String(form.get('email') ?? ''),
          name: String(form.get('name') ?? ''),
          phone: String(form.get('phone') ?? ''),
          timezone: String(form.get('timezone') ?? ''),
        }),
        method: 'PATCH',
      });
      setOrganization(response.data);
      setMessage('Organization updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Identity</p>
          <h1>Organization</h1>
          <p>Connected to current organization read/update APIs.</p>
        </div>
        {organization ? (
          <form className="panel form-grid" onSubmit={save}>
            <label>
              Name
              <input defaultValue={organization.name} name="name" />
            </label>
            <label>
              Email
              <input defaultValue={organization.email} name="email" />
            </label>
            <label>
              Phone
              <input defaultValue={organization.phone ?? ''} name="phone" />
            </label>
            <label>
              Timezone
              <input defaultValue={organization.timezone} name="timezone" />
            </label>
            <label className="full">
              Address
              <input defaultValue={organization.address ?? ''} name="address" />
            </label>
            <div className="full actions">
              <button type="submit">Save Organization</button>
            </div>
            <p className="full">{message}</p>
          </form>
        ) : (
          <div className="panel">{message}</div>
        )}
      </section>
    </AuthRequired>
  );
}
