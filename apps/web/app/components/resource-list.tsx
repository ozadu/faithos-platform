'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { AuthRequired } from './auth-required';
import { apiFetch } from '../lib/api-client';

export function ResourceList<T>({
  path,
  render,
  title,
}: {
  path: string;
  render: (items: T[]) => ReactNode;
  title: string;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch<T[]>(path)
      .then((response) => setItems(response.data))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [path]);

  return (
    <AuthRequired>
      <section className="panel stack">
        <h2>{title}</h2>
        {loading ? <p>Loading...</p> : null}
        {error ? <p className="error">API error: {error}</p> : null}
        {!loading && !error ? render(items) : null}
      </section>
    </AuthRequired>
  );
}
