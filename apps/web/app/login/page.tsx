'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import {
  apiFetch,
  clearSession,
  demoCredentials,
  saveSession,
  type DemoUser,
} from '../lib/api-client';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: DemoUser;
};

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState('/dashboard');
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState(demoCredentials.password);
  const [message, setMessage] = useState('Use the seeded demo administrator.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get('next') ?? '/dashboard');
    setMessage(params.get('message') ?? 'Use the seeded demo administrator.');
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('Logging in...');
    try {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        body: JSON.stringify({ email, password }),
        method: 'POST',
      });
      saveSession(response.data);
      setMessage(`Logged in as ${response.data.user.email}`);
      router.push(next.startsWith('/') ? next : '/dashboard');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Login failed. Please check the email and password.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Identity Foundation</p>
        <h1>Login</h1>
        <p>
          Authenticate against the real FaithOS API and store the access token
          in this browser for UAT.
        </p>
      </div>
      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Email
          <input
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            value={email}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <div className="full actions">
          <button disabled={busy} type="submit">
            {busy ? 'Signing in...' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSession();
              setMessage('Local browser session cleared.');
            }}
          >
            Clear Session
          </button>
          <Link className="button secondary" href="/uat">
            Back to UAT Dashboard
          </Link>
          <Link className="button secondary" href="/forgot-password">
            Forgot Password
          </Link>
        </div>
        <p className="full">{message}</p>
      </form>
    </section>
  );
}
