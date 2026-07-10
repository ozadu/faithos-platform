'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { apiFetch, getAccessToken } from '../lib/api-client';

export function AuthRequired({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    async function check() {
      if (!getAccessToken()) {
        setHasToken(false);
        setReady(true);
        return;
      }
      try {
        await apiFetch('/auth/me');
        setHasToken(true);
      } catch {
        setHasToken(false);
      } finally {
        setReady(true);
      }
    }

    void check();
  }, []);

  if (!ready) return <p>Checking browser session...</p>;

  if (!hasToken) {
    return (
      <section className="panel stack">
        <h2>Login required</h2>
        <p>Use the demo administrator account before testing this screen.</p>
        <Link className="button" href="/login?message=Please%20log%20in">
          Go to Login
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
