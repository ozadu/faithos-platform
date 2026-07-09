'use client';

import { useEffect, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { apiFetch, type DemoUser } from '../lib/api-client';

export default function ProfilePage() {
  const [profile, setProfile] = useState<DemoUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<DemoUser>('/auth/me')
      .then((response) => setProfile(response.data))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Identity</p>
          <h1>User Profile</h1>
          <p>Connected to `GET /api/v1/auth/me`.</p>
        </div>
        <div className="panel">
          {error ? <p className="error">API error: {error}</p> : null}
          {profile ? (
            <pre>{JSON.stringify(profile, null, 2)}</pre>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </section>
    </AuthRequired>
  );
}
